import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

import config from '../../../tailwind.config.js';
import { Alert } from './alert';
import { Card } from './card';

/**
 * Card and Alert draw a bare `border`, which resolves to Tailwind's preflight #e5e7eb (near-white
 * on the black dark surfaces). index.css gives them the theme border in dark mode through a
 * zero-specificity `:where()` rule: consumers pass their own border colors (`dark:border-zinc-800`,
 * `border-red-200`, ...) and cn() does not tailwind-merge, so the default must lose to any utility.
 */
const indexCss = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

// Tailwind 3.4 drops `@layer base` rules whose class selectors never appear in the scanned
// content; production scans src/, where `dark` is everywhere.
const compiled = async () =>
  (
    await postcss([tailwindcss({ ...config, content: [{ raw: 'dark' }] })]).process(indexCss, {
      from: undefined,
    })
  ).css;

test('Card and Alert expose the data-slot hooks the dark border default relies on', () => {
  assert.match(renderToStaticMarkup(createElement(Card)), /data-slot="card"/);
  assert.match(renderToStaticMarkup(createElement(Alert)), /data-slot="alert"/);
});

test('dark Card/Alert get the theme border from a zero-specificity rule', async () => {
  const css = await compiled();
  const rule = css.match(
    /(:where\(\.dark\) :where\(\[data-slot=['"]?card['"]?\],\s*\[data-slot=['"]?alert['"]?\]\))\s*\{([^}]*)\}/,
  );
  assert.ok(rule, 'compiled CSS lost the dark Card/Alert border-color default');
  assert.match(rule[2], /border-color:\s*hsl\(var\(--border\)\)/);

  // Must come after preflight's `*, ::before, ::after { border-color: #e5e7eb }` at equal
  // specificity, otherwise it never applies.
  const preflight = css.indexOf('border-color: #e5e7eb');
  assert.ok(preflight >= 0 && css.indexOf(rule[1]) > preflight, 'rule is emitted before preflight');
});
