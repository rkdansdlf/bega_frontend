import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearMateApplyDraft,
  getMateApplyDraftStorageKey,
  loadMateApplyDraft,
  saveMateApplyDraft,
} from './mateApplyDraft';

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
};

const setWindowSessionStorage = (sessionStorage: ReturnType<typeof createStorage>) => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      sessionStorage,
    } as unknown as Window & { sessionStorage: typeof sessionStorage },
  });
};

const getRequiredStorageKey = (partyId: string, viewerId: number): string => {
  const key = getMateApplyDraftStorageKey(partyId, viewerId);
  assert.ok(key);
  return key;
};

test('MateApply draft는 viewer와 partyId별로 저장하고 복원한다', () => {
  const sessionStorage = createStorage();
  setWindowSessionStorage(sessionStorage);

  saveMateApplyDraft('77', 101, {
    message: '함께 응원하고 싶습니다!',
    ticketVerified: true,
    ticketInfo: {
      date: '2026-05-20',
      time: '18:30:00',
      stadium: '잠실야구장',
      homeTeam: 'LG',
      awayTeam: 'KT',
      section: '1루석',
      row: '12',
      seat: '15',
      peopleCount: 2,
      price: 22000,
      reservationNumber: 'R-123456',
      gameId: 1001,
      verificationToken: 'verification-token',
    },
  });

  assert.deepEqual(loadMateApplyDraft('77', 101), {
    partyId: '77',
    message: '함께 응원하고 싶습니다!',
    ticketVerified: true,
    ticketInfo: {
      date: '2026-05-20',
      time: '18:30:00',
      stadium: '잠실야구장',
      homeTeam: 'LG',
      awayTeam: 'KT',
      section: '1루석',
      row: '12',
      seat: '15',
      peopleCount: 2,
      price: 22000,
      reservationNumber: 'R-123456',
      gameId: 1001,
      verificationToken: 'verification-token',
    },
    updatedAt: loadMateApplyDraft('77', 101)?.updatedAt ?? '',
  });
  assert.equal(loadMateApplyDraft('77', 202), null);
  assert.notEqual(
    getMateApplyDraftStorageKey('77', 101),
    getMateApplyDraftStorageKey('77', 202),
  );
  assert.equal(loadMateApplyDraft('88', 101), null);
});

test('MateApply draft는 내용이 비면 해당 partyId key를 정리한다', () => {
  const sessionStorage = createStorage();
  setWindowSessionStorage(sessionStorage);

  saveMateApplyDraft('91', 101, {
    message: '초안 메시지',
    ticketVerified: false,
    ticketInfo: null,
  });

  assert.equal(typeof sessionStorage.getItem(getRequiredStorageKey('91', 101)), 'string');

  saveMateApplyDraft('91', 101, {
    message: '',
    ticketVerified: false,
    ticketInfo: null,
  });

  assert.equal(loadMateApplyDraft('91', 101), null);
});

test('MateApply draft는 잘못된 JSON이나 명시적 삭제를 안전하게 처리한다', () => {
  const sessionStorage = createStorage();
  setWindowSessionStorage(sessionStorage);

  sessionStorage.setItem(getRequiredStorageKey('55', 101), '{broken');
  assert.equal(loadMateApplyDraft('55', 101), null);

  saveMateApplyDraft('55', 101, {
    message: '다시 저장',
    ticketVerified: false,
    ticketInfo: null,
  });
  clearMateApplyDraft('55', 101);

  assert.equal(loadMateApplyDraft('55', 101), null);
});
