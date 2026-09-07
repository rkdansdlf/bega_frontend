import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthProfileActions } from '../store/authStore';
import { useAuthRedirectState } from '../store/authStore';
import { consumeOAuth2State } from '../api/authPublic';
import AuthLayout from './auth/AuthLayout';
import { AuthHeader, AuthStatusPanel } from './ui/auth-primitives';
import { Button } from './ui/button';
import {
  AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE,
  buildAuthSessionFailureLoginPath,
  resolveOAuthCompletionPath,
  resolveOAuthErrorCode,
} from '../utils/authFlow';
import { buildLoginPathWithError, getStoredLoginRedirect } from '../utils/loginRedirect';
import { parseError } from '../utils/errorUtils';
import { markAuthSessionEstablished } from '../api/authSessionGeneration';

export type OAuthCallbackVisualQaStateOverride = {
  phase: 'loading' | 'error';
  errorCode?: string | null;
  title?: string;
  description?: string;
};

interface OAuthCallbackProps {
  visualQaStateOverride?: OAuthCallbackVisualQaStateOverride;
}

export default function OAuthCallback(props: OAuthCallbackProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchProfileAndAuthenticate } = useAuthProfileActions();
  const { pendingLoginRedirect, clearPendingLoginRedirect } = useAuthRedirectState();
  const [liveErrorCode, setErrorCode] = useState<string | null>(null);
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : props.visualQaStateOverride;
  const errorCode = visualQaStateOverride?.phase === 'error'
    ? visualQaStateOverride.errorCode ?? 'oauth2_auth_failed'
    : liveErrorCode;

  const hasCalled = useRef(false);

  useEffect(() => {
    if (visualQaStateOverride) {
      return undefined;
    }

    let redirectTimer: number | null = null;
    const state = searchParams.get('state');
    const status = searchParams.get('status');
    const getRetryLoginPath = (nextErrorCode?: string | null) =>
      buildLoginPathWithError(nextErrorCode, pendingLoginRedirect || getStoredLoginRedirect());
    const scheduleRetryRedirect = (nextErrorCode: string) => {
      setErrorCode(nextErrorCode);
      redirectTimer = window.setTimeout(() => {
        navigate(getRetryLoginPath(nextErrorCode), { replace: true });
      }, 2000);
    };

    if (!state) {
      navigate(getRetryLoginPath('invalid_oauth2_request'), { replace: true });
      return undefined;
    }

    if (hasCalled.current) return;
    hasCalled.current = true;

    (async () => {
      try {
        const data = await consumeOAuth2State(state);
        const { email, name, handle } = data;

        if (email && name) {
          const didAuthenticate = await fetchProfileAndAuthenticate();
          const redirectPath = resolveOAuthCompletionPath({
            didAuthenticate,
            status,
            pendingRedirect: pendingLoginRedirect,
            handle,
          });
          if (!didAuthenticate) {
            scheduleRetryRedirect(AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE);
            return;
          }
          markAuthSessionEstablished();
          clearPendingLoginRedirect();
          navigate(redirectPath, { replace: true });
        } else {
          scheduleRetryRedirect('oauth2_provider_payload_invalid');
        }
      } catch (error) {
        scheduleRetryRedirect(resolveOAuthErrorCode(parseError(error).responseCode));
      }
    })();

    return () => {
      if (redirectTimer !== null) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [
    clearPendingLoginRedirect,
    fetchProfileAndAuthenticate,
    navigate,
    pendingLoginRedirect,
    searchParams,
    visualQaStateOverride,
  ]);

  const retryLoginPath = errorCode === AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE
    ? buildAuthSessionFailureLoginPath(pendingLoginRedirect || getStoredLoginRedirect())
    : buildLoginPathWithError(errorCode, pendingLoginRedirect || getStoredLoginRedirect());

  return (
    <AuthLayout showHomeButton={true}>
      <div className="space-y-6" data-testid="oauth-callback-page">
        <AuthHeader
          title="로그인 확인"
          description="소셜 계정 로그인 결과를 안전하게 확인합니다."
        />
        {errorCode ? (
          <>
            <AuthStatusPanel tone="error" role="alert" data-testid="oauth-callback-error">
              <div className="min-w-0 space-y-2 break-words [overflow-wrap:anywhere]">
                <p className="text-body font-semibold">
                  {visualQaStateOverride?.title ?? '로그인 처리에 실패했습니다.'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {visualQaStateOverride?.description ?? '로그인 페이지로 돌아가 다시 시도해주세요.'}
                </p>
              </div>
            </AuthStatusPanel>
            <Button
              type="button"
              variant="brandOutline"
              size="touchLg"
              className="w-full"
              onClick={() => navigate(retryLoginPath, { replace: true })}
              data-testid="oauth-callback-return-login"
            >
              로그인으로 돌아가기
            </Button>
          </>
        ) : (
          <AuthStatusPanel
            tone="default"
            role="status"
            data-testid="oauth-callback-loading"
          >
            <p className="min-w-0 break-words text-body font-semibold [overflow-wrap:anywhere]">
              로그인 처리 중입니다...
            </p>
          </AuthStatusPanel>
        )}
      </div>
    </AuthLayout>
  );
}
