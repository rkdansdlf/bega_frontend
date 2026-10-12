import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import Home from './Home';

test('Home wrapper exposes its readable lazy loading fallback', () => {
  const markup = renderToStaticMarkup(
    <Home runtimeLoader={() => new Promise<never>(() => {})} />,
  );

  assert.match(markup, /data-testid="home-route-loading"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /min-h-screen/);
});

test('Home wrapper renders the delegated runtime inside the production boundary', () => {
  const markup = renderToStaticMarkup(
    <Home runtimeOverride={<div data-testid="home-wrapper-runtime-probe">HomeRuntime 위임</div>} />,
  );

  assert.match(markup, /data-testid="home-wrapper-runtime-probe"/);
  assert.doesNotMatch(markup, /data-testid="home-route-loading"/);
});

test('Home wrapper keeps the default route wired to the production HomeRuntime child', async () => {
  const source = await readFile(new URL('./Home.tsx', import.meta.url), 'utf8');

  assert.match(source, /const homeRuntimeComponent = lazy\(\(\) => import\('\.\/HomeRuntime'\)\);/);
  assert.match(source, /createElement\(runtimeComponent\)/);
});

test('Home date controls keep CSS-pixel touch geometry under text zoom', async () => {
  const source = await readFile(new URL('./HomeRuntime.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./HomeRuntime.css', import.meta.url), 'utf8');

  assert.match(source, /HOME_BUTTON_OUTLINE_TOUCH_CLASS = .*h-\[44px\] min-h-\[44px\]/);
  assert.match(source, /HOME_BUTTON_GHOST_ICON_TOUCH_CLASS = .*h-\[44px\] min-h-\[44px\] w-\[44px\] min-w-\[44px\]/);
  assert.match(source, /flex min-w-0 max-w-full flex-col items-center/);
  assert.match(source, /max-w-full text-center break-words break-keep text-\[length:min\(1\.25rem,30px\)\]/);
  // Date and weekday stay unbreakable tokens so WebKit cannot split "(월)".
  assert.match(source, /formatHomeDate\(displayedHomeDate\)\.split\(' '\)[\s\S]*whitespace-nowrap/);
  assert.match(source, /home-runtime-date-link min-h-\[44px\]/);
  assert.match(styles, /\.home-runtime-date-link\s*\{[\s\S]*height: 44px !important;[\s\S]*min-height: 44px !important;/);
});
