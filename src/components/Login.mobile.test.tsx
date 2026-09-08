import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/test-auth-asset.webp";',
      };
    }

    if (url.endsWith('.css')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default {};',
      };
    }

    return nextLoad(url, context);
  },
});

const { default: Login } = await import('./Login');

const renderLogin = (visualQaStateOverride: Record<string, unknown>) => renderToStaticMarkup(createElement(
  StaticRouter,
  { location: '/login?redirect=%2Fmate' },
  createElement(Login as ComponentType<Record<string, unknown>>, { visualQaStateOverride }),
));

test('login renders deterministic loading, pressure error, and saved-email states', () => {
  const errorMessage = `로그인 오류 ${'아주 긴 한국어 안내 '.repeat(12)}`;
  const errorHtml = renderLogin({
    formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
    fieldErrors: { email: '', password: '' },
    showPassword: false,
    isLoading: false,
    error: errorMessage,
    rememberEmail: true,
  });
  assert.match(errorHtml, /data-testid="login-status-panel"/);
  assert.match(errorHtml, /로그인 오류 아주 긴 한국어 안내/);
  assert.match(errorHtml, /value="mobile@example.com"/);
  assert.match(errorHtml, /id="remember-email"[^>]*checked=""/);

  const loadingHtml = renderLogin({
    formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
    fieldErrors: { email: '', password: '' },
    showPassword: false,
    isLoading: true,
    error: null,
    rememberEmail: false,
  });
  assert.match(loadingHtml, /disabled=""[^>]*data-testid="login-submit"/);
  assert.match(loadingHtml, /로그인 중/);
});

test('login keeps password visibility and saved-email controls mobile-sized and focus-visible', () => {
  const html = renderLogin({
    formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
    fieldErrors: { email: '', password: '' },
    showPassword: true,
    isLoading: false,
    error: null,
    rememberEmail: true,
  });

  assert.match(html, /type="text"[^>]*data-testid="login-password"/);
  assert.match(html, /data-vqa-overlap="allowed"/);
  assert.match(html, /h-11 w-11[^>]*data-testid="login-password-visibility"/);
  assert.match(html, /focus-visible:ring-2[^>]*data-testid="login-password-visibility"/);
  assert.match(html, /for="remember-email"[^>]*min-h-11/);
});
