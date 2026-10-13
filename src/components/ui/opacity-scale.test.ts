import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

// @ts-expect-error tailwind.config.js ships no declaration file
import config from '../../../tailwind.config.js';

/**
 * Tailwind 3.4 only knows opacity modifiers from `theme.opacity` (0, 5, 10 ... 100 plus
 * anything added in tailwind.config.js). `bg-white/72` or `dark:border-white/8` compiles to
 * nothing, so the element silently loses its background or border. Every colour-opacity
 * utility used in the source must generate a rule.
 */
const SRC = join(process.cwd(), 'src');
const COLOR_UTILITY = /^(?:[\w:[\]&>*=.-]+:)*-?(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|shadow|decoration|accent|caret)-[\w-]+\/\d+(?:\.\d+)?$/;

const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return entry.name === 'visual-qa' ? [] : sourceFiles(path);
  return /\.(?:tsx?|jsx?)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name) ? [path] : [];
});

const opacityUtilities = () => {
  const tokens = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    for (const literal of readFileSync(file, 'utf8').matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/gs)) {
      for (const token of literal[2].split(/\s+/)) {
        if (COLOR_UTILITY.test(token) && !tokens.has(token)) tokens.set(token, file.slice(SRC.length + 1));
      }
    }
  }
  return tokens;
};

const compiles = async (token: string) => {
  const result = await postcss([tailwindcss({ ...config, content: [{ raw: token }], corePlugins: { preflight: false } })])
    .process('@tailwind utilities;', { from: undefined });
  return result.css.trim() !== '';
};

test('every colour-opacity utility used in the source generates CSS', async () => {
  const tokens = opacityUtilities();
  assert.ok(tokens.size > 100, `expected to find the project's opacity utilities, found ${tokens.size}`);
  const dead: string[] = [];
  for (const [token, file] of tokens) {
    if (!(await compiles(token))) dead.push(`${token} (${file})`);
  }
  assert.deepEqual(dead, []);
});

test('the opacity steps the components rely on are defined', async () => {
  for (const token of ['bg-white/72', 'bg-white/88', 'dark:border-white/8', 'dark:border-white/12', 'text-white/82', 'bg-destructive/12']) {
    assert.ok(await compiles(token), token);
  }
});
