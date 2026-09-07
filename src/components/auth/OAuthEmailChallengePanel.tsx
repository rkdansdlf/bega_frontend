import { useCallback, useEffect, useState } from 'react';

import type { OAuthEmailChallengeStatusDto } from '../../api/authPublic';
import type { OAuthEmailChallengeReason } from '../../utils/oauthEmailChallenge';
import { sanitizeLoginText, validateLoginField } from '../../utils/validation';
import { MailIcon } from '../icons/AuthFlowIcons';
import {
  AuthActionGroup,
  AuthFieldGroup,
  AuthHeader,
  AuthStatusPanel,
} from '../ui/auth-primitives';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface OAuthEmailChallengeClient {
  getOAuthEmailChallenge: (challengeId: string) => Promise<OAuthEmailChallengeStatusDto>;
  submitOAuthEmailChallengeEmail: (challengeId: string, email: string) => Promise<unknown>;
  resendOAuthEmailChallenge: (challengeId: string) => Promise<unknown>;
}

interface OAuthEmailChallengePanelProps {
  challengeId: string;
  reason: OAuthEmailChallengeReason;
  onReturnToLogin: () => void;
  challengeClient?: OAuthEmailChallengeClient | null;
}

let authPublicModulePromise: Promise<typeof import('../../api/authPublic')> | null = null;

const loadAuthPublicModule = () => {
  authPublicModulePromise ??= import('../../api/authPublic');
  return authPublicModulePromise;
};

const getErrorMessage = (error: unknown, fallback: string): string => (
  error instanceof Error && error.message.trim() ? error.message : fallback
);

const formatExpiry = (expiresAt: string | null): string | null => {
  if (!expiresAt) {
    return null;
  }

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function OAuthEmailChallengePanel({
  challengeId,
  reason,
  onReturnToLogin,
  challengeClient = null,
}: OAuthEmailChallengePanelProps) {
  const [challenge, setChallenge] = useState<OAuthEmailChallengeStatusDto | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getChallengeClient = useCallback(async () => (
    challengeClient ?? await loadAuthPublicModule()
  ), [challengeClient]);

  const refreshChallenge = useCallback(async () => {
    const { getOAuthEmailChallenge } = await getChallengeClient();
    const nextChallenge = await getOAuthEmailChallenge(challengeId);
    setChallenge(nextChallenge);
    return nextChallenge;
  }, [challengeId, getChallengeClient]);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    void refreshChallenge()
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(loadError, '이메일 확인 상태를 불러오지 못했습니다.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshChallenge]);

  useEffect(() => {
    if (challenge?.status !== 'EMAIL_SENT' || !challenge.expiresAt) {
      return undefined;
    }

    const remainingMs = new Date(challenge.expiresAt).getTime() - Date.now();
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
      setChallenge((current) => current ? { ...current, status: 'EXPIRED' } : current);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setChallenge((current) => current?.status === 'EMAIL_SENT'
        ? { ...current, status: 'EXPIRED' }
        : current);
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [challenge?.expiresAt, challenge?.status]);

  const handleSubmitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateLoginField('email', email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const { submitOAuthEmailChallengeEmail } = await getChallengeClient();
      await submitOAuthEmailChallengeEmail(challengeId, email.trim().toLowerCase());
      await refreshChallenge();
      setNotice('확인 메일을 발송했습니다. 받은 편지함에서 링크를 열어주세요.');
    } catch (submitError) {
      setError(getErrorMessage(submitError, '확인 메일을 발송하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const { resendOAuthEmailChallenge } = await getChallengeClient();
      await resendOAuthEmailChallenge(challengeId);
      await refreshChallenge();
      setNotice('확인 메일을 다시 발송했습니다. 최신 메일의 링크를 사용해주세요.');
    } catch (resendError) {
      setError(getErrorMessage(resendError, '확인 메일을 다시 발송하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const expiresAtLabel = formatExpiry(challenge?.expiresAt ?? null);

  return (
    <div className="space-y-6" data-testid="oauth-email-challenge-panel">
      <AuthHeader
        title="이메일 확인"
        description={reason === 'oauth2_email_required'
          ? '소셜 계정에서 이메일을 받지 못해 BEGA에서 사용할 이메일 확인이 필요합니다.'
          : '소셜 계정의 이메일 검증 상태를 확인할 수 없어 별도 이메일 확인이 필요합니다.'}
      />

      <div aria-live="polite" className="space-y-3">
        {isLoading ? (
          <AuthStatusPanel tone="default" role="status">
            <p className="text-body font-semibold">이메일 확인 상태를 불러오는 중입니다...</p>
          </AuthStatusPanel>
        ) : null}
        {error ? (
          <AuthStatusPanel tone="error" role="alert" data-testid="oauth-email-error">
            <p className="text-body font-semibold">{error}</p>
          </AuthStatusPanel>
        ) : null}
        {notice ? (
          <AuthStatusPanel tone="success" role="status" data-testid="oauth-email-notice">
            <p className="text-body font-semibold">{notice}</p>
          </AuthStatusPanel>
        ) : null}
      </div>

      {!isLoading && challenge?.status === 'EMAIL_REQUIRED' ? (
        <form onSubmit={handleSubmitEmail} className="space-y-5" data-testid="oauth-email-submit-form">
          <AuthFieldGroup>
            <div className="space-y-2">
              <label htmlFor="oauth-challenge-email" className="flex items-center gap-2 text-foreground">
                <MailIcon className="h-4 w-4 text-primary" />
                확인할 이메일
              </label>
              <Input
                id="oauth-challenge-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onChange={(event) => {
                  setEmail(sanitizeLoginText(event.target.value));
                  setEmailError('');
                }}
                onBlur={() => setEmailError(validateLoginField('email', email))}
                className={`auth-input login-autofill-input ${emailError ? 'auth-input-error' : ''}`}
                placeholder="name@example.com"
                disabled={isSubmitting}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'oauth-challenge-email-error' : undefined}
                data-testid="oauth-email-input"
              />
              {emailError ? (
                <p id="oauth-challenge-email-error" className="auth-error-text">* {emailError}</p>
              ) : null}
            </div>
          </AuthFieldGroup>

          <Button
            type="submit"
            variant="brand"
            size="touchLg"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            data-testid="oauth-email-submit"
          >
            {isSubmitting ? '발송 중...' : '확인 메일 보내기'}
          </Button>
        </form>
      ) : null}

      {!isLoading && challenge?.status === 'EMAIL_SENT' ? (
        <div className="space-y-5" data-testid="oauth-email-sent-state">
          <AuthStatusPanel tone="success" role="status">
            <div className="min-w-0 space-y-2">
              <p className="break-all text-body font-semibold">
                {challenge.maskedEmail || '입력한 이메일'}로 확인 링크를 보냈습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                {expiresAtLabel ? `${expiresAtLabel}까지 유효합니다.` : '메일의 안내 시간 안에 링크를 열어주세요.'}
              </p>
            </div>
          </AuthStatusPanel>
          <AuthActionGroup>
            <Button
              type="button"
              variant="brandOutline"
              size="touchLg"
              className="w-full"
              onClick={handleResend}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              data-testid="oauth-email-resend"
            >
              {isSubmitting ? '재발송 중...' : '확인 메일 다시 보내기'}
            </Button>
          </AuthActionGroup>
        </div>
      ) : null}

      {!isLoading && challenge?.status === 'VERIFIED' ? (
        <AuthStatusPanel tone="success" role="status" data-testid="oauth-email-verified-state">
          <div className="min-w-0 space-y-2">
            <p className="text-body font-semibold">이메일 확인이 완료되었습니다.</p>
            <p className="text-sm text-muted-foreground">사용하던 소셜 계정으로 다시 로그인해주세요.</p>
          </div>
        </AuthStatusPanel>
      ) : null}

      {!isLoading && challenge?.status === 'EXPIRED' ? (
        <AuthStatusPanel tone="warning" role="alert" data-testid="oauth-email-expired-state">
          <div className="min-w-0 space-y-2">
            <p className="text-body font-semibold">이메일 확인 요청이 만료되었습니다.</p>
            <p className="text-sm text-muted-foreground">소셜 로그인을 다시 시작해 새 확인 요청을 만들어주세요.</p>
          </div>
        </AuthStatusPanel>
      ) : null}

      {!isLoading && (challenge?.status === 'VERIFIED' || challenge?.status === 'EXPIRED' || !challenge) ? (
        <Button
          type="button"
          variant="brand"
          size="touchLg"
          className="w-full"
          onClick={onReturnToLogin}
          data-testid="oauth-email-return-login"
        >
          로그인으로 돌아가기
        </Button>
      ) : null}
    </div>
  );
}
