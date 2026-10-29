import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

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

test('light destructive keeps 4.5:1 for text on the light surfaces and for the white button label', () => {
  const rootBlock = /\n {2}:root \{([\s\S]*?)\n {2}\}\n/.exec(cssSource);
  assert.ok(rootBlock, 'expected a :root block in index.css');
  const primitive = /--destructive:\s*var\((--primitive-color-red-\d+)\)/.exec(rootBlock[1]);
  assert.ok(primitive, 'light --destructive must reference a red primitive');
  const hsl = (name: string) => {
    const match = new RegExp(`${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`).exec(rootBlock[1]);
    assert.ok(match, `light mode must define ${name}`);
    return hslToRgb(Number(match[1]), Number(match[2]), Number(match[3]));
  };
  const ratio = (a: number[], b: number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const red = hsl(primitive[1]);
  const white = hsl('--primitive-color-neutral-0');
  const subtle = hsl('--primitive-color-neutral-50');
  // text-destructive on the page/card, text-destructive on the subtle surface, and the white
  // label of the destructive Button (text-15 semibold is not "large text", so 4.5:1 applies).
  for (const [label, against] of [['white surface', white], ['subtle surface', subtle]] as const) {
    assert.ok(ratio(red, against) >= 4.5, `light destructive on ${label} is ${ratio(red, against).toFixed(2)}:1`);
  }
  assert.ok(ratio(white, red) >= 4.5, `white on light destructive is ${ratio(white, red).toFixed(2)}:1`);
});

test('destructive hover and error text on tinted surfaces keep 4.5:1', () => {
  const ratio = (a: number[], b: number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const block = (pattern: RegExp) => {
    const match = pattern.exec(cssSource);
    assert.ok(match, `expected ${pattern} in index.css`);
    return match[1];
  };
  const rootBlock = block(/\n {2}:root \{([\s\S]*?)\n {2}\}\n/);
  const darkBlock = block(/\n {2}\.dark \{([\s\S]*?)\n {2}\}\n/);
  const hslOf = (source: string, name: string) => {
    const match = new RegExp(`${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`).exec(source);
    assert.ok(match, `expected a literal hsl for ${name}`);
    return hslToRgb(Number(match[1]), Number(match[2]), Number(match[3]));
  };
  const white = [1, 1, 1];

  // Light: --destructive-hover points at --status-error-text; dark has its own literal.
  assert.match(rootBlock, /--destructive-hover:\s*var\(--status-error-text\)/);
  const lightHover = hslOf(rootBlock, '--status-error-text');
  assert.ok(ratio(white, lightHover) >= 4.5, `white on light hover is ${ratio(white, lightHover).toFixed(2)}:1`);
  const darkHover = hslOf(darkBlock, '--destructive-hover');
  assert.ok(ratio(white, darkHover) >= 4.5, `white on dark hover is ${ratio(white, darkHover).toFixed(2)}:1`);

  // Light error text on the strongest destructive tint the app uses (bg-destructive/20 over white).
  const lightDestructive = hslOf(rootBlock, '--primitive-color-red-600');
  const tint = lightDestructive.map((channel) => channel * 0.2 + 1 * 0.8);
  assert.ok(ratio(lightHover, tint) >= 4.5, `error text on destructive/20 is ${ratio(lightHover, tint).toFixed(2)}:1`);
  const plainOnTint = ratio(lightDestructive, tint);
  assert.ok(plainOnTint < 4.5, 'plain destructive on its own tint was the reason status-error-text is used there');

  // The Button must use the token, not the translucent shade that measured 4.32:1.
  const html = renderToStaticMarkup(createElement(Button, { variant: 'destructive' }, 'x'));
  assert.match(html, /hover:bg-destructive-hover/);
  assert.doesNotMatch(html, /hover:bg-destructive\/90/);
});
