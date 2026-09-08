import { lazy, Suspense, type ReactNode, useEffect } from 'react';

import {
  useAuthAccessActions,
  useAuthDialogState,
  useAuthProfileSnapshot,
  useAuthRedirectState,
} from '../store/authStore';
import { handleAuthSessionExpiredEvent } from '../utils/authSessionEvents';

const LoginRequiredDialog = lazy(() =>
  import('./LoginRequiredDialog').then((module) => ({
    default: module.LoginRequiredDialog,
  }))
);

type AuthSessionBoundaryState = {
  pendingLoginRedirect?: string | null;
  showLoginRequiredDialog: boolean;
};

type AuthSessionBoundaryProps = {
  children: ReactNode;
  stateOverride?: AuthSessionBoundaryState;
};

export default function AuthSessionBoundary({
  children,
  stateOverride,
}: AuthSessionBoundaryProps) {
  const { userId } = useAuthProfileSnapshot();
  const { logout, requireLogin } = useAuthAccessActions();
  const { showLoginRequiredDialog, setShowLoginRequiredDialog } = useAuthDialogState();
  const { pendingLoginRedirect, clearPendingLoginRedirect } = useAuthRedirectState();
  const usesStateOverride = import.meta.env.DEV && stateOverride !== undefined;
  const boundaryState = usesStateOverride
    ? stateOverride
    : { pendingLoginRedirect, showLoginRequiredDialog };

  useEffect(() => {
    let cancelled = false;

    void import('../utils/clientErrorReporter').then(({ setClientErrorReporterUserContext }) => {
      if (!cancelled) {
        setClientErrorReporterUserContext({ userId });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      handleAuthSessionExpiredEvent(event, { logout, requireLogin });
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth-session-expired', handleSessionExpired);
  }, [logout, requireLogin]);

  useEffect(() => {
    const handleInvalidAuthor = (event: Event) => {
      const detail = (event as CustomEvent<{ responseCode?: string } | undefined>).detail;
      if (detail?.responseCode === 'INVALID_AUTHOR') {
        requireLogin();
      }
    };

    window.addEventListener('global-api-error', handleInvalidAuthor);
    return () => window.removeEventListener('global-api-error', handleInvalidAuthor);
  }, [requireLogin]);

  return (
    <>
      {children}
      {boundaryState.showLoginRequiredDialog && (
        <Suspense fallback={null}>
          <LoginRequiredDialog
            open={boundaryState.showLoginRequiredDialog}
            onOpenChange={(open) => {
              if (usesStateOverride) {
                return;
              }
              if (!open) {
                clearPendingLoginRedirect();
              }
              setShowLoginRequiredDialog(open);
            }}
            onCancel={usesStateOverride ? () => undefined : clearPendingLoginRedirect}
            redirectPath={boundaryState.pendingLoginRedirect}
          />
        </Suspense>
      )}
    </>
  );
}
