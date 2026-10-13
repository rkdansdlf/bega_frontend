import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() { return this.values.size; }

  clear() { this.values.clear(); }

  getItem(key: string) { return this.values.get(key) ?? null; }

  key(index: number) { return [...this.values.keys()][index] ?? null; }

  removeItem(key: string) { this.values.delete(key); }

  setItem(key: string, value: string) { this.values.set(key, value); }
}

const sessionStorage = new MemoryStorage();
const localStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    sessionStorage,
    localStorage,
    location: { pathname: '/', search: '', origin: 'http://localhost', hostname: 'localhost' },
  },
});
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionStorage });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });

const { markAuthSessionEstablished } = await import('../api/authSessionGeneration');
const { useAuthStore } = await import('../store/authStore');
const { getViewerQueryScope, isViewerQueryScopeCurrent } = await import('./viewerQueryScope');

const setViewer = (id: number | null) => useAuthStore.setState({
  user: id === null ? null : { id, email: `viewer-${id}@example.invalid`, name: `Viewer ${id}` },
});

test('delayed work is invalidated when the viewer or authenticated session changes', () => {
  setViewer(101);
  markAuthSessionEstablished();
  const viewerAScope = getViewerQueryScope();
  assert.equal(isViewerQueryScopeCurrent(viewerAScope), true);

  setViewer(202);
  markAuthSessionEstablished();
  assert.equal(isViewerQueryScopeCurrent(viewerAScope), false);

  setViewer(101);
  markAuthSessionEstablished();
  assert.equal(isViewerQueryScopeCurrent(viewerAScope), false);
  const replacementSessionScope = getViewerQueryScope();
  assert.equal(isViewerQueryScopeCurrent(replacementSessionScope), true);

  markAuthSessionEstablished();
  assert.equal(isViewerQueryScopeCurrent(replacementSessionScope), false);
});

test.after(() => {
  setViewer(null);
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'sessionStorage');
  Reflect.deleteProperty(globalThis, 'localStorage');
});
