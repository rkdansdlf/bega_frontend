import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

import config from '../../../tailwind.config.js';

/**
 * Numeric size, spacing, radius and duration utilities (`text-14`, `h-13`, `rounded-16`, ...) only
 * exist when the default scale or tailwind.config.js defines the step. An undefined one generates
 * nothing, so the element silently falls back to the inherited size, no radius, the default
 * transition. Every such utility used in the source must generate CSS, or be listed below with the
 * reason it is intentionally inert.
 */
const SRC = join(process.cwd(), 'src');
const SIZE_UTILITY = /^(?:[a-z0-9-]+:)*-?(?:text|h|w|min-w|min-h|max-w|max-h|size|p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|rounded(?:-[a-z]{1,2})?|duration|delay|leading|tracking|top|left|right|bottom|inset(?:-[xy])?|space-[xy]|basis|z|line-clamp)-(?:\d[\w.]*|px)$/;

// Dead on purpose: documented in docs/release-ui-polish-phase1-common-design.md (X-2).
const KNOWN_INERT = new Map<string, string>([
  ['duration-1200', 'PredictionStatsPanel gauge: the JS count-up already animates the value; a 1.2 s CSS transition would make the ring lag behind the number.'],
]);

const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return entry.name === 'visual-qa' ? [] : sourceFiles(path);
  return /\.(?:tsx?|jsx?)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name) ? [path] : [];
});

const sizeUtilities = () => {
  const tokens = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    for (const literal of readFileSync(file, 'utf8').matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/gs)) {
      for (const token of literal[2].split(/\s+/)) {
        if (SIZE_UTILITY.test(token) && !tokens.has(token)) tokens.set(token, file.slice(SRC.length + 1));
      }
    }
  }
  return tokens;
};

const unescapeClass = (value: string) => value
  .replace(/\\([0-9a-f]{1,6}) ?/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/\\(.)/g, '$1');

const generatedClasses = async (tokens: string[]) => {
  const result = await postcss([tailwindcss({ ...config, content: [{ raw: tokens.join(' ') }], corePlugins: { preflight: false } })])
    .process('@tailwind utilities;', { from: undefined });
  const classes = new Set<string>();
  result.root.walkRules((rule) => {
    for (const match of rule.selector.matchAll(/\.((?:\\.|[^\s.,:>+~[\]()\\])+)/g)) classes.add(unescapeClass(match[1]));
  });
  return classes;
};

test('every numeric size utility used in the source generates CSS', async () => {
  const tokens = sizeUtilities();
  assert.ok(tokens.size > 500, `expected to find the project's size utilities, found ${tokens.size}`);
  const generated = await generatedClasses([...tokens.keys()]);
  const dead = [...tokens].filter(([token]) => !generated.has(token) && !KNOWN_INERT.has(token))
    .map(([token, file]) => `${token} (${file})`);
  assert.deepEqual(dead, []);
});

test('the steps added for the chatbot avatar, vote panel and mate close button resolve to px values', async () => {
  const result = await postcss([tailwindcss({ ...config, content: [{ raw: 'h-13 w-13 px-4.5 text-24' }], corePlugins: { preflight: false } })])
    .process('@tailwind utilities;', { from: undefined });
  assert.match(result.css, /\.h-13\s*\{[^}]*height:\s*3\.25rem/s);
  assert.match(result.css, /\.w-13\s*\{[^}]*width:\s*3\.25rem/s);
  assert.match(result.css, /\.px-4\\\.5\s*\{[^}]*padding-left:\s*1\.125rem/s);
  assert.match(result.css, /\.text-24\s*\{[^}]*font-size:\s*24px/s);
});
