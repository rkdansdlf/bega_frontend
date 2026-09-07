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

const [{ default: PasswordReset }, { default: PasswordResetConfirm }] = await Promise.all([
  import('./PasswordReset'),
  import('./PasswordResetConfirm'),
]);

const renderAt = (location: string, component: ComponentType<Record<string, unknown>>, props: Record<string, unknown>) => (
  renderToStaticMarkup(createElement(
    StaticRouter,
    { location },
    createElement(component, props),
  ))
);

test('password reset renders deterministic loading, pressure error, and completion states', () => {
  const errorHtml = renderAt('/password/reset', PasswordReset as ComponentType<Record<string, unknown>>, {
    visualQaStateOverride: {
      email: 'mobile@example.com',
      emailError: '',
      isSubmitted: false,
      isLoading: false,
      error: `재설정 오류 ${'아주 긴 한국어 안내 '.repeat(12)}`,
      successMessage: '',
    },
  });
  assert.match(errorHtml, /data-testid="password-reset-status-panel"/);
  assert.match(errorHtml, /재설정 오류 아주 긴 한국어 안내/);
  assert.match(errorHtml, /value="mobile@example.com"/);

  const loadingHtml = renderAt('/password/reset', PasswordReset as ComponentType<Record<string, unknown>>, {
    visualQaStateOverride: {
      email: 'mobile@example.com',
      emailError: '',
      isSubmitted: false,
      isLoading: true,
      error: null,
      successMessage: '',
    },
  });
  assert.match(loadingHtml, /disabled=""[^>]*data-testid="password-reset-submit"/);
  assert.match(loadingHtml, /전송 중/);

  const completeHtml = renderAt('/password/reset', PasswordReset as ComponentType<Record<string, unknown>>, {
    visualQaStateOverride: {
      email: 'mobile@example.com',
      emailError: '',
      isSubmitted: true,
      isLoading: false,
      error: null,
      successMessage: '결정적 완료 안내입니다.',
    },
  });
  assert.match(completeHtml, /결정적 완료 안내입니다/);
  assert.match(completeHtml, /data-testid="password-reset-return-login"/);
});

test('password reset confirmation keeps visibility controls mobile-sized and focus-visible', () => {
  const html = renderAt(
    '/password/reset/confirm?token=visual-qa-token',
    PasswordResetConfirm as ComponentType<Record<string, unknown>>,
    {
      visualQaStateOverride: {
        token: 'visual-qa-token',
        formData: {
          newPassword: 'VisualQa1!',
          confirmPassword: 'VisualQa1!',
        },
        fieldErrors: {
          newPassword: '',
          confirmPassword: '',
        },
        showNewPassword: true,
        showConfirmPassword: true,
        isCompleted: false,
        isLoading: false,
        error: null,
      },
    },
  );

  assert.match(html, /type="text"[^>]*data-testid="password-reset-confirm-new-password"/);
  assert.match(html, /type="text"[^>]*data-testid="password-reset-confirm-confirm-password"/);
  assert.match(html, /data-vqa-overlap="allowed"/);
  const visibilityButtons = html.match(/data-testid="password-reset-confirm-[^"]+-visibility"/g) ?? [];
  assert.equal(visibilityButtons.length, 2);
  assert.equal((html.match(/h-11 w-11/g) ?? []).length, 2);
  assert.equal((html.match(/focus-visible:ring-2/g) ?? []).length, 2);
});

test('password reset confirmation renders deterministic missing-token and completion states', () => {
  const invalidHtml = renderAt('/password/reset/confirm', PasswordResetConfirm as ComponentType<Record<string, unknown>>, {
    visualQaStateOverride: {
      token: '',
      formData: { newPassword: '', confirmPassword: '' },
      fieldErrors: { newPassword: '', confirmPassword: '' },
      showNewPassword: false,
      showConfirmPassword: false,
      isCompleted: false,
      isLoading: false,
      error: '유효하지 않은 링크입니다.',
    },
  });
  assert.match(invalidHtml, /유효하지 않은 링크입니다/);
  assert.match(invalidHtml, /disabled=""[^>]*data-testid="password-reset-confirm-submit"/);

  const completeHtml = renderAt(
    '/password/reset/confirm?token=visual-qa-token',
    PasswordResetConfirm as ComponentType<Record<string, unknown>>,
    {
      visualQaStateOverride: {
        token: 'visual-qa-token',
        formData: { newPassword: 'VisualQa1!', confirmPassword: 'VisualQa1!' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        showNewPassword: false,
        showConfirmPassword: false,
        isCompleted: true,
        isLoading: false,
        error: null,
      },
    },
  );
  assert.match(completeHtml, /비밀번호 변경 완료/);
  assert.match(completeHtml, /data-testid="password-reset-confirm-login"/);
});
