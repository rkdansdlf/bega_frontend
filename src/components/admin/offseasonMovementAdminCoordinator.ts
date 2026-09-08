export type OffseasonMovementListFilters = {
  search?: string;
  section?: string;
  teamCode?: string;
  fromDate?: string;
  toDate?: string;
};

type NormalizedOffseasonMovementListFilters = {
  search?: string;
  section?: string;
  teamCode?: string;
  fromDate?: string;
  toDate?: string;
};

type ListCoordinatorCallbacks<T> = {
  onData: (data: T) => void;
  onError: (error: Error) => void;
  onLoading: (loading: boolean) => void;
};

type ListRequestOptions = {
  forceFresh?: boolean;
};

export type OffseasonMovementMutationContext = {
  isActive: () => boolean;
};

export const normalizeOffseasonMovementFilters = (
  filters: Readonly<OffseasonMovementListFilters>,
): NormalizedOffseasonMovementListFilters => {
  const search = filters.search?.trim();
  const section = filters.section?.trim();
  const teamCode = filters.teamCode?.trim().toUpperCase();
  const fromDate = filters.fromDate?.trim();
  const toDate = filters.toDate?.trim();

  return {
    ...(search ? { search } : {}),
    ...(section && section !== 'ALL' ? { section } : {}),
    ...(teamCode && teamCode !== 'ALL' ? { teamCode } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };
};

const createFilterKey = (filters: NormalizedOffseasonMovementListFilters) => JSON.stringify([
  filters.search ?? '',
  filters.section ?? '',
  filters.teamCode ?? '',
  filters.fromDate ?? '',
  filters.toDate ?? '',
]);

export const createOffseasonMovementListCoordinator = <T>({
  onData,
  onError,
  onLoading,
}: ListCoordinatorCallbacks<T>) => {
  const inFlight = new Map<string, Promise<T>>();
  let active = false;
  let latestRevision = 0;
  let loading = false;

  const setLoading = (next: boolean, force = false) => {
    if (!force && loading === next) return;
    loading = next;
    onLoading(next);
  };

  return {
    activate() {
      active = true;
    },
    deactivate() {
      active = false;
      latestRevision += 1;
      setLoading(false);
    },
    request(
      filters: Readonly<OffseasonMovementListFilters>,
      fetcher: (filters: NormalizedOffseasonMovementListFilters) => Promise<T>,
      options: ListRequestOptions = {},
    ): Promise<void> {
      if (!active) return Promise.resolve();
      const normalized = normalizeOffseasonMovementFilters(filters);
      const key = createFilterKey(normalized);
      const revision = ++latestRevision;
      setLoading(true);

      let request = options.forceFresh ? undefined : inFlight.get(key);
      if (!request) {
        try {
          request = Promise.resolve(fetcher(normalized));
        } catch (reason) {
          request = Promise.reject(reason);
        }
        inFlight.set(key, request);
        void request.finally(() => {
          if (inFlight.get(key) === request) inFlight.delete(key);
        }).catch(() => undefined);
      }

      return request.then(
        (data) => {
          if (active && revision === latestRevision) onData(data);
        },
        (reason: unknown) => {
          if (active && revision === latestRevision) {
            onError(reason instanceof Error ? reason : new Error('스토브리그 이동 목록을 불러오지 못했습니다.'));
          }
        },
      ).finally(() => {
        if (active && revision === latestRevision) setLoading(false);
      });
    },
  };
};

export const createOffseasonMovementMutationCoordinator = () => {
  const inFlight = new Map<string, Promise<unknown>>();
  let active = false;
  let lifecycleRevision = 0;

  return {
    activate() {
      active = true;
    },
    deactivate() {
      active = false;
      lifecycleRevision += 1;
    },
    isActive() {
      return active;
    },
    run<T>(
      key: string,
      mutate: (context: OffseasonMovementMutationContext) => Promise<T>,
      refresh: () => Promise<unknown>,
      shouldRefresh: (result: T) => boolean = () => true,
    ): Promise<T> {
      if (!active) {
        return Promise.reject(new Error('Offseason movement mutation coordinator is inactive.'));
      }
      const existing = inFlight.get(key);
      if (existing) return existing as Promise<T>;
      const revision = lifecycleRevision;
      const context = {
        isActive: () => active && revision === lifecycleRevision,
      };

      const operation = (async () => {
        const result = await mutate(context);
        if (context.isActive() && shouldRefresh(result)) await refresh();
        return result;
      })();
      inFlight.set(key, operation);
      void operation.finally(() => {
        if (inFlight.get(key) === operation) inFlight.delete(key);
      }).catch(() => undefined);
      return operation;
    },
  };
};
