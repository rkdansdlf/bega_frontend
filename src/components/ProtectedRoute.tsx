import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { useAuthAccessActions, useAuthProfileActions, useAuthSession } from '../store/authStore';
import { hasPersistedAuthBootstrapHint } from '../utils/authBootstrap';
import { traceAuthEvent } from '../utils/authTrace';

type ProtectedRouteState = {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  shouldAttemptBootstrap: boolean;
};

type ProtectedRouteProps = {
  outletOverride?: ReactNode;
  spinnerMinDurationMs?: number;
  stateOverride?: ProtectedRouteState;
};

export const resolveProtectedRoutePresentation = ({
  isAuthLoading,
  isLoggedIn,
  shouldAttemptBootstrap,
}: ProtectedRouteState): 'loading' | 'login-required' | 'outlet' => {
  if ((isAuthLoading || shouldAttemptBootstrap) && !isLoggedIn) {
    return 'loading';
  }
  return isLoggedIn ? 'outlet' : 'login-required';
};

export default function ProtectedRoute({
  outletOverride,
  spinnerMinDurationMs,
  stateOverride,
}: ProtectedRouteProps = {}) {
  const session = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const { fetchProfileAndAuthenticate } = useAuthProfileActions();
  const location = useLocation();
  const isLoggedIn = stateOverride?.isLoggedIn ?? session.isLoggedIn;
  const isAuthLoading = stateOverride?.isAuthLoading ?? session.isAuthLoading;
  const shouldAttemptBootstrap = stateOverride?.shouldAttemptBootstrap
    ?? (!isLoggedIn && hasPersistedAuthBootstrapHint());
  const presentation = resolveProtectedRoutePresentation({
    isAuthLoading,
    isLoggedIn,
    shouldAttemptBootstrap,
  });

  useEffect(() => {
    if (stateOverride !== undefined) {
      return;
    }
    traceAuthEvent(`ProtectedRoute: pathname=${location.pathname}, isAuthLoading=${isAuthLoading}, isLoggedIn=${isLoggedIn}`);

    if (isAuthLoading || isLoggedIn) {
      return;
    }

    if (hasPersistedAuthBootstrapHint()) {
      traceAuthEvent(`ProtectedRoute: bootstrap retry for ${location.pathname}`);
      void fetchProfileAndAuthenticate();
      return;
    }

    if (!isLoggedIn) {
      traceAuthEvent(`ProtectedRoute: requireLogin triggered for ${location.pathname}`);
      requireLogin(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [fetchProfileAndAuthenticate, isAuthLoading, isLoggedIn, location.hash, location.pathname, location.search, requireLogin, stateOverride]);

  if (presentation === 'loading') {
    traceAuthEvent(`ProtectedRoute: show loading for ${location.pathname}`);
    return (
      <LoadingSpinner
        variant="auth"
        message="인증 상태를 확인하고 있습니다."
        subMessage="잠시만 기다려주세요."
        minDurationMs={spinnerMinDurationMs ?? 250}
        className="transition-colors duration-200"
      />
    );
  }

  if (presentation === 'login-required') {
    return <div className="min-h-screen bg-background transition-colors duration-200" data-testid="protected-route-login-required" />;
  }

  return outletOverride !== undefined ? outletOverride : <Outlet />;
}
