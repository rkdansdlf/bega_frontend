let currentSessionGeneration = 0;
let expiredSessionGeneration: number | null = null;

/**
 * Starts a fresh authenticated session generation. Late failures from a prior
 * generation remain deduplicated while the new session can report its own
 * expiry exactly once.
 */
export const markAuthSessionEstablished = (): void => {
  currentSessionGeneration += 1;
  expiredSessionGeneration = null;
};

export const getAuthSessionGeneration = (): number => currentSessionGeneration;

/** Claims the expiry notification slot for the current session generation. */
export const claimAuthSessionExpiry = (generation = currentSessionGeneration): boolean => {
  if (generation !== currentSessionGeneration) {
    return false;
  }

  if (expiredSessionGeneration === currentSessionGeneration) {
    return false;
  }

  expiredSessionGeneration = currentSessionGeneration;
  return true;
};
