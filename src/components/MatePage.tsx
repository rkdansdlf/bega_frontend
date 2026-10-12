import { lazy, Suspense, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { buildLoginPath } from '../utils/loginRedirect';
import { Button } from './ui/button';

const MateRuntime = lazy(() => import('./Mate'));
const MateGuestSampleList = lazy(() => import('./MateGuestSampleList'));
const AppQueryProvider = lazy(() => import('./AppQueryProvider'));

const MateFallback = () => (
  <div
    className="min-h-screen bg-background py-8"
    data-testid="mate-page-route-loading"
  >
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-body text-muted-foreground shadow-surface">
        메이트 목록을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

function MateLoggedOutEntry() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section
          data-testid="mate-logged-out-entry"
          className="w-full rounded-xl border border-border bg-card px-5 py-8 text-center shadow-surface sm:px-8 sm:py-10"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-black" aria-hidden="true">M</span>
          </div>
          <p className="mb-2 text-13 font-semibold leading-snug text-muted-foreground">
            Mate Flow
          </p>
          <h1
            className="text-2xl font-black tracking-tight text-foreground sm:text-3xl"
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
          >
            로그인하고 직관 메이트를 찾아보세요
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-body font-bold leading-relaxed text-muted-foreground">
            경기 날짜, 좌석, 팀 기준으로 파티를 찾고 신청하려면 계정 확인이 필요합니다.
          </p>
          <Suspense fallback={null}>
            <MateGuestSampleList />
          </Suspense>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              data-testid="mate-login-cta"
              size="touchLg"
              onClick={() => navigate(buildLoginPath('/mate'))}
              variant="brand"
              className="w-full font-black sm:w-auto"
            >
              로그인하고 같이가요 시작
            </Button>
            <Button
              size="touchLg"
              onClick={() => navigate('/home')}
              variant="brandOutline"
              className="w-full font-bold sm:w-auto"
            >
              홈에서 경기 보기
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export type MatePageVisualQaStateOverride = Partial<ReturnType<typeof useAuthBootstrapUiState>>;

export type MatePageProps = {
  visualQaStateOverride?: MatePageVisualQaStateOverride;
  runtimeOverride?: ReactNode;
};

export default function MatePage({ visualQaStateOverride, runtimeOverride }: MatePageProps = {}) {
  const authState = useAuthBootstrapUiState();
  const {
    authBootstrapMode,
    isAuthBootstrapPending,
    isAuthLoading,
    isLoggedIn,
  } = import.meta.env.PROD
    ? authState
    : { ...authState, ...visualQaStateOverride };
  const shouldShowAuthLoading = !isLoggedIn
    && authBootstrapMode !== 'public-home'
    && authBootstrapMode !== 'skip'
    && (isAuthLoading || isAuthBootstrapPending);

  if (shouldShowAuthLoading) {
    return <MateFallback />;
  }

  if (!isLoggedIn) {
    return <MateLoggedOutEntry />;
  }

  return (
    <Suspense fallback={<MateFallback />}>
      <AppQueryProvider>
        {runtimeOverride !== undefined ? runtimeOverride : <MateRuntime />}
      </AppQueryProvider>
    </Suspense>
  );
}
