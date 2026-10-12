import type { NotificationData } from '../types/notification';
import { notificationApi } from '../utils/notificationApi';

export type NotificationPanelLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; notifications: NotificationData[] }
  | { status: 'error'; error: unknown };

type LoadNotificationPanelOptions = {
  getNotifications?: () => Promise<NotificationData[]>;
  onStateChange: (state: NotificationPanelLoadState) => void;
  isCurrent?: () => boolean;
};

export const loadNotificationPanelNotifications = async ({
  getNotifications = notificationApi.getNotifications,
  onStateChange,
  isCurrent = () => true,
}: LoadNotificationPanelOptions): Promise<NotificationPanelLoadState> => {
  if (!isCurrent()) {
    return { status: 'idle' };
  }
  onStateChange({ status: 'loading' });

  try {
    const notifications = await getNotifications();
    if (!isCurrent()) {
      return { status: 'idle' };
    }
    const successState: NotificationPanelLoadState = {
      status: 'success',
      notifications,
    };
    onStateChange(successState);
    return successState;
  } catch (error) {
    if (!isCurrent()) {
      return { status: 'idle' };
    }
    const errorState: NotificationPanelLoadState = {
      status: 'error',
      error,
    };
    onStateChange(errorState);
    return errorState;
  }
};
