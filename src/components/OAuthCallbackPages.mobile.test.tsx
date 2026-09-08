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

const [{ default: OAuthCallback }, { default: OAuthEmailChallengeConfirm }] = await Promise.all([
  import('./OAuthCallback'),
  import('./OAuthEmailChallengeConfirm'),
]);

const renderAt = (
  location: string,
  component: ComponentType<Record<string, unknown>>,
  visualQaStateOverride: Record<string, unknown>,
) => renderToStaticMarkup(createElement(
  StaticRouter,
  { location },
  createElement(component, { visualQaStateOverride }),
));

test('oauth callback renders deterministic loading and pressure error states in the mobile auth shell', () => {
  const loadingHtml = renderAt(
    '/oauth/callback?state=visual-qa-state',
    OAuthCallback as ComponentType<Record<string, unknown>>,
    { phase: 'loading' },
  );
  assert.match(loadingHtml, /data-testid="auth-shell"/);
  assert.match(loadingHtml, /data-testid="oauth-callback-loading"/);

  const errorHtml = renderAt(
    '/oauth/callback?state=visual-qa-state',
    OAuthCallback as ComponentType<Record<string, unknown>>,
    {
      phase: 'error',
      errorCode: 'oauth2_auth_failed',
      title: `로그인 처리 실패 ${'아주 긴 한국어 안내 '.repeat(8)}`,
      description: `OAUTH_CALLBACK_${'UNBROKEN'.repeat(20)}`,
    },
  );
  assert.match(errorHtml, /data-testid="oauth-callback-error"/);
  assert.match(errorHtml, /아주 긴 한국어 안내/);
  assert.match(errorHtml, /OAUTH_CALLBACK_UNBROKEN/);
  assert.match(errorHtml, /data-testid="oauth-callback-return-login"/);
  assert.match(errorHtml, /\[overflow-wrap:anywhere\]/);
});

test('oauth email confirmation renders every terminal phase with a mobile-sized return action', () => {
  const verifiedHtml = renderAt(
    '/oauth/email/confirm?token=visual-qa-token',
    OAuthEmailChallengeConfirm as ComponentType<Record<string, unknown>>,
    { phase: 'verified', error: null },
  );
  assert.match(verifiedHtml, /data-testid="oauth-email-confirmed-state"/);
  assert.match(
    verifiedHtml,
    /data-testid="oauth-email-confirmed-state"[^>]*><div class="min-w-0 space-y-2">/,
  );
  assert.match(verifiedHtml, /data-testid="oauth-email-confirm-return-login"/);

  const expiredHtml = renderAt(
    '/oauth/email/confirm?token=visual-qa-token',
    OAuthEmailChallengeConfirm as ComponentType<Record<string, unknown>>,
    { phase: 'expired', error: null },
  );
  assert.match(expiredHtml, /data-testid="oauth-email-confirm-expired-state"/);
  assert.match(
    expiredHtml,
    /data-testid="oauth-email-confirm-expired-state"[^>]*><div class="min-w-0 space-y-2">/,
  );

  const errorHtml = renderAt(
    '/oauth/email/confirm?token=visual-qa-token',
    OAuthEmailChallengeConfirm as ComponentType<Record<string, unknown>>,
    {
      phase: 'error',
      error: `이메일 확인 오류 ${'UNBROKEN'.repeat(24)}`,
    },
  );
  assert.match(errorHtml, /data-testid="oauth-email-confirm-error-state"/);
  assert.match(errorHtml, /이메일 확인 오류 UNBROKEN/);
  assert.match(errorHtml, /\[overflow-wrap:anywhere\]/);
  assert.match(errorHtml, /data-testid="oauth-email-confirm-return-login"/);
});
