import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Button } from './plain-button';

const classNameOf = (props: Record<string, unknown> = {}) => {
  const html = renderToStaticMarkup(createElement(
    Button,
    { id: 'plain-button', ...props },
    `모바일에서도 안전하게 줄바꿈되는 매우 긴 버튼 라벨-${'가'.repeat(120)}`,
  ));
  const button = /<button[^>]*class="([^"]+)"[^>]*>/.exec(html);
  assert.ok(button);
  return button[1];
};

test('plain button keeps labelled controls contained and touch sized on mobile', () => {
  const className = classNameOf();
  assert.match(className, /bf/);
  assert.match(className, /min-h-11/);
  assert.match(className, /sm:min-h-9/);
});

test('plain button shares the global narrow-label containment contract', () => {
  const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
  assert.match(css, /\.bf\s*\{[^}]*flex-shrink:\s*1;/s);
  assert.match(css, /\.bf\s*\{[^}]*text-align:\s*center;/s);
});

test('plain button sizes preserve mobile touch targets and desktop density', () => {
  assert.match(classNameOf({ size: 'sm' }), /sm:min-h-8/);
  assert.match(classNameOf({ size: 'icon' }), /size-11/);
  assert.match(classNameOf({ size: 'icon' }), /sm:size-9/);
  assert.match(classNameOf({ size: 'icon' }), /shrink-0/);
  assert.match(classNameOf({ size: 'iconTouch' }), /size-11/);
  assert.match(classNameOf({ size: 'touch' }), /min-h-11/);
});

test('plain button bounds unsized SVG icons so labels keep usable width', () => {
  const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
  assert.match(css, /\.bf svg\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(css, /\.bf svg\s*\{[^}]*flex-shrink:\s*0;/s);
  assert.match(css, /\.bf svg:not\(\[class\*=['"]size-['"]\]\)\s*\{[^}]*height:\s*1rem;/s);
});

test('plain button asChild branch preserves its link contract', () => {
  const html = renderToStaticMarkup(createElement(
    Button,
    { asChild: true, id: 'plain-button-link', variant: 'outline' },
    createElement('a', { href: '/visual-qa' }, '긴 링크 버튼'),
  ));
  assert.match(html, /^<a /);
  assert.match(html, /id="plain-button-link"/);
  assert.match(html, /bf/);
});
