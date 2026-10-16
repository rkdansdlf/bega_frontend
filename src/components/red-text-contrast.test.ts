import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * `text-red-500` (#ef4444) is only 3.76:1 on white, so it fails WCAG AA for the body text it was
 * used for (form errors, notices, labels). The light colour is `text-red-600` (4.83:1; the same
 * red as `--destructive`), with `dark:text-red-500` / `dark:text-red-400` for dark mode. Variants
 * (`dark:text-red-500`, `hover:text-red-500`) are fine; the bare utility is the problem.
 */
const bareRed500 = /(?<![\w:/[-])text-red-500(?![\w/\]-])/;

const sourceFiles = (dir: URL): URL[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) return entry.name === 'visual-qa' ? [] : sourceFiles(child);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [child] : [];
  });

test('no source uses the bare text-red-500 utility that fails AA on light surfaces', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(new URL('../', import.meta.url))) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (bareRed500.test(line)) offenders.push(`${file.pathname.split('/src/')[1]}:${index + 1}`);
      });
  }
  assert.deepEqual(offenders, [], `text-red-500 on light surfaces is 3.76:1:\n${offenders.join('\n')}`);
});
