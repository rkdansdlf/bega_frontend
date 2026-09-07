import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { useAuthRedirectState } from '../store/authStore';
import { resolvePostLoginRedirect } from '../utils/loginRedirect';
import type { AuthBootstrapMode } from '../utils/authBootstrap';
import LoadingSpinner from './LoadingSpinner';

type PublicOnlyAuthRouteState = {
  authBootstrapMode: AuthBootstrapMode;
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  pendingLoginRedirect?: string | null;
};

type PublicOnlyAuthRouteProps = {
  authStateOverride?: PublicOnlyAuthRouteState;
  outletOverride?: ReactNode;
  spinnerMinDurationMs?: number;
};

type PublicOnlyAuthRouteOutcome = {
  presentation: 'loading' | 'outlet';
  redirectTarget?: string;
};

export const resolvePublicOnlyAuthRouteOutcome = ({
  authBootstrapMode,
  isAuthLoading,
  isLoggedIn,
  redirectTarget,
  shouldBypassAuthenticatedRedirect,
}: Omit<PublicOnlyAuthRouteState, 'pendingLoginRedirect'> & {
  redirectTarget: string;
  shouldBypassAuthenticatedRedirect: boolean;
}): PublicOnlyAuthRouteOutcome => {
  if (!shouldBypassAuthenticatedRedirect && !isAuthLoading && isLoggedIn) {
    return { presentation: 'loading', redirectTarget };
  }
  if ((isAuthLoading && authBootstrapMode === 'immediate')
    || (isLoggedIn && !shouldBypassAuthenticatedRedirect)) {
    return { presentation: 'loading' };
  }
  return { presentation: 'outlet' };
};

export default function PublicOnlyAuthRoute({
  authStateOverride,
  outletOverride,
  spinnerMinDurationMs,
}: PublicOnlyAuthRouteProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const authState = useAuthBootstrapUiState();
  const {
    pendingLoginRedirect: storedPendingLoginRedirect,
    clearPendingLoginRedirect,
  } = useAuthRedirectState();
  const authBootstrapMode = authStateOverride?.authBootstrapMode ?? authState.authBootstrapMode;
  const isAuthLoading = authStateOverride?.isAuthLoading ?? authState.isAuthLoading;
  const isLoggedIn = authStateOverride?.isLoggedIn ?? authState.isLoggedIn;
  const pendingLoginRedirect = authStateOverride === undefined
    ? storedPendingLoginRedirect
    : authStateOverride.pendingLoginRedirect;
  const searchParams = new URLSearchParams(location.search);
  const queryRedirect = searchParams.get('redirect');
  const shouldBypassAuthenticatedRedirect = location.pathname === '/login' && Boolean(searchParams.get('error'));
  const redirectTarget = resolvePostLoginRedirect(queryRedirect, pendingLoginRedirect);
  const outcome = resolvePublicOnlyAuthRouteOutcome({
    authBootstrapMode,
    isAuthLoading,
    isLoggedIn,
    redirectTarget,
    shouldBypassAuthenticatedRedirect,
  });

  useEffect(() => {
    if (outcome.redirectTarget === undefined) {
      return;
    }

    if (authStateOverride === undefined) {
      clearPendingLoginRedirect();
    }
    navigate(outcome.redirectTarget, { replace: true });
  }, [
    authStateOverride,
    clearPendingLoginRedirect,
    navigate,
    outcome.redirectTarget,
  ]);

  if (outcome.presentation === 'loading') {
    return (
      <LoadingSpinner
        variant="auth"
        message="로그인 상태를 확인하고 있습니다."
        subMessage="잠시만 기다려주세요."
        minDurationMs={spinnerMinDurationMs ?? 120}
      />
    );
  }

  return outletOverride !== undefined ? outletOverride : <Outlet />;
}
