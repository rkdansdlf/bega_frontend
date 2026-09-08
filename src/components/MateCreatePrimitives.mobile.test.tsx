import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement, type ComponentPropsWithoutRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FieldLabel } from './MateCreatePrimitives';

test('field label forwards native label attributes and caller emphasis classes', () => {
  const props: ComponentPropsWithoutRef<'label'> & { 'data-testid': string } = {
    className: 'text-base font-bold sm:text-lg',
    'data-testid': 'field-label-contract',
    htmlFor: 'ticket-price',
  };
  const markup = renderToStaticMarkup(createElement(FieldLabel, props, '티켓 가격'));

  assert.match(markup, /for="ticket-price"/);
  assert.match(markup, /data-testid="field-label-contract"/);
  assert.match(markup, /text-base/);
  assert.match(markup, /font-bold/);
  assert.match(markup, /sm:text-lg/);
  assert.match(markup, />티켓 가격<\/label>/);
});

test('field label wraps long Korean and unbroken copy inside a 320px surface', () => {
  const markup = renderToStaticMarkup(createElement(FieldLabel, null, '필드 이름'));

  assert.match(markup, /class="block/);
  assert.match(markup, /max-w-full/);
  assert.match(markup, /min-w-0/);
  assert.doesNotMatch(markup, /flex-wrap|items-center|gap-x-/);
  assert.match(markup, /break-words/);
  assert.match(markup, /\[overflow-wrap:anywhere\]/);
  assert.match(markup, /leading-snug/);
  assert.match(markup, /dark:text-white/);
});
