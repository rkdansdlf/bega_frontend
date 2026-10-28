export type RecoveryWindow = Window & { __begaRecoveryToken?: string; __begaRecoveryTokenGeneration?: object; __begaRecoveryNavigationEpoch?: number };

export const withoutRecoveryToken = (path: string, search: string, hash = ''): string => {
  let decodedPath: string;
  try { decodedPath = decodeURIComponent(path); } catch { decodedPath = path; }
  if (!/^\/(?:api\/auth\/)?account\/deletion\/recovery(?:\/info)?\/*$/i.test(decodedPath)) {
    return `${path}${search}${hash}`;
  }
  const params = new URLSearchParams(search);
  params.delete('token');
  const remaining = params.toString();
  const fragment = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  let safeHash = hash;
  if (fragment.has('token')) {
    fragment.delete('token');
    const remainingFragment = fragment.toString();
    safeHash = remainingFragment ? `#${remainingFragment}` : '';
  }
  return `${path}${remaining ? `?${remaining}` : ''}${safeHash}`;
};

export const redactQueryTokens = (text: string): string =>
  text.replace(/([?#&]token=)[^&#\s"'<>]*/gi, '$1[redacted]')
    .replace(/("token"\s*:\s*)"(?:\\.|[^"\\])*"/gi, '$1"[redacted]"');

export const peekInitialRecoveryToken = (): string | null =>
  typeof window === 'undefined' ? null : (window as RecoveryWindow).__begaRecoveryToken ?? null;
