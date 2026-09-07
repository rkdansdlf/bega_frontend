import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { confirmOAuthEmailChallengeFromSearch } from '../utils/oauthEmailChallenge';
import AuthLayout from './auth/AuthLayout';
import { AuthHeader, AuthStatusPanel } from './ui/auth-primitives';
import { Button } from './ui/button';

type ConfirmationPhase = 'confirming' | 'verified' | 'expired' | 'error';

export type OAuthEmailChallengeConfirmVisualQaStateOverride = {
  phase: ConfirmationPhase;
  error: string | null;
};

interface OAuthEmailChallengeConfirmProps {
  visualQaStateOverride?: OAuthEmailChallengeConfirmVisualQaStateOverride;
}

export default function OAuthEmailChallengeConfirm(props: OAuthEmailChallengeConfirmProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasStarted = useRef(false);
  const [livePhase, setPhase] = useState<ConfirmationPhase>('confirming');
  const [liveError, setError] = useState<string | null>(null);
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : props.visualQaStateOverride;
  const phase = visualQaStateOverride?.phase ?? livePhase;
  const error = visualQaStateOverride?.error ?? liveError;

  useLayoutEffect(() => {
    if (visualQaStateOverride) {
      return;
    }

    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    void confirmOAuthEmailChallengeFromSearch(
      location.search,
      (nextSearch) => {
        const safeUrl = `${location.pathname}${nextSearch}${location.hash}`;
        window.history.replaceState(window.history.state, '', safeUrl);
      },
      async (token) => {
        const { confirmOAuthEmailChallenge } = await import('../api/authPublic');
        return confirmOAuthEmailChallenge(token);
      },
    )
      .then(() => setPhase('verified'))
      .catch(async (confirmationError: unknown) => {
        const { parseError } = await import('../utils/errorUtils');
        const parsed = parseError(confirmationError);
        if (parsed.responseCode === 'OAUTH_EMAIL_CHALLENGE_EXPIRED') {
          setPhase('expired');
          return;
        }

        setError(parsed.message || '이메일 확인을 완료하지 못했습니다.');
        setPhase('error');
      });
  }, [location.hash, location.pathname, location.search, visualQaStateOverride]);

  return (
    <AuthLayout showHomeButton={true}>
      <div className="space-y-6" data-testid="oauth-email-confirm-page">
        <AuthHeader
          title="이메일 확인"
          description="소셜 가입에 사용할 이메일을 안전하게 확인합니다."
        />

        {phase === 'confirming' ? (
          <AuthStatusPanel
            tone="default"
            role="status"
            data-testid="oauth-email-confirm-loading"
          >
            <p className="min-w-0 break-words text-body font-semibold [overflow-wrap:anywhere]">
              이메일 확인을 처리하는 중입니다...
            </p>
          </AuthStatusPanel>
        ) : null}

        {phase === 'verified' ? (
          <AuthStatusPanel tone="success" role="status" data-testid="oauth-email-confirmed-state">
            <div className="min-w-0 space-y-2">
              <p className="text-body font-semibold">이메일 확인이 완료되었습니다.</p>
              <p className="text-sm text-muted-foreground">사용하던 소셜 계정으로 다시 로그인하면 가입이 완료됩니다.</p>
            </div>
          </AuthStatusPanel>
        ) : null}

        {phase === 'expired' ? (
          <AuthStatusPanel tone="warning" role="alert" data-testid="oauth-email-confirm-expired-state">
            <div className="min-w-0 space-y-2">
              <p className="text-body font-semibold">이메일 확인 링크가 만료되었습니다.</p>
              <p className="text-sm text-muted-foreground">소셜 로그인을 다시 시작해 새 확인 메일을 받아주세요.</p>
            </div>
          </AuthStatusPanel>
        ) : null}

        {phase === 'error' ? (
          <AuthStatusPanel tone="error" role="alert" data-testid="oauth-email-confirm-error-state">
            <p className="min-w-0 break-words text-body font-semibold [overflow-wrap:anywhere]">{error}</p>
          </AuthStatusPanel>
        ) : null}

        {phase !== 'confirming' ? (
          <Button
            type="button"
            variant="brand"
            size="touchLg"
            className="w-full"
            onClick={() => navigate('/login', { replace: true })}
            data-testid="oauth-email-confirm-return-login"
          >
            로그인으로 돌아가기
          </Button>
        ) : null}
      </div>
    </AuthLayout>
  );
}
