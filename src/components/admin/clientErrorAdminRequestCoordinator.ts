export interface ClientErrorEventFilterValues {
  bucket: string;
  source: string;
  statusGroup: string;
  route: string;
  fingerprint: string;
  search: string;
}

export interface ClientErrorEventRequestSnapshot {
  active: boolean;
  windowKey: string;
  filterKey: string;
}

export interface ClientErrorEventRequestCoordinator {
  sync(snapshot: ClientErrorEventRequestSnapshot, run: () => void): void;
  cancelPending(): void;
  dispose(): void;
}

export interface ClientErrorEventRequestCoordinatorOptions {
  delayMs?: number;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export const createClientErrorEventFilterKey = (
  filters: Readonly<ClientErrorEventFilterValues>,
) => JSON.stringify([
  filters.bucket,
  filters.source,
  filters.statusGroup,
  filters.route,
  filters.fingerprint,
  filters.search,
]);

export const createClientErrorEventRequestCoordinator = (
  options: ClientErrorEventRequestCoordinatorOptions = {},
): ClientErrorEventRequestCoordinator => {
  const delayMs = options.delayMs ?? 250;
  const setTimer = options.setTimer ?? ((callback: () => void, delay: number) => setTimeout(callback, delay));
  const clearTimer = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let previousSnapshot: ClientErrorEventRequestSnapshot | undefined;
  let pendingHandle: unknown;
  let pendingVersion = 0;

  const cancelPending = () => {
    pendingVersion += 1;
    if (pendingHandle !== undefined) {
      clearTimer(pendingHandle);
      pendingHandle = undefined;
    }
  };

  const runImmediately = (run: () => void) => {
    cancelPending();
    run();
  };

  return {
    sync(snapshot, run) {
      const previous = previousSnapshot;
      const identical = previous !== undefined
        && previous.active === snapshot.active
        && previous.windowKey === snapshot.windowKey
        && previous.filterKey === snapshot.filterKey;
      previousSnapshot = snapshot;

      if (!snapshot.active) {
        cancelPending();
        return;
      }
      if (identical) return;

      const activation = previous === undefined || !previous.active;
      const windowChanged = previous !== undefined && previous.windowKey !== snapshot.windowKey;
      if (activation || windowChanged) {
        runImmediately(run);
        return;
      }

      cancelPending();
      const version = pendingVersion;
      pendingHandle = setTimer(() => {
        if (version !== pendingVersion) return;
        pendingHandle = undefined;
        run();
      }, delayMs);
    },
    cancelPending,
    dispose: cancelPending,
  };
};
