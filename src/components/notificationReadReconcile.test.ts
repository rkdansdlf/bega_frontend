import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileSnapshotReads } from './notificationReadReconcile';
import type { NotificationData } from '../types/notification';

const notification = (id: number, isRead: boolean): NotificationData => ({
  id, isRead, type: 'APPLICATION_APPROVED', title: '', message: '', relatedId: 1, createdAt: '',
});

test('reconciles only snapshot notifications confirmed read on the server', async () => {
  const marked: number[][] = [];
  await reconcileSnapshotReads({
    snapshotIds: [1, 2],
    isCurrent: () => true,
    getNotifications: async () => [notification(1, true), notification(2, false), notification(3, true)],
    markAsRead: (ids) => marked.push(ids),
  });
  assert.deepEqual(marked, [[1]]);
});

test('ignores the reconciliation response after an account change', async () => {
  let current = true;
  let finish!: (value: NotificationData[]) => void;
  let marked = false;
  const pending = reconcileSnapshotReads({
    snapshotIds: [1],
    isCurrent: () => current,
    getNotifications: () => new Promise((resolve) => { finish = resolve; }),
    markAsRead: () => { marked = true; },
  });
  current = false;
  finish([notification(1, true)]);
  await pending;
  assert.equal(marked, false);
});

test('a failed reconciliation does not mark an unconfirmed notification read', async () => {
  let marked = false;
  await reconcileSnapshotReads({
    snapshotIds: [1],
    isCurrent: () => true,
    getNotifications: async () => { throw new Error('temporary failure'); },
    markAsRead: () => { marked = true; },
  });
  assert.equal(marked, false);
});
