import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import PublicNavbarDesktopAuthControls from './PublicNavbarDesktopAuthControls';

test('desktop auth controls keep deterministic profile state development-only and preserve live hooks', () => {
  const source = readFileSync(new URL('./PublicNavbarDesktopAuthControls.tsx', import.meta.url), 'utf8');

  assert.match(source, /visualQaStateOverride\?:/);
  assert.match(source, /import\.meta\.env\?\.DEV \? visualQaStateOverrideProp : undefined/);
  assert.match(source, /const liveSession = useAuthSession\(\);/);
  assert.match(source, /const liveProfile = useAuthProfileSnapshot\(\);/);
  assert.match(source, /public-navbar-desktop-login/);
  assert.match(source, /public-navbar-desktop-profile/);
  assert.match(source, /public-navbar-desktop-admin/);
  assert.match(source, /public-navbar-desktop-logout/);
});

test('guest desktop auth control renders an icon-only login action with an accessible name', () => {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (String(args[0]).startsWith('Warning: useLayoutEffect does nothing on the server')) {
      return;
    }
    originalConsoleError(...args);
  };

  let html = '';
  try {
    html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(PublicNavbarDesktopAuthControls),
      ),
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.match(html, /aria-label="로그인"/);
  assert.match(html, /viewBox="0 0 256 256"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(html, />로그인</);
});

test('bootstrap auth control replaces clipped transition copy with an accessible compact label', () => {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (String(args[0]).startsWith('Warning: useLayoutEffect does nothing on the server')) {
      return;
    }
    originalConsoleError(...args);
  };

  let html = '';
  try {
    html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(PublicNavbarDesktopAuthControls, {
          compactProgress: 0.5,
          isAuthBootstrapPending: true,
        }),
      ),
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.match(html, /aria-label="로그인 확인 중"/);
  assert.match(html, /style="width:40px;flex-basis:40px;max-width:40px/);
  assert.match(html, />\.\.\.<\/span>/);
  assert.match(html, /style="display:none;[^"]*">로그인 확인 중\.\.\.<\/span>/);
});
