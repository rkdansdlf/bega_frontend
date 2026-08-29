import assert from 'node:assert/strict';
import test from 'node:test';

import type { NotificationData } from '../types/notification';
import { notificationApi } from '../utils/notificationApi';
import {
  loadNotificationPanelNotifications,
  type NotificationPanelLoadState,
} from './notificationPanelLoader';

const notification: NotificationData = {
  id: 17,
  type: 'POST_COMMENT',
  title: '새 댓글',
  message: '응원글에 새 댓글이 달렸습니다.',
  relatedId: 91,
  isRead: false,
  createdAt: '2026-08-29T00:00:00.000Z',
};

const recordStates = () => {
  const states: NotificationPanelLoadState[] = [];
  return {
    states,
    onStateChange: (state: NotificationPanelLoadState) => states.push(state),
  };
};

test('알림 조회는 실제 notification API를 호출하고 응답 전 loading 상태를 알린다', async (t) => {
  let resolveRequest!: (notifications: NotificationData[]) => void;
  const pendingRequest = new Promise<NotificationData[]>((resolve) => {
    resolveRequest = resolve;
  });
  const getNotifications = t.mock.method(
    notificationApi,
    'getNotifications',
    async () => pendingRequest,
  );
  const { states, onStateChange } = recordStates();

  const load = loadNotificationPanelNotifications({ onStateChange });

  assert.equal(getNotifications.mock.callCount(), 1);
  assert.deepEqual(states, [{ status: 'loading' }]);

  resolveRequest([notification]);
  await load;
});

test('알림 조회 성공은 받은 알림과 함께 success 상태를 알린다', async (t) => {
  t.mock.method(notificationApi, 'getNotifications', async () => [notification]);
  const { states, onStateChange } = recordStates();

  const result = await loadNotificationPanelNotifications({ onStateChange });

  assert.deepEqual(result, { status: 'success', notifications: [notification] });
  assert.deepEqual(states, [
    { status: 'loading' },
    { status: 'success', notifications: [notification] },
  ]);
});

test('빈 알림 응답은 오류가 아닌 빈 success 상태로 완료한다', async (t) => {
  t.mock.method(notificationApi, 'getNotifications', async () => []);
  const { states, onStateChange } = recordStates();

  const result = await loadNotificationPanelNotifications({ onStateChange });

  assert.deepEqual(result, { status: 'success', notifications: [] });
  assert.deepEqual(states.at(-1), { status: 'success', notifications: [] });
});

test('알림 조회 실패는 error 상태를 보존한다', async (t) => {
  const error = Object.assign(new Error('notification unavailable'), { status: 503 });
  t.mock.method(notificationApi, 'getNotifications', async () => {
    throw error;
  });
  const { states, onStateChange } = recordStates();

  const result = await loadNotificationPanelNotifications({ onStateChange });

  assert.deepEqual(result, { status: 'error', error });
  assert.deepEqual(states, [
    { status: 'loading' },
    { status: 'error', error },
  ]);
});

test('실패 후 재시도는 API를 다시 호출하고 success 상태로 복구한다', async (t) => {
  let attempt = 0;
  const error = Object.assign(new Error('temporary notification failure'), { status: 503 });
  const getNotifications = t.mock.method(notificationApi, 'getNotifications', async () => {
    attempt += 1;
    if (attempt === 1) {
      throw error;
    }
    return [notification];
  });
  const { states, onStateChange } = recordStates();

  await loadNotificationPanelNotifications({ onStateChange });
  const retryResult = await loadNotificationPanelNotifications({ onStateChange });

  assert.equal(getNotifications.mock.callCount(), 2);
  assert.deepEqual(retryResult, { status: 'success', notifications: [notification] });
  assert.deepEqual(states.map((state) => state.status), [
    'loading',
    'error',
    'loading',
    'success',
  ]);
});
