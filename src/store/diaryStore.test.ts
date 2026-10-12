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
    location: { pathname: '/mypage', search: '', origin: 'http://localhost', hostname: 'localhost' },
  },
});
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionStorage });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });

const { useAuthStore } = await import('./authStore');
const { useDiaryStore } = await import('./diaryStore');

const setViewer = (id: number | null) => useAuthStore.setState({
  user: id === null ? null : { id, email: `viewer-${id}@example.invalid`, name: `Viewer ${id}` },
});

test('diary drafts are retained for their owner and never hydrate into another viewer', async () => {
  sessionStorage.clear();
  localStorage.clear();
  setViewer(101);
  useDiaryStore.getState().reset();
  await useDiaryStore.persist.rehydrate();
  useDiaryStore.getState().setViewerId(101);
  useDiaryStore.getState().setPendingDraft({ date: '2026-09-30', stadium: 'Jamsil' });

  setViewer(202);
  await useDiaryStore.persist.rehydrate();
  useDiaryStore.getState().setViewerId(202);
  assert.equal(useDiaryStore.getState().pendingDraft, null);
  useDiaryStore.getState().setPendingDraft({ date: '2026-10-01', stadium: 'Sajik' });

  setViewer(101);
  await useDiaryStore.persist.rehydrate();
  assert.deepEqual(useDiaryStore.getState().pendingDraft, { date: '2026-09-30', stadium: 'Jamsil' });
});

test.after(() => {
  useDiaryStore.getState().reset();
  setViewer(null);
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'sessionStorage');
  Reflect.deleteProperty(globalThis, 'localStorage');
});
