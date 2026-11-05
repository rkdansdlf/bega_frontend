import assert from 'node:assert/strict';
import test from 'node:test';
import { completeNotificationRead } from './notificationClickSession';

test('a delayed read does not update or navigate after the viewer changes', async () => {
  let finish!: () => void;
  let current = true;
  const marked: number[] = [];
  const result = completeNotificationRead({
    notificationId: 42,
    isRead: false,
    isCurrent: () => current,
    request: () => new Promise<void>((resolve) => { finish = resolve; }),
    markAsRead: (id) => marked.push(id),
  });
  current = false;
  finish();
  assert.equal(await result, false);
  assert.deepEqual(marked, []);
});

test('a current viewer can mark an unread notification and continue', async () => {
  const marked: number[] = [];
  const result = await completeNotificationRead({
    notificationId: 42,
    isRead: false,
    isCurrent: () => true,
    request: async () => {},
    markAsRead: (id) => marked.push(id),
  });
  assert.equal(result, true);
  assert.deepEqual(marked, [42]);
});

test('a failed read does not update local notification state', async () => {
  const marked: number[] = [];
  await assert.rejects(completeNotificationRead({
    notificationId: 42,
    isRead: false,
    isCurrent: () => true,
    request: async () => { throw new Error('read failed'); },
    markAsRead: (id) => marked.push(id),
  }), /read failed/);
  assert.deepEqual(marked, []);
});
