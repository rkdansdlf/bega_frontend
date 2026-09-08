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

const { default: SignUp } = await import('./SignUp');

const completeFormData = {
  name: '잠실직관러',
  handle: '@visual_qa',
  email: 'mobile@example.com',
  password: 'VisualQa1!abcd',
  confirmPassword: 'VisualQa1!abcd',
  favoriteTeam: 'LG 트윈스',
};

const emptyFieldErrors = {
  name: '',
  handle: '',
  email: '',
  password: '',
  confirmPassword: '',
  favoriteTeam: '',
};

const renderSignUp = (visualQaStateOverride: Record<string, unknown>) => renderToStaticMarkup(createElement(
  StaticRouter,
  { location: '/signup?redirect=%2Fmate' },
  createElement(SignUp as ComponentType<Record<string, unknown>>, { visualQaStateOverride }),
));

test('signup renders deterministic availability, pressure, loading, and success states', () => {
  const pressureHtml = renderSignUp({
    formData: completeFormData,
    fieldErrors: emptyFieldErrors,
    handleAvailability: {
      state: 'taken',
      message: `이미 사용 중인 핸들입니다. ${'아주 긴 한국어 안내 '.repeat(8)}`,
      normalized: '@visual_qa',
    },
    emailAvailability: { state: 'idle', message: '' },
    isLoading: false,
    isSubmitDisabled: true,
    isSuccess: false,
    error: null,
    showPassword: false,
    showConfirmPassword: false,
  });
  assert.match(pressureHtml, /이미 사용 중인 핸들입니다/);
  assert.match(pressureHtml, /value="@visual_qa"/);
  assert.match(pressureHtml, /disabled=""[^>]*data-testid="signup-submit"/);

  const loadingHtml = renderSignUp({
    formData: completeFormData,
    fieldErrors: emptyFieldErrors,
    handleAvailability: { state: 'available', message: '사용 가능한 핸들입니다.' },
    emailAvailability: { state: 'idle', message: '' },
    isLoading: true,
    isSubmitDisabled: true,
    isSuccess: false,
    error: null,
    showPassword: false,
    showConfirmPassword: false,
  });
  assert.match(loadingHtml, /처리 중/);
  assert.match(loadingHtml, /disabled=""[^>]*data-testid="signup-name"/);

  const successHtml = renderSignUp({
    formData: completeFormData,
    fieldErrors: emptyFieldErrors,
    handleAvailability: { state: 'available', message: '사용 가능한 핸들입니다.' },
    emailAvailability: { state: 'idle', message: '' },
    isLoading: false,
    isSubmitDisabled: true,
    isSuccess: true,
    error: null,
    showPassword: false,
    showConfirmPassword: false,
  });
  assert.match(successHtml, /성공!/);
});

test('signup keeps visibility, recommendation, and login controls mobile-sized and focus-visible', () => {
  const html = renderSignUp({
    formData: completeFormData,
    fieldErrors: emptyFieldErrors,
    handleAvailability: { state: 'available', message: '사용 가능한 핸들입니다.' },
    emailAvailability: { state: 'idle', message: '' },
    isLoading: false,
    isSubmitDisabled: false,
    isSuccess: false,
    error: null,
    showPassword: true,
    showConfirmPassword: true,
  });

  assert.match(html, /type="text"[^>]*data-testid="signup-password"/);
  assert.match(html, /type="text"[^>]*data-testid="signup-confirm-password"/);
  assert.equal((html.match(/data-vqa-overlap="allowed"/g) ?? []).length, 2);
  assert.equal((html.match(/data-testid="signup-[^" ]*-visibility"/g) ?? []).length, 2);
  assert.equal((html.match(/h-11 w-11/g) ?? []).length, 2);
  assert.equal((html.match(/focus-visible:ring-2/g) ?? []).length, 2);
  assert.match(html, /min-h-11[^>]*data-testid="signup-team-test"/);
  assert.match(html, /min-h-11[^>]*data-testid="signup-login-link"/);
});
