import { isAuthLogoutPending } from '../api/authSessionGeneration';
import { useAuthStore } from '../store/authStore';
import { runSessionScopedQueryCleanup } from '../lib/queryClientRegistry';
import { setPersistedAuthBootstrapHint } from './authBootstrap';

export const refreshSessionFromSharedCookie = async (): Promise<boolean> => {
  if (isAuthLogoutPending()) {
    return false;
  }

  useAuthStore.getState().reset();
  runSessionScopedQueryCleanup();
  setPersistedAuthBootstrapHint(true);
  useAuthStore.setState({
    user: null,
    isAuthLoading: true,
    publicAuthBootstrapPhase: 'idle',
    showLoginRequiredDialog: false,
    pendingLoginRedirect: null,
  });

  return useAuthStore.getState().fetchProfileAndAuthenticate();
};
