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
  let active = true;
  let latestRevision = 0;
  let loading = false;

  const setLoading = (next: boolean, force = false) => {
    if (!force && loading === next) return;
    loading = next;
    onLoading(next);
  };

  return {
    deactivate() {
      active = false;
      latestRevision += 1;
      setLoading(false);
    },
    request(
      filters: Readonly<OffseasonMovementListFilters>,
      fetcher: (filters: NormalizedOffseasonMovementListFilters) => Promise<T>,
    ): Promise<void> {
      active = true;
      const normalized = normalizeOffseasonMovementFilters(filters);
      const key = createFilterKey(normalized);
      const revision = ++latestRevision;

      let request = inFlight.get(key);
      if (!request) {
        setLoading(true, true);
        request = fetcher(normalized);
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

  return {
    run<T>(
      key: string,
      mutate: () => Promise<T>,
      refresh: () => Promise<unknown>,
      shouldRefresh: (result: T) => boolean = () => true,
    ): Promise<T> {
      const existing = inFlight.get(key);
      if (existing) return existing as Promise<T>;

      const operation = (async () => {
        const result = await mutate();
        if (shouldRefresh(result)) await refresh();
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
