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
    location: { pathname: '/prediction/ranking', search: '', origin: 'http://localhost', hostname: 'localhost' },
  },
});
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionStorage });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });

const { useAuthStore } = await import('./authStore');
const { usePredictionStore } = await import('./predictionStore');

const setViewer = (id: number | null) => useAuthStore.setState({
  user: id === null ? null : { id, email: `viewer-${id}@example.invalid`, name: `Viewer ${id}` },
});

test('prediction rankings are retained for their owner and isolated across account switches', async () => {
  sessionStorage.clear();
  localStorage.clear();
  setViewer(101);
  usePredictionStore.getState().reset();
  await usePredictionStore.persist.rehydrate();
  usePredictionStore.getState().setViewerId(101);
  const viewerATeam = usePredictionStore.getState().allTeams[0];
  usePredictionStore.getState().addTeamToRanking(viewerATeam);
  usePredictionStore.getState().completePrediction();

  setViewer(202);
  await usePredictionStore.persist.rehydrate();
  usePredictionStore.getState().setViewerId(202);
  assert.equal(usePredictionStore.getState().rankings.every((team) => team === null), true);
  assert.equal(usePredictionStore.getState().isPredictionSaved, false);
  const viewerBTeam = usePredictionStore.getState().allTeams[1];
  usePredictionStore.getState().addTeamToRanking(viewerBTeam);

  setViewer(101);
  await usePredictionStore.persist.rehydrate();
  assert.equal(usePredictionStore.getState().rankings[0]?.id, viewerATeam.id);
  assert.equal(usePredictionStore.getState().isPredictionSaved, true);
});

test.after(() => {
  usePredictionStore.getState().reset();
  setViewer(null);
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'sessionStorage');
  Reflect.deleteProperty(globalThis, 'localStorage');
});
