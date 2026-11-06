import { create } from 'zustand';
import { NotificationData } from '../types/notification';

interface NotificationState {
  notifications: NotificationData[];
  snapshotNotificationIds: number[];
  locallyReadIds: Set<number>;
  locallyDeletedIds: Set<number>;
}

interface NotificationActions {
  setNotifications: (notifications: NotificationData[]) => void;
  clearSnapshotNotificationIds: () => void;
  addNotification: (notification: NotificationData) => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: (notificationIds: number[]) => void;
  removeNotification: (notificationId: number) => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const getInitialState = (): NotificationState => ({
  notifications: [],
  snapshotNotificationIds: [],
  locallyReadIds: new Set<number>(),
  locallyDeletedIds: new Set<number>(),
});

const deduplicateNotifications = (notifications: NotificationData[]) => {
  const seenIds = new Set<number>();

  return notifications.filter((notification) => {
    if (seenIds.has(notification.id)) {
      return false;
    }

    seenIds.add(notification.id);
    return true;
  });
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  ...getInitialState(),

  clearSnapshotNotificationIds: () => set({ snapshotNotificationIds: [] }),

  setNotifications: (notifications) =>
    set((state) => {
      const existingById = new Map(
        state.notifications.map((notification) => [notification.id, notification]),
      );
      const locallyReadIds = new Set(state.locallyReadIds);
      const nextNotifications = deduplicateNotifications(notifications)
        .filter((notification) => !state.locallyDeletedIds.has(notification.id))
        .map((notification) => {
          const shouldRemainRead = notification.isRead
            || existingById.get(notification.id)?.isRead
            || locallyReadIds.has(notification.id);

          if (shouldRemainRead) {
            locallyReadIds.add(notification.id);
          }

          return shouldRemainRead && !notification.isRead
            ? { ...notification, isRead: true }
            : notification;
        });

      return {
        notifications: nextNotifications,
        snapshotNotificationIds: nextNotifications.map((notification) => notification.id),
        locallyReadIds,
      };
    }),

  addNotification: (notification) =>
    set((state) => {
      if (state.locallyDeletedIds.has(notification.id)) {
        return {};
      }

      const existing = state.notifications.find((item) => item.id === notification.id);
      const shouldRemainRead = notification.isRead
        || existing?.isRead
        || state.locallyReadIds.has(notification.id);
      const nextNotification = shouldRemainRead && !notification.isRead
        ? { ...notification, isRead: true }
        : notification;
      const locallyReadIds = new Set(state.locallyReadIds);
      if (shouldRemainRead) {
        locallyReadIds.add(notification.id);
      }

      return {
        notifications: [
          nextNotification,
          ...state.notifications.filter((item) => item.id !== notification.id),
        ],
        locallyReadIds,
      };
    }),

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      locallyReadIds: new Set(state.locallyReadIds).add(notificationId),
    })),

  // 모든 알림 읽음 처리
  markAllAsRead: (notificationIds) =>
    set((state) => {
      const locallyReadIds = new Set(state.locallyReadIds);
      const confirmedReadIds = new Set(notificationIds);
      confirmedReadIds.forEach((notificationId) => locallyReadIds.add(notificationId));
      const notifications = state.notifications.map((notification) => {
        return confirmedReadIds.has(notification.id) && !notification.isRead
          ? { ...notification, isRead: true }
          : notification;
      });

      return {
        notifications,
        locallyReadIds,
      };
    }),

  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      snapshotNotificationIds: state.snapshotNotificationIds.filter((id) => id !== notificationId),
      locallyDeletedIds: new Set(state.locallyDeletedIds).add(notificationId),
    })),

  reset: () => set(getInitialState()),
}));
