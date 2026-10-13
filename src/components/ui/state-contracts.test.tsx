import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

// @ts-expect-error tailwind.config.js ships no declaration file
import config from '../../../tailwind.config.js';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button, type ButtonSize, type ButtonVariant } from './button';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from './card';
import { Input } from './input';
import { Textarea } from './textarea';

/**
 * Tailwind 3.4 silently drops a utility or variant it cannot generate. These primitives were
 * imported with Tailwind 4 syntax (`aria-invalid:`, `has-data-[...]`, `var(--spacing)`), so their
 * invalid state, card action layout and alert icon column never rendered. Compile the real
 * rendered class names so that regression fails here instead of in a browser.
 */
const cssSource = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

// Classes that are markers or custom CSS rather than Tailwind utilities.
const customClasses = new Set<string>(
  [...cssSource.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1]),
);
// Known no-ops that predate this guard and are intentionally left alone:
// - field-sizing-content: Tailwind 4 utility; enabling it would add textarea auto-grow behaviour.
// - @container/card-header: needs the container-queries plugin; no descendant uses @-variants.
const knownNoopUtilities = new Set(['field-sizing-content', '@container/card-header']);

const renderedClassTokens = (...elements: Parameters<typeof renderToStaticMarkup>[0][]) => {
  const tokens = new Set<string>();
  for (const element of elements) {
    for (const match of renderToStaticMarkup(element).matchAll(/class="([^"]*)"/g)) {
      for (const token of match[1].replace(/&gt;/g, '>').replace(/&amp;/g, '&').split(/\s+/)) {
        if (token) tokens.add(token);
      }
    }
  }
  return [...tokens];
};

const compileUtilities = (tokens: string[]) =>
  postcss([tailwindcss({ ...config, content: [{ raw: tokens.join(' ') }] })])
    .process('@tailwind utilities;', { from: undefined });

const generatedClassNames = async (tokens: string[]) => {
  const { css } = await compileUtilities(tokens);
  // Tailwind may expand one candidate into no rule at all; compile each token on its own so the
  // verdict never depends on how CSS escapes arbitrary values (commas, brackets, slashes).
  const generated = new Set<string>();
  for (const token of tokens) {
    const result = await compileUtilities([token]);
    if (result.css.trim() !== '') generated.add(token);
  }
  return { css, generated };
};

const buttonVariants: ButtonVariant[] = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'brand', 'brandOutline'];
const buttonSizes: ButtonSize[] = ['default', 'sm', 'lg', 'icon', 'iconTouch', 'touch', 'touchLg'];

const primitiveMarkup = () => [
  ...buttonVariants.flatMap((variant) => buttonSizes.map((size) =>
    createElement(Button, { variant, size, 'aria-invalid': true }, '버튼'))),
  createElement(Input, { 'aria-invalid': true }),
  createElement(Textarea, { 'aria-invalid': true }),
  createElement(
    Alert,
    null,
    createElement('svg'),
    createElement(AlertTitle, null, '제목'),
    createElement(AlertDescription, null, '설명'),
  ),
  createElement(Alert, { variant: 'destructive' }, createElement(AlertDescription, null, '오류')),
  createElement(
    Card,
    null,
    createElement(CardHeader, { className: 'border-b' }, createElement(CardAction, null, '액션')),
    createElement(CardContent, null, '본문'),
    createElement(CardFooter, { className: 'border-t' }, '푸터'),
  ),
];

test('button, form control, alert and card primitives only emit utilities Tailwind can generate', async () => {
  const tokens = renderedClassTokens(...primitiveMarkup());
  const { generated } = await generatedClassNames(tokens);
  const dead = tokens.filter((token) =>
    !generated.has(token) && !customClasses.has(token) && !knownNoopUtilities.has(token));
  // Marker-only hooks without any CSS (data-slot values never appear in class lists).
  assert.deepEqual(dead, []);
});

test('invalid state, alert icon column and card action layout compile to real CSS', async () => {
  const { css } = await generatedClassNames([
    'aria-[invalid=true]:border-destructive',
    'dark:aria-[invalid=true]:ring-destructive/40',
    'has-[>svg]:grid-cols-[1rem_1fr]',
    'has-[[data-slot=card-action]]:grid-cols-1',
    'sm:has-[[data-slot=card-action]]:grid-cols-[minmax(0,1fr)_auto]',
    '[&.border-b]:pb-4',
  ]);
  assert.match(css, /\[aria-invalid="true"\][^{]*\{[^}]*border-color:\s*hsl\(var\(--destructive\)/s);
  assert.match(css, /grid-template-columns:\s*1rem 1fr/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
  assert.match(css, /padding-bottom:\s*1rem/);
});

test('shared primitives declare the invalid state through the generated aria variant', () => {
  const buttonHtml = renderToStaticMarkup(createElement(Button, { variant: 'outline' }, '버튼'));
  const inputHtml = renderToStaticMarkup(createElement(Input));
  const textareaHtml = renderToStaticMarkup(createElement(Textarea));
  for (const html of [buttonHtml, inputHtml, textareaHtml]) {
    assert.match(html, /aria-\[invalid=true\]:border-destructive/);
    assert.match(html, /aria-\[invalid=true\]:ring-destructive\/20/);
    assert.match(html, /dark:aria-\[invalid=true\]:ring-destructive\/40/);
    assert.doesNotMatch(html, /(?:^|[\s"])(?:dark:)?aria-invalid:/);
  }
});

test('alert no longer depends on the undefined --spacing variable', () => {
  const html = renderToStaticMarkup(createElement(Alert, null, createElement('svg')));
  assert.doesNotMatch(html, /--spacing/);
  assert.match(html, /has-\[&gt;svg\]:grid-cols-\[1rem_1fr\]/);
});

const hslToRgb = (h: number, s: number, l: number) => {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  return [0, 8, 4].map((n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
};
const luminance = ([r, g, b]: number[]) => {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

test('dark destructive text and borders keep at least 4.5:1 contrast on the black dark surface', () => {
  const darkBlock = /\n {2}\.dark \{([\s\S]*?)\n {2}\}\n/.exec(cssSource);
  assert.ok(darkBlock, 'expected a .dark block in index.css');
  const red = /--primitive-color-red-500:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(darkBlock[1]);
  assert.ok(red, 'dark mode must define --primitive-color-red-500');
  const lum = luminance(hslToRgb(Number(red[1]), Number(red[2]), Number(red[3])));
  const contrastOnBlack = (lum + 0.05) / 0.05;
  assert.ok(contrastOnBlack >= 4.5, `destructive on black is ${contrastOnBlack.toFixed(2)}:1`);
  assert.match(cssSource, /--surface-app-dark:\s*0 0% 0%/);
});
