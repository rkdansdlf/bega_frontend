import type { MarkAllAsReadResponse, NotificationData } from '../types/notification';
import { getApiErrorStatus } from '../api/errorStatus';
import { getAuthSessionEpoch } from '../api/authSessionGeneration';
import { privateDelete, privateGet, privatePost } from '../api/privateClient';

type NotificationApiState = {
  epoch: number;
  unreadCountAvailable: boolean;
  listAvailable: boolean;
  authFailure: boolean;
};

let apiState: NotificationApiState | undefined;

const getNotificationApiState = (): NotificationApiState => {
  const epoch = getAuthSessionEpoch();
  if (!apiState || apiState.epoch !== epoch) {
    apiState = { epoch, unreadCountAvailable: true, listAvailable: true, authFailure: false };
  }
  return apiState;
};

const isHttpErrorStatus = (error: unknown, statusCode: number): boolean =>
  typeof error === 'object'
  && error !== null
  && 'status' in error
  && Number((error as { status: number | string }).status) === statusCode;

const requestNotifications = (): Promise<NotificationData[]> =>
  privateGet<NotificationData[]>('/notifications/my');

const requestUnreadCount = (): Promise<number> =>
  privateGet<number>('/notifications/my/unread-count');

export const isIgnorableNotificationError = (error: unknown): boolean => {
  const status = getApiErrorStatus(error);
  return status === null || status === 401 || status === 404;
};

export const resetNotificationApiStateForTests = (): void => {
  apiState = undefined;
};

const getNotifications = async (): Promise<NotificationData[]> => {
  const state = getNotificationApiState();
  if (state.authFailure || !state.listAvailable) {
    return [];
  }

  try {
    const notifications = await privateGet<NotificationData[]>('/notifications/my');
    return getAuthSessionEpoch() === state.epoch ? notifications : [];
  } catch (error) {
    if (getAuthSessionEpoch() !== state.epoch) return [];
    if (isHttpErrorStatus(error, 401)) {
      state.authFailure = true;
      return [];
    }

    if (isHttpErrorStatus(error, 404)) {
      state.listAvailable = false;
      return [];
    }

    if (getApiErrorStatus(error) === null) {
      return [];
    }

    throw error;
  }
};

const getUnreadCount = async (): Promise<number> => {
  const state = getNotificationApiState();
  if (state.authFailure) {
    return 0;
  }

  if (!state.unreadCountAvailable && !state.listAvailable) {
    return 0;
  }

  const reduceUnreadCount = (notifications: NotificationData[]) =>
    notifications.reduce((count, notification) => (notification.isRead ? count : count + 1), 0);

  if (state.unreadCountAvailable) {
    try {
      const count = await requestUnreadCount();
      return getAuthSessionEpoch() === state.epoch ? count : 0;
    } catch (error) {
      if (getAuthSessionEpoch() !== state.epoch) return 0;
      if (isHttpErrorStatus(error, 401)) {
        state.authFailure = true;
        state.unreadCountAvailable = false;
        return 0;
      }

      if (getApiErrorStatus(error) === null) {
        return 0;
      }

      if (!isHttpErrorStatus(error, 404)) {
        throw error;
      }

      state.unreadCountAvailable = false;
    }
  }

  if (!state.listAvailable) {
    return 0;
  }

  try {
    const notifications = await requestNotifications();

    if (getAuthSessionEpoch() !== state.epoch) return 0;

    if (!Array.isArray(notifications)) {
      return 0;
    }

    return reduceUnreadCount(notifications);
  } catch (error) {
    if (getAuthSessionEpoch() !== state.epoch) return 0;
    if (isHttpErrorStatus(error, 401)) {
      state.authFailure = true;
      return 0;
    }

    if (isHttpErrorStatus(error, 404)) {
      if (!state.authFailure) {
        state.listAvailable = false;
      }

      return 0;
    }

    if (getApiErrorStatus(error) === null) {
      return 0;
    }

    throw error;
  }
};

const markAsRead = async (notificationId: number): Promise<void> => {
  await privatePost<void>(`/notifications/${notificationId}/read`);
};

const markAllAsRead = async (notificationIds: number[]): Promise<MarkAllAsReadResponse> => {
  return privatePost<MarkAllAsReadResponse>('/notifications/mark-all-read', {
    notificationIds,
  });
};

const deleteNotification = async (notificationId: number): Promise<void> => {
  await privateDelete<void>(`/notifications/${notificationId}`);
};

export const notificationApi = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
