export type OAuthEmailChallengeReason =
  | 'oauth2_email_required'
  | 'oauth2_email_verification_required';

export interface OAuthEmailChallengeEntry {
  challengeId: string;
  reason: OAuthEmailChallengeReason;
}

const OAUTH_EMAIL_CHALLENGE_REASONS = new Set<OAuthEmailChallengeReason>([
  'oauth2_email_required',
  'oauth2_email_verification_required',
]);

export const getOAuthEmailChallengeEntry = (
  search: string,
): OAuthEmailChallengeEntry | null => {
  const params = new URLSearchParams(search);
  const reason = params.get('error');
  const challengeId = params.get('challengeId')?.trim();

  if (
    !challengeId
    || !reason
    || !OAUTH_EMAIL_CHALLENGE_REASONS.has(reason as OAuthEmailChallengeReason)
  ) {
    return null;
  }

  return {
    challengeId,
    reason: reason as OAuthEmailChallengeReason,
  };
};

export const getOAuthEmailChallengeToken = (search: string): string | null => {
  const token = new URLSearchParams(search).get('token')?.trim();
  return token || null;
};

export const removeOAuthEmailChallengeTokenFromSearch = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete('token');
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};

export const confirmOAuthEmailChallengeFromSearch = async <T>(
  search: string,
  replaceSearch: (nextSearch: string) => void,
  confirm: (token: string) => Promise<T>,
): Promise<T> => {
  const token = getOAuthEmailChallengeToken(search);
  if (!token) {
    throw new Error('이메일 확인 토큰이 없습니다.');
  }

  replaceSearch(removeOAuthEmailChallengeTokenFromSearch(search));
  return confirm(token);
};
