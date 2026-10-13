// Test-only side-effect module. zustand attaches `persist` to the auth store only when a storage
// exists at import time, and mateQueryCache.test.ts reaches `authStore` through several static
// imports, so a global localStorage must be installed before any of them evaluates.
const values = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: {
    get length() { return values.size; },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => { values.clear(); },
  },
});
