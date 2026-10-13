import assert from 'node:assert/strict';
import test from 'node:test';

import { collectUiStyleDriftFailures, collectUiStyleDriftFindings } from './ui-style-drift.mjs';

const baseline = { schemaVersion: 1, entries: [] };
const check = (sources, options = {}) => collectUiStyleDriftFailures({ sources, baseline, ...options });

test('detects new hardcoded brand style values in JSX, class templates, inline styles, and CSS', () => {
  const failures = check({
    'src/components/Probe.tsx': `
      const cardClass = 'bg-[#1B4338]';
      const other = \`text-[#2d5f4f] \${active ? 'border-primary' : ''}\`;
      export const Probe = () => <div className={cardClass} style={{ color: '#173b34', background: 'rgb(47, 108, 92)' }} />;
    `,
    'src/components/probe.css': '.probe { color: #63b39b; }',
  });
  assert.equal(failures.filter((failure) => failure.includes('hardcoded-brand-color')).length, 5);
});

test('reads supported semantic utilities from Tailwind config while ignoring variants and arbitrary colors', () => {
  const failures = check({
    'src/components/Probe.tsx': `const classes = 'bg-input-background dark:hover:text-primary-missing bg-primary-dark bg-background text-primary-foreground bg-[hsl(var(--surface))] bg-gradient-to-r text-13 border-2';`,
    'src/index.css': ':root { --surface: 0 0% 100%; }',
  });
  assert.equal(failures.filter((failure) => failure.includes('unsupported-semantic-color')).length, 2);
  assert.ok(failures.some((failure) => failure.includes('bg-input-background')));
  assert.ok(failures.some((failure) => failure.includes('text-primary-missing')));
});

test('configured semantic colors are accepted and missing family variants fail', () => {
  const config = { theme: { extend: { colors: { surface: { panel: '#fff' } } } } };
  const failures = check({ 'src/components/Probe.tsx': "const cls = 'bg-surface-panel ring-offset-surface-missing';" }, { config });
  assert.equal(failures.length, 1);
  assert.ok(failures[0].includes('ring-offset-surface-missing'));
});

test('brand alpha hex and space-separated RGB values share the exact brand budget', () => {
  const findings = collectUiStyleDriftFindings({ sources: {
    'src/components/Probe.tsx': "const palette = { border: '#1b433880', backgroundColor: 'rgb(27 67 56 / 0.5)' };",
  } });
  assert.equal(findings.filter((finding) => finding.rule === 'hardcoded-brand-color' && finding.value === '#1b4338').length, 2);
});

test('catches arbitrary typography and radius but preserves dynamic CSS tokens and named sizes', () => {
  const failures = check({
    'src/components/Probe.tsx': `const cls = 'text-[13px] sm:rounded-[1.75rem] rounded-xl left-[13%] h-[var(--touch-target-min)] text-[length:min(1.25rem,30px)]'; const style = { fontSize: '17px', borderRadius: 9, left: 14 };`,
    'src/index.css': ':root { --font-body-size: 16px; --radius-base: 0.75rem; --touch-target-min: 44px; }',
  });
  assert.equal(failures.filter((failure) => failure.includes('arbitrary-typography-radius')).length, 4);
  assert.ok(failures.every((failure) => !failure.includes('left-[13%]')));
});

test('new fixed arbitrary dimensions and spacing fail while var/calc/percent geometry is preserved', () => {
  const failures = check({
    'src/components/Probe.tsx': `const cls = 'w-[137px] sm:px-[1.25rem] gap-[22px] -mt-[3px] w-[calc(100%-1rem)] h-[var(--size)] left-[13%] top-[42%] grid-cols-[minmax(0,1fr)_auto]';`,
    'src/index.css': ':root { --size: 44px; }',
  });
  assert.equal(failures.filter((failure) => failure.includes('arbitrary-dimension-spacing')).length, 4);
  assert.ok(failures.some((failure) => failure.includes('w-[137px]')));
});

test('ignores prose, comments, test fixtures and non-brand team colors without exempting runtime styles', () => {
  assert.deepEqual(check({
    'src/components/Probe.tsx': `// bg-[#1b4338] text-[13px]
      const help = 'Do not use bg-[#1b4338] or text-[13px] in new code.';
      export const Probe = () => <p>Example bg-[#1b4338]</p>;
      const teamColor = '#c70125';
      const classes = 'bg-red-500 text-13 rounded-xl';`,
    'src/components/Probe.test.tsx': `const styles = 'bg-[#1b4338]';`,
    'src/components/probe.css': '/* color: #1b4338 */ .probe { color: #c70125; }',
  }), []);
});

test('undefined local CSS variables fail, while fallbacks and locally defined custom properties work', () => {
  const failures = check({
    'src/components/Probe.tsx': `const styles = { color: 'var(--missing)', backgroundColor: 'var(--known)', '--local': '#fff', borderColor: 'var(--local)', boxShadow: 'var(--optional, none)' }; const cls = 'bg-[var(--another-missing)]';`,
    'src/index.css': ':root { --known: #fff; color: var(--css-missing); }',
  });
  assert.equal(failures.filter((failure) => failure.includes('undefined-css-token')).length, 3);
});

test('repeated checks invalidate changed AST literals and removed CSS declarations', () => {
  const source = "const style = { color: 'var(--known)' };";
  assert.deepEqual(check({ 'src/components/Probe.tsx': source, 'src/index.css': ':root { --known: #fff; }' }), []);
  assert.ok(check({ 'src/components/Probe.tsx': source, 'src/index.css': '' }).some((failure) => failure.includes('--known')));
  assert.ok(check({ 'src/components/Probe.tsx': "const cls = 'w-[137px]';" }).some((failure) => failure.includes('w-[137px]')));
});

test('baseline is an occurrence budget by file, rule and value: reductions pass but additions fail', () => {
  const file = 'src/components/Probe.tsx';
  const source = "const cls = 'bg-[#1b4338]';";
  const findings = collectUiStyleDriftFindings({ sources: { [file]: source } });
  const budget = {
    schemaVersion: 1,
    entries: findings.map(({ file: entryFile, rule, value }) => ({
      file: entryFile, rule, value, count: 1, reason: 'Existing unresolved accent', owner: 'frontend', disposition: 'unresolved',
    })),
  };
  assert.deepEqual(check({ [file]: '' }, { baseline: budget }), []);
  assert.deepEqual(check({ [file]: source }, { baseline: budget }), []);
  assert.ok(check({ [file]: `${source}\nconst nextClass = 'bg-[#1b4338]';` }, { baseline: budget }).some((failure) => failure.includes('2 > 1')));
  assert.ok(check({ 'src/components/New.tsx': source }, { baseline: budget }).some((failure) => failure.includes('New.tsx')));
  assert.ok(check({ [file]: "const cls = 'bg-[#2d5f4f]';" }, { baseline: budget }).some((failure) => failure.includes('#2d5f4f')));
});

test('intentional exceptions remain counted and cannot allow new styles across an entire file', () => {
  const file = 'src/components/prediction/coachStyleTokens.ts';
  const source = "export const palette = { brand: '#1b4338', paper: '#fefcf7' };";
  const findings = collectUiStyleDriftFindings({ sources: { [file]: source } });
  const budget = { schemaVersion: 1, entries: findings.map(({ file: entryFile, rule, value }) => ({
    file: entryFile, rule, value, count: 1, reason: 'Intentional isolated coach palette', owner: 'prediction', disposition: 'intentional-exception',
  })) };
  assert.deepEqual(check({ [file]: source }, { baseline: budget }), []);
  assert.ok(check({ [file]: `${source}\nconst newBrand = '#2d5f4f';` }, { baseline: budget }).length > 0);
});

test('invalid or blanket baseline entries fail closed', () => {
  const failures = check({}, { baseline: { schemaVersion: 1, entries: [{ file: 'src/**', count: 999 }] } });
  assert.ok(failures.some((failure) => failure.includes('baseline')));
});
