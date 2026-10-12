import type { NotificationData } from '../types/notification';
import { getApiErrorStatus } from '../api/errorStatus';
import { privateDelete, privateGet, privatePost } from '../api/privateClient';

let notificationUnreadCountEndpointAvailable = true;
let notificationListEndpointAvailable = true;
let notificationAuthFailure = false;

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
  notificationUnreadCountEndpointAvailable = true;
  notificationListEndpointAvailable = true;
  notificationAuthFailure = false;
};

const getNotifications = async (): Promise<NotificationData[]> => {
  if (notificationAuthFailure || !notificationListEndpointAvailable) {
    return [];
  }

  try {
    return await requestNotifications();
  } catch (error) {
    if (isHttpErrorStatus(error, 401)) {
      notificationAuthFailure = true;
      return [];
    }

    if (isHttpErrorStatus(error, 404)) {
      notificationListEndpointAvailable = false;
      return [];
    }

    if (getApiErrorStatus(error) === null) {
      return [];
    }

    throw error;
  }
};

const getUnreadCount = async (): Promise<number> => {
  if (notificationAuthFailure) {
    return 0;
  }

  if (!notificationUnreadCountEndpointAvailable && !notificationListEndpointAvailable) {
    return 0;
  }

  const reduceUnreadCount = (notifications: NotificationData[]) =>
    notifications.reduce((count, notification) => (notification.isRead ? count : count + 1), 0);

  if (notificationUnreadCountEndpointAvailable) {
    try {
      return await requestUnreadCount();
    } catch (error) {
      if (isHttpErrorStatus(error, 401)) {
        notificationAuthFailure = true;
        notificationUnreadCountEndpointAvailable = false;
        return 0;
      }

      if (getApiErrorStatus(error) === null) {
        return 0;
      }

      if (!isHttpErrorStatus(error, 404)) {
        throw error;
      }

      notificationUnreadCountEndpointAvailable = false;
    }
  }

  if (!notificationListEndpointAvailable) {
    return 0;
  }

  try {
    const notifications = await requestNotifications();

    if (!Array.isArray(notifications)) {
      return 0;
    }

    return reduceUnreadCount(notifications);
  } catch (error) {
    if (isHttpErrorStatus(error, 401)) {
      notificationAuthFailure = true;
      return 0;
    }

    if (isHttpErrorStatus(error, 404)) {
      if (!notificationAuthFailure) {
        notificationListEndpointAvailable = false;
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

const markAllAsRead = async (readThrough: number): Promise<void> => {
  await privatePost<void>('/notifications/mark-all-read', {
    readThrough: new Date(readThrough).toISOString(),
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
