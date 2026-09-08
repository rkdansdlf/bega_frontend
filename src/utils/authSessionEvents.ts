interface AuthSessionExpiredActions {
  logout: (skipServerLogout?: boolean) => void;
  requireLogin: () => void;
}

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
