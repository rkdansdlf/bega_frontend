import type { QueryClient } from '@tanstack/react-query';

import type { PaginatedResponse } from '../api/mate';
import type { Application, CheckIn, MatePartySeed, Party } from '../types/mate';
import { normalizeMatePartySeed } from '../utils/mate';
import { MATE_KEYS } from './mateQueryKeys';
import type {
  InvalidateMatePartyQueriesOptions,
  MatePartyApplicationUpdater,
  MatePartyApplicationsUpdater,
  MatePartyCollectionsRemoveOptions,
  MatePartyCollectionsUpdateOptions,
  MatePartyUpdater,
} from './mateQueryCacheContracts';
import {
  appendMatePartyCheckIns,
  extractMatePartyListParams,
  updateMatePartyApplicationsArray,
  updateMatePartyArray,
  updateMatePartyListResponse,
} from './internal/mateQueryCacheUtils';
import {
  getViewerQueryScope,
  isViewerQueryScopeCurrent,
  matchesViewerQueryScope,
} from '../utils/viewerQueryScope';
import type { ViewerQueryScope } from '../utils/viewerQueryScope';

const settleMateQueryInvalidations = (tasks: Array<Promise<unknown>>) =>
  Promise.allSettled(tasks);

export const invalidateMateCollectionQueries = (
  queryClient: QueryClient,
) => settleMateQueryInvalidations([
  queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyLists() }),
  queryClient.invalidateQueries({ queryKey: MATE_KEYS.myParties() }),
  queryClient.invalidateQueries({ queryKey: MATE_KEYS.myPartyHistories() }),
]);

export const invalidateMatePartyQueries = (
  queryClient: QueryClient,
  partyId: number | string,
  options: InvalidateMatePartyQueriesOptions = {},
  scope: ViewerQueryScope = getViewerQueryScope(),
) => {
  const {
    includeParty = true,
    includeApplications = false,
    includeMyApplications = false,
    includeCheckIns = false,
    includeMessages = false,
    includeReviews = false,
    includeCollections = false,
    userId,
  } = options;

  const tasks: Array<Promise<unknown>> = [];

  if (includeParty) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.party(partyId, scope) }));
  }

  if (includeApplications) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyApplications(partyId, scope) }));
  }

  if (includeMyApplications) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyMyApplications(partyId, scope) }));
  } else if (userId !== undefined && userId !== null) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyMyApplication(partyId, userId, scope) }));
  }

  if (includeCheckIns) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyCheckIns(partyId, scope) }));
  }

  if (includeMessages) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyMessages(partyId) }));
  }

  if (includeReviews) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyReviews(partyId) }));
  }

  if (includeCollections) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyLists() }),
      queryClient.invalidateQueries({ queryKey: MATE_KEYS.myParties() }),
      queryClient.invalidateQueries({ queryKey: MATE_KEYS.myPartyHistories() }),
    );
  }

  return settleMateQueryInvalidations(tasks);
};

export const setMatePartyDetailQueryData = (
  queryClient: QueryClient,
  party: Party,
  scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  if (!isViewerQueryScopeCurrent(scope)) return;
  queryClient.setQueryData<Party>(MATE_KEYS.party(party.id, scope), party);
};

export const updateMatePartyCollectionQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  updater: MatePartyUpdater,
  options: MatePartyCollectionsUpdateOptions = {},
  scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  if (!isViewerQueryScopeCurrent(scope)) return;
  const {
    includeParty = true,
    includePartyLists = true,
    includeMyParties = true,
  } = options;

  if (includeParty) {
    queryClient.setQueryData<Party | undefined>(
      MATE_KEYS.party(partyId, scope),
      (current) => (current ? updater(current) ?? undefined : current),
    );
  }

  if (includePartyLists) {
    queryClient
      .getQueriesData<PaginatedResponse<Party>>({ queryKey: MATE_KEYS.partyLists() })
      .forEach(([queryKey, current]) => {
        if (!current || !Array.isArray(queryKey) || !matchesViewerQueryScope(queryKey, scope)) {
          return;
        }

        const params = extractMatePartyListParams(queryKey);
        if (!params) {
          return;
        }

        queryClient.setQueryData<PaginatedResponse<Party>>(
          queryKey,
          (response) => (response ? updateMatePartyListResponse(response, params, partyId, updater) : response),
        );
      });
  }

  if (includeMyParties) {
    if (scope.viewerId !== null) {
      const myPartiesKey = MATE_KEYS.myParties(scope.viewerId, scope);
      queryClient.setQueryData<Party[]>(
        myPartiesKey,
        (parties) => (parties ? updateMatePartyArray(parties, partyId, updater) : parties),
      );
      void queryClient.invalidateQueries({
        queryKey: MATE_KEYS.myPartyHistory(scope.viewerId, {}, scope),
      });
    }
  }
};

export const syncMatePartyQueryData = (
  queryClient: QueryClient,
  party: Party,
  options: MatePartyCollectionsUpdateOptions = {},
  scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  setMatePartyDetailQueryData(queryClient, party, scope);
  updateMatePartyCollectionQueryData(queryClient, party.id, () => party, {
    ...options,
    includeParty: false,
  }, scope);
};

export const removeMatePartyFromCollections = (
  queryClient: QueryClient,
  partyId: number | string,
  options: MatePartyCollectionsRemoveOptions = {},
  scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  updateMatePartyCollectionQueryData(queryClient, partyId, () => null, {
    includeParty: false,
    includePartyLists: options.includePartyLists,
    includeMyParties: options.includeMyParties,
  }, scope);
};

export const updateMatePartyApplicationsQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  updater: MatePartyApplicationsUpdater,
  scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  if (!isViewerQueryScopeCurrent(scope)) return;
  queryClient.setQueryData<Application[] | undefined>(
    MATE_KEYS.partyApplications(partyId, scope),
    (current) => (current ? updater(current) : current),
  );
};

export const updateMatePartyApplicationQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  applicationId: number | string,
  updater: MatePartyApplicationUpdater,
  scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  updateMatePartyApplicationsQueryData(
    queryClient,
    partyId,
    (applications) => updateMatePartyApplicationsArray(applications, applicationId, updater),
    scope,
  );
};

export const setMatePartyMyApplicationQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  userId: number | null | undefined,
  application: Application | null,
  scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  if (!isViewerQueryScopeCurrent(scope)) return;
  queryClient.setQueryData<Application | null>(
    MATE_KEYS.partyMyApplication(partyId, userId, scope),
    application,
  );
};

export const appendMatePartyCheckInQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  checkIn: CheckIn,
  scope: ViewerQueryScope = getViewerQueryScope(),
): CheckIn[] => {
  if (!isViewerQueryScopeCurrent(scope)) return [];
  queryClient.setQueryData<CheckIn[]>(
    MATE_KEYS.partyCheckIns(partyId, scope),
    (current) => {
      const existing = current ?? [];
      return appendMatePartyCheckIns(existing, checkIn);
    },
  );

  return queryClient.getQueryData<CheckIn[]>(MATE_KEYS.partyCheckIns(partyId, scope)) ?? [];
};

export const removeMatePartyQueries = (
  queryClient: QueryClient,
  partyId: number | string,
  _scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  const normalizedPartyId = typeof partyId === 'number' ? partyId : partyId.trim();
  queryClient.removeQueries({ queryKey: [...MATE_KEYS.parties(), normalizedPartyId] });
};

export const seedMatePartyQueryData = (
  queryClient: QueryClient,
  partySeed: MatePartySeed,
  scope: ViewerQueryScope = getViewerQueryScope(),
): void => {
  if (!isViewerQueryScopeCurrent(scope)) return;
  const placeholderParty = normalizeMatePartySeed(partySeed);
  if (!placeholderParty) {
    return;
  }

  queryClient.setQueryData<Party | undefined>(
    MATE_KEYS.party(placeholderParty.id, scope),
    (current) => current ?? placeholderParty,
  );
};
