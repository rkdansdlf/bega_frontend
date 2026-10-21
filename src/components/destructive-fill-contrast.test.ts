import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * In dark mode `--destructive` is #ef4444, and a white label on it is only 3.76:1. The `Button`
 * destructive variant avoids that with `dark:bg-destructive/60` (8.33:1 over the black surface).
 * A hand-rolled `bg-destructive` + white text must do the same, or use `variant="destructive"`.
 * The Diary delete button re-created the variant by hand and missed the dark fill.
 */
const solidDestructive = /(?<![\w:/[-])bg-destructive(?![\w/\]-])/;
const whiteLabel = /(?<![\w:/[-])(?:text-destructive-foreground|text-white)(?![\w/\]-])/;
const darkFill = /dark:bg-/;
// The UI kit swatch deliberately shows the raw token pair it documents.
const allowed = new Set(['components/ui/UIKitPreview.tsx']);

const sourceFiles = (dir: URL): URL[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) return entry.name === 'visual-qa' ? [] : sourceFiles(child);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [child] : [];
  });

test('solid bg-destructive with a white label always has a dark fill', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(new URL('../', import.meta.url))) {
    const name = file.pathname.split('/src/')[1];
    if (allowed.has(name)) continue;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (solidDestructive.test(line) && whiteLabel.test(line) && !darkFill.test(line)) {
          offenders.push(`${name}:${index + 1}`);
        }
      });
  }
  assert.deepEqual(offenders, [], `white on dark --destructive is 3.76:1:\n${offenders.join('\n')}`);
});
