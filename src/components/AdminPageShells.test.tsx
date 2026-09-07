import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import AdminPage from './AdminPage';
import AdminPagePage from './AdminPagePage';

test('admin page renders an injected runtime surface inside the production shell', () => {
  const markup = renderToStaticMarkup(
    <AdminPage runtimeContentOverride={<div data-testid="admin-runtime-probe">관리 데이터</div>} />,
  );

  assert.match(markup, /data-testid="admin-page-shell"/);
  assert.match(markup, /data-testid="admin-runtime-probe"/);
  assert.match(markup, /BEGA 관리자 콘솔/);
});

test('admin route page renders an injected lazy boundary outcome', () => {
  const markup = renderToStaticMarkup(
    <AdminPagePage runtimeOverride={<div data-testid="admin-page-route-probe">관리자 화면</div>} />,
  );

  assert.match(markup, /data-testid="admin-page-route-probe"/);
  assert.doesNotMatch(markup, /관리자 화면을 준비하고 있습니다/);
});
