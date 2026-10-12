interface AuthSessionExpiredActions {
  logout: (skipServerLogout?: boolean) => void;
  requireLogin: () => void;
}

export const AUTH_SESSION_CHANGED_STORAGE_KEY = 'bega-auth-session-changed';

type AuthSessionEventTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;
type AuthSessionSignalStorage = Pick<Storage, 'setItem'>;

export const publishAuthSessionChanged = (
  storage?: AuthSessionSignalStorage,
): void => {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    if (!target) {
      return;
    }
    const nonce = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
    target.setItem(AUTH_SESSION_CHANGED_STORAGE_KEY, nonce);
  } catch {
    // Cross-tab notification is best-effort; the current tab remains authoritative.
  }
};

export const subscribeToAuthSessionChanges = (
  onSessionChanged: () => void,
  eventTarget?: AuthSessionEventTarget,
): (() => void) => {
  const target = eventTarget ?? (typeof window === 'undefined' ? undefined : window);
  if (!target) {
    return () => undefined;
  }

  const handleStorage = (event: Event) => {
    const storageEvent = event as StorageEvent;
    if (storageEvent.key === AUTH_SESSION_CHANGED_STORAGE_KEY
      && storageEvent.newValue !== null
      && storageEvent.newValue !== storageEvent.oldValue) {
      onSessionChanged();
    }
  };

  target.addEventListener('storage', handleStorage);
  return () => target.removeEventListener('storage', handleStorage);
};

export const handleAuthSessionExpiredEvent = (
  event: Event,
  { logout, requireLogin }: AuthSessionExpiredActions,
): void => {
  const detail = (event as CustomEvent<Record<string, unknown> | undefined>).detail;
  if (detail) {
    console.warn('[auth] session expired', detail);
  }

  logout(true);
  requireLogin();
};
