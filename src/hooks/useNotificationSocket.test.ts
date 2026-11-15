import assert from 'node:assert/strict';
import test from 'node:test';

import type { NotificationData } from '../types/notification';
import { useNotificationStore } from '../store/notificationStore';
import { reloadNotificationSnapshot } from './useNotificationSocket';

const notification: NotificationData = {
  id: 41,
  type: 'NEW_FOLLOWER',
  title: '새 팔로워',
  message: '새 팔로워가 있습니다.',
  relatedId: 7,
  isRead: false,
  createdAt: '2026-07-18T01:00:00.000Z',
};

test('reloadNotificationSnapshot replaces local state with the authoritative server snapshot', async () => {
  const snapshots: NotificationData[][] = [];

  await reloadNotificationSnapshot(
    async () => [notification],
    (notifications) => snapshots.push(notifications),
  );

  assert.deepEqual(snapshots, [[notification]]);
});

test('WebSocket reconnect refresh updates the IDs used by the open panel for bulk read', async () => {
  useNotificationStore.getState().reset();
  useNotificationStore.getState().setNotifications([notification]);
  const refreshedNotification = { ...notification, id: 42 };

  await reloadNotificationSnapshot(
    async () => [notification, refreshedNotification],
    (notifications) => useNotificationStore.getState().setNotifications(notifications),
  );

  assert.deepEqual(useNotificationStore.getState().snapshotNotificationIds, [41, 42]);
  assert.deepEqual(useNotificationStore.getState().notifications.map((item) => item.id), [41, 42]);
});

test('reloadNotificationSnapshot discards a response after its connection generation is stale', async () => {
  let resolveFetch: ((notifications: NotificationData[]) => void) | undefined;
  let isCurrent = true;
  const snapshots: NotificationData[][] = [];

  const reload = reloadNotificationSnapshot(
    () => new Promise<NotificationData[]>((resolve) => {
      resolveFetch = resolve;
    }),
    (notifications) => snapshots.push(notifications),
    () => isCurrent,
  );

  isCurrent = false;
  resolveFetch?.([notification]);
  await reload;

  assert.deepEqual(snapshots, []);
});
