import type { RecoveryWindow } from './accountRecoveryToken';

export const recoveryNavigationEpoch = (): number =>
  typeof window === 'undefined' ? 0 : (window as RecoveryWindow).__begaRecoveryNavigationEpoch ?? 0;

export const recoveryTokenGeneration = (): object | undefined =>
  typeof window === 'undefined' ? undefined : (window as RecoveryWindow).__begaRecoveryTokenGeneration;

export const stageFallbackRecoveryToken = (token: string): object => {
  const target = window as RecoveryWindow;
  const generation = {};
  target.__begaRecoveryToken = token;
  target.__begaRecoveryTokenGeneration = generation;
  const discard = () => { clearInitialRecoveryToken(generation); };
  window.addEventListener('pagehide', discard, { once: true });
  window.setTimeout(() => {
    window.removeEventListener('pagehide', discard);
    discard();
  }, 60_000);
  return generation;
};

export const clearInitialRecoveryToken = (expectedGeneration?: object): boolean => {
  if (typeof window !== 'undefined') {
    if (expectedGeneration && (window as RecoveryWindow).__begaRecoveryTokenGeneration !== expectedGeneration) return false;
    delete (window as RecoveryWindow).__begaRecoveryToken;
    delete (window as RecoveryWindow).__begaRecoveryTokenGeneration;
  }
  return true;
};
