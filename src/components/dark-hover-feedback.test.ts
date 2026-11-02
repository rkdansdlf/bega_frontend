import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Every dark surface token is pure black (`--surface-*-dark: 0 0% 0%` in index.css), so
 * `secondary`, `accent`, `muted`, `background`, `card` and `popover` all resolve to the page colour
 * in dark mode. A dark hover/focus/active background built from one of them paints black on black
 * and gives no feedback: 44 call sites did exactly that. Use a token that is not black in dark,
 * e.g. `dark:hover:bg-input/50` (the tint the outline Button already uses).
 */
const BLACK_IN_DARK = 'secondary|accent|muted|background|card|popover';
const pattern = new RegExp(
  `dark:(?:hover|focus|focus-visible|active|group-hover):bg-(?:${BLACK_IN_DARK})(?:/\\d+)?(?![\\w/-])`,
  'g',
);

const sourceFiles = (dir: URL): URL[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) return sourceFiles(child);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [child] : [];
  });

test('no source paints a dark hover/focus/active background with a token that is black in dark', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(new URL('../', import.meta.url))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const match of line.matchAll(pattern)) {
        offenders.push(`${file.pathname.split('/src/')[1]}:${index + 1} ${match[0]}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `black-on-black dark hover:\n${offenders.join('\n')}`);
});
