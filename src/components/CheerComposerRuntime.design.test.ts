import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import CheerComposerLoginPrompt from './CheerComposerLoginPrompt';

test('CheerComposerLoginPrompt는 비로그인 작성 영역을 명확한 로그인 CTA로 표시한다', () => {
  const html = renderToStaticMarkup(createElement(CheerComposerLoginPrompt, {
    teamColor: '#16a34a',
    teamContrastText: '#ffffff',
    onRequireLogin: () => {},
  }));

  assert.match(html, /data-testid="cheer-composer-login-required"/);
  assert.match(html, /로그인하고 응원에 참여해보세요/);
  assert.match(html, /응원글을 작성하고 다른 팬들과 이야기를 나눌 수 있어요/);
  assert.match(html, /data-testid="cheer-composer-login"/);
  assert.match(html, /로그인하기/);
});
