import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type NextLoad = (url: string, context: unknown) => unknown;
const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: (url: string, context: unknown, next: NextLoad) => unknown }) => void;
};
registerHooks({ load(url, context, next) {
  if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default {};' };
  return next(url, context);
} });
const { default: Runtime } = await import('../AdminPageRuntimeContent');

test('admin menu bounds mobile columns while retaining desktop column definition and tab semantics', () => {
  const html = renderToStaticMarkup(createElement<NonNullable<Parameters<typeof Runtime>[0]>>(Runtime, { dataRuntimeOverride: createElement('p', null, '합성 패널') }));
  assert.ok(html.includes('grid-cols-[repeat(auto-fit,minmax(min(100%,6.5rem),1fr))]'));
  assert.ok(html.includes('sm:grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))]'));
  assert.equal((html.match(/role="tab"/g) ?? []).length, 10);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.match(html, /data-testid="admin-tab-users" aria-selected="true"/);
  const ids = Array.from(html.matchAll(/data-testid="admin-tab-([^\"]+)"/g), (m) => m[1]);
  assert.deepEqual(ids, ['users', 'posts', 'parties', 'reports', 'game-status', 'client-errors', 'seat-views', 'offseason', 'stadiums', 'ai']);
  assert.match(html, /합성 패널/);
});
