import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Button, buttonVariants } from './button';

const renderButton = (props: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(
  Button,
  { id: 'button', ...props },
  `모바일에서도 안전하게 줄바꿈되는 매우 긴 버튼 라벨-${'가'.repeat(120)}`,
));

test('button keeps labelled controls contained and touch sized on mobile', () => {
  const html = renderButton();
  const button = /<button[^>]*class="([^"]+)"[^>]*>/.exec(html);
  assert.ok(button);
  assert.match(button[1], /bf/);
  assert.doesNotMatch(button[1], /(?:^|\s)shrink-0(?:\s|$)/);
  assert.match(button[1], /min-h-11/);
  assert.match(button[1], /sm:min-h-9/);
  assert.equal(/type="button"/.test(html), true);
});

test('button fluid class owns the narrow-label containment contract', () => {
  const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
  assert.match(css, /\.bf\s*\{[^}]*display:\s*inline-flex;/s);
  assert.match(css, /\.bf\s*\{[^}]*align-items:\s*center;/s);
  assert.match(css, /\.bf\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(css, /\.bf\s*\{[^}]*gap:\s*0\.5rem;/s);
  assert.match(css, /\.bf\s*\{[^}]*min-width:\s*0;/s);
  assert.match(css, /\.bf\s*\{[^}]*max-width:\s*100%;/s);
  assert.match(css, /\.bf\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(css, /\.bf\s*\{[^}]*white-space:\s*normal;/s);
  assert.match(css, /\.bf:disabled\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(css, /\.bf svg:not\(\[class\*=['"]size-['"]\]\)\s*\{[^}]*width:\s*1rem;/s);
});

test('button sizes preserve mobile touch targets and desktop density', () => {
  assert.match(buttonVariants({ size: 'sm' }), /min-h-11/);
  assert.match(buttonVariants({ size: 'sm' }), /sm:min-h-8/);
  assert.match(buttonVariants({ size: 'lg' }), /min-h-11/);
  assert.match(buttonVariants({ size: 'lg' }), /sm:min-h-10/);
  assert.match(buttonVariants({ size: 'icon' }), /size-11/);
  assert.match(buttonVariants({ size: 'icon' }), /sm:size-9/);
  assert.match(buttonVariants({ size: 'icon' }), /shrink-0/);
  assert.match(buttonVariants({ size: 'iconTouch' }), /size-11/);
  assert.match(buttonVariants({ size: 'touch' }), /min-h-11/);
  assert.match(buttonVariants({ size: 'touchLg' }), /min-h-12/);
});

test('button asChild branch keeps containment classes and consumer props', () => {
  const html = renderToStaticMarkup(createElement(
    Button,
    { asChild: true, id: 'button-link', variant: 'outline' },
    createElement('a', { href: '/visual-qa' }, '긴 링크 버튼'),
  ));
  assert.match(html, /^<a /);
  assert.match(html, /data-slot="button"/);
  assert.match(html, /id="button-link"/);
  assert.match(html, /bf/);
});
