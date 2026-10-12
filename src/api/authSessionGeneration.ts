let currentSessionGeneration = 0;
let expiredSessionGeneration: number | null = null;
let sessionEpoch = 0;
let operationRevision = 0;
let logoutIntent: number | null = null;
let logoutCompletion: Promise<boolean> | null = null;

export const getAuthLogoutCompletion = () => logoutCompletion;
export const trackAuthLogout = (completion: Promise<boolean>): void => {
  logoutCompletion = completion;
  void completion.then(() => {
    if (logoutCompletion === completion) logoutCompletion = null;
  });
};

export class AuthOperationSupersededError extends Error {
  constructor() { super('Authentication operation superseded or pending'); }
}
export class AuthRequestNotDispatchedError extends Error {}

export const getAuthSessionEpoch = (): number => sessionEpoch;
export const getAuthOperationRevision = (): number => operationRevision;
export const isAuthLogoutPending = (): boolean => logoutIntent !== null;
export const assertAuthOperationCurrent = (revision: number): void => {
  if (revision !== operationRevision || isAuthLogoutPending()) throw new AuthOperationSupersededError();
};
export const beginAuthLogout = (): number => {
  logoutIntent = ++operationRevision;
  return logoutIntent;
};
export const finishAuthLogout = (intent: number): void => {
  if (logoutIntent === intent) logoutIntent = null;
};

export const markAuthSessionRefreshed = (): void => {
  currentSessionGeneration += 1;
  expiredSessionGeneration = null;
};

/**
 * Starts a fresh authenticated session generation. Late failures from a prior
 * generation remain deduplicated while the new session can report its own
 * expiry exactly once.
 */
export const markAuthSessionEstablished = (): void => {
  sessionEpoch += 1;
  operationRevision += 1;
  logoutIntent = null;
  markAuthSessionRefreshed();
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
