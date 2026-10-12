import type { TicketInfo } from '../api/ticket';
import { getViewerScopedStorageKey, type ViewerId } from './viewerScopedDraftStorage';

const MATE_APPLY_DRAFT_PREFIX = 'mateApplyDraft:';

export interface MateApplyDraft {
  partyId: string;
  message: string;
  ticketVerified: boolean;
  ticketInfo: TicketInfo | null;
  updatedAt: string;
}

const normalizePartyId = (partyId: string): string => partyId.trim();

const hasDraftContent = (draft: {
  message: string;
  ticketVerified: boolean;
  ticketInfo: TicketInfo | null;
}): boolean => (
  Boolean(draft.message.trim())
  || draft.ticketVerified
  || draft.ticketInfo !== null
);

export const getMateApplyDraftStorageKey = (partyId: string, viewerId: ViewerId): string | null => {
  const normalizedPartyId = normalizePartyId(partyId);
  if (!normalizedPartyId) return null;
  return getViewerScopedStorageKey(`${MATE_APPLY_DRAFT_PREFIX}${normalizedPartyId}`, viewerId);
};

export const loadMateApplyDraft = (partyId: string, viewerId: ViewerId): MateApplyDraft | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const normalizedPartyId = normalizePartyId(partyId);
  if (!normalizedPartyId) {
    return null;
  }

  const storageKey = getMateApplyDraftStorageKey(normalizedPartyId, viewerId);
  if (!storageKey) return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MateApplyDraft>;
    if (parsed?.partyId !== normalizedPartyId) {
      return null;
    }

    return {
      partyId: normalizedPartyId,
      message: typeof parsed.message === 'string' ? parsed.message : '',
      ticketVerified: parsed.ticketVerified === true,
      ticketInfo: parsed.ticketInfo ?? null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
};

export const saveMateApplyDraft = (
  partyId: string,
  viewerId: ViewerId,
  draft: Pick<MateApplyDraft, 'message' | 'ticketVerified' | 'ticketInfo'>,
): MateApplyDraft | null => {
  const normalizedPartyId = normalizePartyId(partyId);
  const storageKey = getMateApplyDraftStorageKey(normalizedPartyId, viewerId);
  if (!normalizedPartyId || !storageKey) {
    return null;
  }

  if (typeof window === 'undefined') {
    return {
      partyId: normalizedPartyId,
      message: draft.message,
      ticketVerified: draft.ticketVerified,
      ticketInfo: draft.ticketInfo,
      updatedAt: new Date().toISOString(),
    };
  }

  if (!hasDraftContent(draft)) {
    clearMateApplyDraft(normalizedPartyId, viewerId);
    return null;
  }

  const payload: MateApplyDraft = {
    partyId: normalizedPartyId,
    message: draft.message,
    ticketVerified: draft.ticketVerified,
    ticketInfo: draft.ticketInfo,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify(payload),
    );
  } catch {
    return payload;
  }

  return payload;
};

export const clearMateApplyDraft = (partyId: string, viewerId: ViewerId): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedPartyId = normalizePartyId(partyId);
  if (!normalizedPartyId) {
    return;
  }

  const storageKey = getMateApplyDraftStorageKey(normalizedPartyId, viewerId);
  if (!storageKey) return;

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore storage failures and continue without draft persistence.
  }
};
