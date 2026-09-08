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
};

export const loadNotificationPanelNotifications = async ({
  getNotifications = notificationApi.getNotifications,
  onStateChange,
}: LoadNotificationPanelOptions): Promise<NotificationPanelLoadState> => {
  onStateChange({ status: 'loading' });

  try {
    const notifications = await getNotifications();
    const successState: NotificationPanelLoadState = {
      status: 'success',
      notifications,
    };
    onStateChange(successState);
    return successState;
  } catch (error) {
    const errorState: NotificationPanelLoadState = {
      status: 'error',
      error,
    };
    onStateChange(errorState);
    return errorState;
  }
};
