import type { MateHistoryTab, MatePartySortBy, MatePartySortDir, PartyStatus } from '../types/mate';
import { getViewerQueryScope, viewerScopedQueryKey } from '../utils/viewerQueryScope';
import type { ViewerQueryScope } from '../utils/viewerQueryScope';

export interface MatePartyListKeyParams {
  teamId?: string;
  stadium?: string;
  page?: number;
  size?: number;
  status?: PartyStatus | 'all';
  searchQuery?: string;
  gameDate?: string;
  sortBy?: MatePartySortBy;
  sortDir?: MatePartySortDir;
}

export interface MateHistoryKeyParams {
  group?: MateHistoryTab;
  size?: number;
}

const mateAllKey = ['mate'] as const;
const matePartiesKey = [...mateAllKey, 'parties'] as const;
const mateMyPartiesKey = [...mateAllKey, 'my-parties'] as const;
const mateMyPartyHistoryKey = [...mateAllKey, 'my-party-history'] as const;
const mateSearchTermsKey = [...mateAllKey, 'search-terms'] as const;

const normalizePartyId = (partyId: number | string) =>
  typeof partyId === 'number' ? partyId : partyId.trim();

const matePartyBase = (partyId: number | string) => [...MATE_KEYS.parties(), normalizePartyId(partyId)] as const;

const normalizeUserKey = (userId: number | null | undefined) =>
  typeof userId === 'number' && Number.isFinite(userId) ? userId : 'guest';

const normalizeOptionalText = (value?: string) => value?.trim() || 'all';

const normalizePageValue = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizePartyListKey = (params: MatePartyListKeyParams) => ({
  teamId: normalizeOptionalText(params.teamId),
  stadium: normalizeOptionalText(params.stadium),
  page: normalizePageValue(params.page, 0),
  size: normalizePageValue(params.size, 9),
  status: params.status ?? 'all',
  searchQuery: normalizeOptionalText(params.searchQuery),
  gameDate: normalizeOptionalText(params.gameDate),
  sortBy: params.sortBy ?? 'createdAt',
  sortDir: params.sortDir ?? 'desc',
});

const normalizeMateHistoryKey = (params: MateHistoryKeyParams) => ({
  group: params.group ?? 'all',
  size: normalizePageValue(params.size, 20),
});

export const MATE_KEYS = {
  all: mateAllKey,
  parties: () => matePartiesKey,
  partyLists: () => [...matePartiesKey, 'list'] as const,
  partyList: (
    params: MatePartyListKeyParams,
    scope: ViewerQueryScope = getViewerQueryScope(),
  ) => viewerScopedQueryKey([...MATE_KEYS.partyLists(), normalizePartyListKey(params)], scope),
  party: (
    partyId: number | string,
    scope: ViewerQueryScope = getViewerQueryScope(),
  ) => viewerScopedQueryKey(matePartyBase(partyId), scope),
  partyReviews: (partyId: number | string) => [...matePartyBase(partyId), 'reviews'] as const,
  partyApplications: (partyId: number | string, scope: ViewerQueryScope = getViewerQueryScope()) =>
    [...MATE_KEYS.party(partyId, scope), 'applications'] as const,
  partyMyApplications: (partyId: number | string, scope: ViewerQueryScope = getViewerQueryScope()) =>
    [...MATE_KEYS.party(partyId, scope), 'my-application'] as const,
  partyMyApplication: (
    partyId: number | string,
    userId?: number | null,
    scope: ViewerQueryScope = getViewerQueryScope(),
  ) => [...MATE_KEYS.partyMyApplications(partyId, scope), normalizeUserKey(userId)] as const,
  partyMessages: (partyId: number | string) => [...matePartyBase(partyId), 'messages'] as const,
  partyCheckIns: (partyId: number | string, scope: ViewerQueryScope = getViewerQueryScope()) =>
    [...MATE_KEYS.party(partyId, scope), 'check-ins'] as const,
  myParties: (userId?: number | null, scope?: ViewerQueryScope) =>
    userId === undefined
      ? mateMyPartiesKey
      : viewerScopedQueryKey(
        [...mateMyPartiesKey, normalizeUserKey(userId)],
        scope ?? getViewerQueryScope(),
      ),
  myPartyHistories: () => mateMyPartyHistoryKey,
  myPartyHistory: (
    userId?: number | null,
    params: MateHistoryKeyParams = {},
    scope?: ViewerQueryScope,
  ) => viewerScopedQueryKey(
    [...MATE_KEYS.myPartyHistories(), normalizeUserKey(userId), normalizeMateHistoryKey(params)],
    scope ?? getViewerQueryScope(),
  ),
  popularSearchTerms: (limit = 5) =>
    [...mateSearchTermsKey, 'popular', normalizePageValue(limit, 5)] as const,
} as const;
