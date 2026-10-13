import type { StateStorage } from 'zustand/middleware';

export type ViewerStorageLike = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem' | 'clear'>;
export type ViewerId = number | string | null;

const LEGACY_OWNERLESS_SESSION_KEYS = [
  'diary-draft-storage',
  'mate-storage',
  'chatbot_current_session_id',
  'chatbot_current_session_title',
  'last_pending_msg',
] as const;
const LEGACY_OWNERLESS_SESSION_PREFIXES = ['mateApplyDraft:'] as const;
const LEGACY_OWNERLESS_LOCAL_KEYS = ['prediction-storage'] as const;

export const getViewerScopedStorageKey = (
  storageKey: string,
  viewerId: ViewerId,
): string | null => {
  if (viewerId === null || String(viewerId).trim().length === 0) {
    return null;
  }
  if (typeof viewerId === 'number' && (!Number.isFinite(viewerId) || viewerId <= 0)) {
    return null;
  }

  return `${storageKey}:viewer:${encodeURIComponent(String(viewerId).trim())}`;
};

const readPersistedViewerId = (value: string): string | null => {
  try {
    const parsed = JSON.parse(value) as { state?: { viewerId?: unknown } };
    const viewerId = parsed?.state?.viewerId;
    return typeof viewerId === 'string' || typeof viewerId === 'number'
      ? String(viewerId)
      : null;
  } catch {
    return null;
  }
};

export const createViewerScopedStateStorage = (
  getViewerId: () => ViewerId,
  getStorage: () => ViewerStorageLike,
): StateStorage => ({
  getItem: (name) => {
    const viewerId = getViewerId();
    const key = getViewerScopedStorageKey(name, viewerId);
    if (!key) return null;

    try {
      const storage = getStorage();
      const value = storage.getItem(key);
      if (value && readPersistedViewerId(value) === String(viewerId)) return value;
      storage.removeItem(key);
      return null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    const viewerId = getViewerId();
    const key = getViewerScopedStorageKey(name, viewerId);
    if (!key || readPersistedViewerId(value) !== String(viewerId)) return;

    try {
      getStorage().setItem(key, value);
    } catch {
      // Storage can be unavailable or full; keep the in-memory state usable.
    }
  },
  removeItem: (name) => {
    const key = getViewerScopedStorageKey(name, getViewerId());
    if (!key) return;

    try {
      getStorage().removeItem(key);
    } catch {
      // Storage can be unavailable; there is no persisted ownerless fallback.
    }
  },
});

const getBrowserStorage = (kind: 'sessionStorage' | 'localStorage'): ViewerStorageLike | null => {
  try {
    return typeof window === 'undefined' ? null : window[kind];
  } catch {
    return null;
  }
};

export const clearLegacyOwnerlessDrafts = (
  sessionStorage: ViewerStorageLike | null = getBrowserStorage('sessionStorage'),
  localStorage: ViewerStorageLike | null = getBrowserStorage('localStorage'),
): void => {
  if (sessionStorage) {
    try {
      for (const key of LEGACY_OWNERLESS_SESSION_KEYS) {
        sessionStorage.removeItem(key);
      }

      const legacyApplyKeys: string[] = [];
      for (let index = 0; index < sessionStorage.length; index += 1) {
        const key = sessionStorage.key(index);
        if (key && !key.includes(':viewer:')
          && LEGACY_OWNERLESS_SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          legacyApplyKeys.push(key);
        }
      }
      legacyApplyKeys.forEach((key) => sessionStorage.removeItem(key));
    } catch {
      // Continue with the other storage area if one operation fails.
    }
  }

  if (localStorage) {
    try {
      LEGACY_OWNERLESS_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage can be unavailable; scoped entries are never read as legacy data.
    }
  }
};
