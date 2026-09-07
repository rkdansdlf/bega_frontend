import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildSkeletonUsageContract,
  compareSkeletonUsageContract,
  DEFAULT_SKELETON_USAGE_PATH,
  extractSkeletonUsages,
  scanSkeletonUsages,
} from './visual-qa-skeleton-usage.mjs';

test('extracts every static Skeleton className through named import aliases', () => {
  const result = extractSkeletonUsages(`
    import { Skeleton as LoadingBar } from './ui/skeleton';
    import { Skeleton as OtherSkeleton } from './other';

    export function Panel({ compact }) {
      return <>
        <LoadingBar className="h-4 w-full" />
        <LoadingBar className={'h-5 w-10'} />
        <LoadingBar className={\`h-6 w-12\`} />
        <LoadingBar />
        <LoadingBar className={compact ? 'h-2' : 'h-3'} />
        <OtherSkeleton className="ignored" />
      </>;
    }
  `, 'src/components/Panel.tsx');

  assert.deepEqual(result.usages.map(({ className }) => className), [
    'h-4 w-full',
    'h-5 w-10',
    'h-6 w-12',
    '',
  ]);
  assert.equal(result.dynamicUsages.length, 1);
  assert.equal(result.dynamicUsages[0]?.file, 'src/components/Panel.tsx');
});

test('usage contracts deduplicate class strings and keep deterministic ids', () => {
  const contract = buildSkeletonUsageContract([
    { className: 'h-4 w-full', file: 'src/components/A.tsx', line: 1 },
    { className: 'h-4 w-full', file: 'src/components/B.tsx', line: 2 },
    { className: 'h-8 w-8 rounded-full', file: 'src/components/C.tsx', line: 3 },
  ]);

  assert.equal(contract.variants.length, 2);
  assert.ok(contract.variants.every(({ id }) => /^usage-[a-f0-9]{12}$/.test(id)));
  assert.equal(new Set(contract.variants.map(({ id }) => id)).size, 2);
  assert.deepEqual(
    buildSkeletonUsageContract([...contract.variants].reverse().map((variant, index) => ({
      className: variant.className,
      file: `src/components/${index}.tsx`,
      line: index + 1,
    }))).variants,
    contract.variants,
  );
});

test('contract comparison fails closed for new, stale, changed, or dynamic usages', () => {
  const current = buildSkeletonUsageContract([
    { className: 'h-4 w-full', file: 'src/components/A.tsx', line: 1 },
    { className: 'h-8 w-8', file: 'src/components/B.tsx', line: 2 },
  ]);
  const checkedIn = {
    ...current,
    variants: [
      current.variants[0],
      { id: 'usage-deadbeef0000', className: 'h-10 w-10' },
    ],
  };
  const comparison = compareSkeletonUsageContract(checkedIn, current, [
    { file: 'src/components/C.tsx', line: 3, expression: 'dynamicClass' },
  ]);

  assert.equal(comparison.ok, false);
  assert.equal(comparison.missing.length, 1);
  assert.equal(comparison.stale.length, 1);
  assert.equal(comparison.dynamic.length, 1);
});

test('the checked-in Skeleton contract exactly matches every current static usage', async () => {
  const checkedIn = JSON.parse(await readFile(DEFAULT_SKELETON_USAGE_PATH, 'utf8'));
  const scan = await scanSkeletonUsages();
  const current = buildSkeletonUsageContract(scan.usages);
  const comparison = compareSkeletonUsageContract(checkedIn, current, scan.dynamicUsages);

  assert.ok(scan.usages.length > 0);
  assert.equal(current.variants.length, checkedIn.variants.length);
  assert.deepEqual(comparison, {
    ok: true,
    missing: [],
    stale: [],
    dynamic: [],
    errors: [],
  });
});
