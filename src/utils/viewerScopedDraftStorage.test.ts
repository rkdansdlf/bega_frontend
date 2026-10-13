import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearLegacyOwnerlessDrafts,
  createViewerScopedStateStorage,
  getViewerScopedStorageKey,
  type ViewerStorageLike,
} from './viewerScopedDraftStorage';

const createStorage = (): ViewerStorageLike => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

test('viewer storage keys are stable per account and absent for anonymous viewers', () => {
  assert.equal(getViewerScopedStorageKey('mate-storage', 101), 'mate-storage:viewer:101');
  assert.notEqual(
    getViewerScopedStorageKey('prediction-storage', 101),
    getViewerScopedStorageKey('prediction-storage', 202),
  );
  assert.equal(getViewerScopedStorageKey('mate-storage', null), null);
});

test('invalid numeric viewer ids do not create a shared storage namespace', () => {
  assert.equal(getViewerScopedStorageKey('mate-storage', 0), null);
  assert.equal(getViewerScopedStorageKey('mate-storage', Number.NaN), null);
  assert.equal(getViewerScopedStorageKey('mate-storage', Number.POSITIVE_INFINITY), null);
});

test('persist storage reads and writes only the active viewer namespace', () => {
  const backingStorage = createStorage();
  let viewerId: number | null = 101;
  const storage = createViewerScopedStateStorage(() => viewerId, () => backingStorage);
  const name = 'prediction-storage';
  const viewerA = JSON.stringify({ state: { viewerId: 101, rankings: ['A'] }, version: 0 });
  const viewerB = JSON.stringify({ state: { viewerId: 202, rankings: ['B'] }, version: 0 });

  storage.setItem(name, viewerA);
  viewerId = 202;
  assert.equal(storage.getItem(name), null);
  storage.setItem(name, viewerA);
  storage.setItem(name, viewerB);
  assert.equal(storage.getItem(name), viewerB);

  viewerId = 101;
  assert.equal(storage.getItem(name), viewerA);
});

test('persist storage rejects a value whose embedded owner differs from the active viewer', () => {
  const backingStorage = createStorage();
  let viewerId: number | null = 202;
  const storage = createViewerScopedStateStorage(() => viewerId, () => backingStorage);
  const name = 'prediction-storage';
  const viewerA = JSON.stringify({ state: { viewerId: 101, rankings: ['A'] }, version: 0 });

  backingStorage.setItem('prediction-storage:viewer:202', viewerA);

  assert.equal(storage.getItem(name), null);
  assert.equal(backingStorage.getItem('prediction-storage:viewer:202'), null);
});

test('legacy ownerless draft cleanup removes only known shared keys and preserves viewer data', () => {
  const sessionStorage = createStorage();
  const localStorage = createStorage();

  for (const key of [
    'diary-draft-storage',
    'mate-storage',
    'mateApplyDraft:77',
    'chatbot_current_session_id',
    'chatbot_current_session_title',
    'last_pending_msg',
    'diary-draft-storage:viewer:101',
    'mateApplyDraft:77:viewer:101',
    'unrelated-session-value',
  ]) {
    sessionStorage.setItem(key, 'fixture');
  }
  localStorage.setItem('prediction-storage', 'legacy');
  localStorage.setItem('prediction-storage:viewer:101', 'viewer-data');
  localStorage.setItem('unrelated-local-value', 'keep');

  clearLegacyOwnerlessDrafts(sessionStorage, localStorage);

  for (const key of [
    'diary-draft-storage',
    'mate-storage',
    'mateApplyDraft:77',
    'chatbot_current_session_id',
    'chatbot_current_session_title',
    'last_pending_msg',
  ]) {
    assert.equal(sessionStorage.getItem(key), null, `${key} should be removed`);
  }
  assert.equal(sessionStorage.getItem('diary-draft-storage:viewer:101'), 'fixture');
  assert.equal(sessionStorage.getItem('mateApplyDraft:77:viewer:101'), 'fixture');
  assert.equal(sessionStorage.getItem('unrelated-session-value'), 'fixture');
  assert.equal(localStorage.getItem('prediction-storage'), null);
  assert.equal(localStorage.getItem('prediction-storage:viewer:101'), 'viewer-data');
  assert.equal(localStorage.getItem('unrelated-local-value'), 'keep');
});
