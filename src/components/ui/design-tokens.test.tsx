import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

import config from '../../../tailwind.config.js';
import { Input } from './input';
import { Textarea } from './textarea';
import { StatusBadge } from './status-badge';

test('form controls emit a supported light surface utility and keep dark/focus/invalid styles', async () => {
  const html = [Input, Textarea].map((component) => renderToStaticMarkup(
    createElement(component, { 'aria-label': '입력', 'aria-invalid': true, disabled: true }),
  )).join('');
  assert.doesNotMatch(html, /bg-input-background/);
  assert.equal((html.match(/(?:\s|\")bg-background(?:\s|\")/g) ?? []).length, 2);
  assert.equal((html.match(/dark:bg-input\/30/g) ?? []).length, 2);
  assert.equal((html.match(/aria-\[invalid=true\]:border-destructive/g) ?? []).length, 2);
  const generated = await postcss([tailwindcss({ ...config, content: [{ raw: html }] })])
    .process('@tailwind utilities;', { from: undefined });
  assert.match(generated.css, /\.bg-background\s*\{[^}]*background-color:\s*hsl\(var\(--background\)\)/s);
});

test('filled badge uses an exact-value brand token without changing custom marker/text colors', () => {
  const html = renderToStaticMarkup(createElement(StatusBadge, {
    variant: 'filled', label: '상태', dotColor: '#123456', filledTextColor: '#abcdef',
  }));
  assert.match(html, /bg-primary-deep/);
  assert.doesNotMatch(html, /bg-\[#173b34\]/);
  assert.match(html, /color:#123456/);
  assert.match(html, /color:#abcdef/);
  const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
  assert.match(css, /--brand-primary-deep:\s*23 59 52\s*;/);
  assert.equal(config.theme.extend.colors.primary.deep, 'rgb(var(--brand-primary-deep) / <alpha-value>)');
});
