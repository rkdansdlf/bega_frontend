export type TimedMapEntry<T> = {
  data: T;
  updatedAt: number;
};

const removeExpiredEntries = <K, T>(
  entries: Map<K, TimedMapEntry<T>>,
  now: number,
  ttlMs: number,
) => {
  entries.forEach((entry, key) => {
    if (now - entry.updatedAt > ttlMs) {
      entries.delete(key);
    }
  });
};

export const readTimedMapValue = <K, T>(
  entries: Map<K, TimedMapEntry<T>>,
  key: K,
  now: number,
  ttlMs: number,
): T | null => {
  removeExpiredEntries(entries, now, ttlMs);
  return entries.get(key)?.data ?? null;
};

export const writeTimedMapValue = <K, T>(
  entries: Map<K, TimedMapEntry<T>>,
  key: K,
  data: T,
  now: number,
  ttlMs: number,
) => {
  removeExpiredEntries(entries, now, ttlMs);
  entries.set(key, { data, updatedAt: now });
};
