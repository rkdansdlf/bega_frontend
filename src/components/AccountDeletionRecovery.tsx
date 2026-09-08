import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { buildLoginPath, getStoredLoginRedirect } from '../utils/loginRedirect';
import AuthLayout from './auth/AuthLayout';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ShieldAlertIcon,
} from './icons/AuthFlowIcons';
import {
  AuthActionGroup,
  AuthHeader,
  AuthStatusPanel,
} from './ui/auth-primitives';
import { Button } from './ui/button';

const ACCOUNT_SETTINGS_REDIRECT_PATH = '/mypage?view=accountSettings';

export type AccountDeletionRecoveryInitialState = {
  scheduledFor?: string;
  canRecover?: boolean;
  isLoading?: boolean;
  isRecovering?: boolean;
  isRecovered?: boolean;
  error?: string;
};

export type AccountDeletionRecoveryRuntime = {
  getRecoveryInfo: (token: string) => Promise<{ scheduledFor: string }>;
  requestRecovery: (token: string) => Promise<void>;
  navigate?: (path: string) => void;
};

type AccountDeletionRecoveryProps = {
  tokenOverride?: string;
  redirectPathOverride?: string;
  initialStateOverride?: AccountDeletionRecoveryInitialState;
  runtimeOverride?: AccountDeletionRecoveryRuntime;
};

let recoveryPublicModulePromise: Promise<typeof import('../api/accountDeletionRecoveryPublic')> | null = null;

const loadRecoveryPublicModule = () => {
  recoveryPublicModulePromise ??= import('../api/accountDeletionRecoveryPublic');
  return recoveryPublicModulePromise;
};

const productionRuntime: AccountDeletionRecoveryRuntime = {
  getRecoveryInfo: async (token) => {
    const { getAccountDeletionRecoveryInfo } = await loadRecoveryPublicModule();
    return getAccountDeletionRecoveryInfo(token);
  },
  requestRecovery: async (token) => {
    const { requestAccountDeletionRecovery } = await loadRecoveryPublicModule();
    await requestAccountDeletionRecovery(token);
  },
};

const formatSchedule = (value?: string) => {
  if (!value) {
    return '삭제 예정 시각 정보를 확인할 수 없습니다.';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AccountDeletionRecovery({
  tokenOverride,
  redirectPathOverride,
  initialStateOverride,
  runtimeOverride,
}: AccountDeletionRecoveryProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = tokenOverride ?? searchParams.get('token') ?? '';
  const redirectPath = redirectPathOverride
    ?? searchParams.get('redirect')
    ?? getStoredLoginRedirect()
    ?? ACCOUNT_SETTINGS_REDIRECT_PATH;
  const loginPath = buildLoginPath(redirectPath);
  const runtime = runtimeOverride ?? productionRuntime;
  const navigateTo = runtime.navigate ?? navigate;
  const [scheduledFor, setScheduledFor] = useState(initialStateOverride?.scheduledFor ?? '');
  const [canRecover, setCanRecover] = useState(initialStateOverride?.canRecover ?? false);
  const [isLoading, setIsLoading] = useState(initialStateOverride?.isLoading ?? true);
  const [isRecovering, setIsRecovering] = useState(initialStateOverride?.isRecovering ?? false);
  const [isRecovered, setIsRecovered] = useState(initialStateOverride?.isRecovered ?? false);
  const [error, setError] = useState(initialStateOverride?.error ?? '');

  useEffect(() => {
    if (initialStateOverride) return;
    let cancelled = false;

    const loadRecoveryInfo = async () => {
      if (!token) {
        setError('유효하지 않거나 만료된 복구 링크입니다.');
        setIsLoading(false);
        return;
      }

      try {
        const info = await runtime.getRecoveryInfo(token);
        if (!cancelled) {
          setScheduledFor(info.scheduledFor);
          setCanRecover(true);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '계정 복구 정보를 확인하지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadRecoveryInfo();
    return () => {
      cancelled = true;
    };
  }, [initialStateOverride, runtime, token]);

  const handleRecover = async () => {
    if (!token) {
      setError('유효하지 않거나 만료된 복구 링크입니다.');
      return;
    }

    setIsRecovering(true);
    setError('');

    try {
      await runtime.requestRecovery(token);
      setIsRecovered(true);
    } catch (recoverError) {
      setError(recoverError instanceof Error ? recoverError.message : '계정 복구에 실패했습니다.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <AuthLayout>
      <button
        type="button"
        onClick={() => navigateTo(loginPath)}
        className="auth-back-link min-h-11"
        data-testid="account-recovery-back-link"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        <span>로그인 화면으로</span>
      </button>

      {isRecovered ? (
        <>
          <AuthHeader
            title="계정 복구 완료"
            description="탈퇴 예약이 취소되었습니다. 이제 기존 계정으로 다시 로그인할 수 있습니다."
            data-testid="account-recovery-header"
          />

          <div
            className="min-w-0 space-y-6 text-center"
            data-testid="account-recovery-complete-panel"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white">
              <CheckCircleIcon className="h-10 w-10" />
            </div>

            <AuthActionGroup>
              <Button
                type="button"
                variant="brand"
                size="touchLg"
                className="w-full"
                onClick={() => navigateTo(loginPath)}
                data-testid="account-recovery-login"
              >
                로그인하기
              </Button>
            </AuthActionGroup>
          </div>
        </>
      ) : (
        <>
          <AuthHeader
            title="탈퇴 예약 취소"
            description="메일로 받은 링크를 통해 들어오셨다면 아래에서 탈퇴 예약을 취소하고 계정을 다시 사용할 수 있습니다."
            data-testid="account-recovery-header"
          />

          <div
            className="min-w-0 space-y-6"
            data-testid="account-recovery-panel"
            aria-busy={isLoading || isRecovering}
          >
            <div className="flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldAlertIcon className="h-7 w-7" />
              </div>
            </div>

            {isLoading ? (
              <AuthStatusPanel tone="default" data-testid="account-recovery-status-panel" role="status">
                <p className="min-w-0 break-words text-body font-semibold [overflow-wrap:anywhere]">
                  복구 가능 여부를 확인하고 있습니다.
                </p>
              </AuthStatusPanel>
            ) : error && !canRecover ? (
              <AuthStatusPanel tone="error" data-testid="account-recovery-status-panel" role="alert">
                <p className="min-w-0 break-words text-body font-semibold [overflow-wrap:anywhere]">
                  {error}
                </p>
              </AuthStatusPanel>
            ) : (
              <>
                {error && canRecover ? (
                  <AuthStatusPanel tone="error" data-testid="account-recovery-status-panel" role="alert">
                    <p className="min-w-0 break-words text-body font-semibold [overflow-wrap:anywhere]">
                      {error}
                    </p>
                  </AuthStatusPanel>
                ) : null}

                <AuthStatusPanel
                  tone="default"
                  role="status"
                  data-testid="account-recovery-schedule-panel"
                >
                  <div className="min-w-0 space-y-2 break-words text-body [overflow-wrap:anywhere]">
                    <p className="font-semibold text-foreground">최종 삭제 예정 시각</p>
                    <p>{formatSchedule(scheduledFor)}</p>
                    <p className="auth-helper-text">이 시각 전까지 예약을 취소할 수 있으며, 취소가 끝나면 다시 로그인할 수 있습니다.</p>
                  </div>
                </AuthStatusPanel>

                <AuthActionGroup>
                  <Button
                    type="button"
                    variant="brand"
                    size="touchLg"
                    className="w-full"
                    onClick={handleRecover}
                    disabled={isRecovering}
                    data-testid="account-recovery-submit"
                  >
                    {isRecovering ? '탈퇴 예약 취소 중...' : '탈퇴 예약 취소하기'}
                  </Button>
                </AuthActionGroup>
              </>
            )}
          </div>
        </>
      )}
    </AuthLayout>
  );
}
