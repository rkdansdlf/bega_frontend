import type { NotificationData } from '../types/notification';

type ReconcileOptions = {
  snapshotIds: number[];
  isCurrent: () => boolean;
  getNotifications: () => Promise<readonly NotificationData[]>;
  markAsRead: (ids: number[]) => void;
};

export const reconcileSnapshotReads = async ({
  snapshotIds, isCurrent, getNotifications, markAsRead,
}: ReconcileOptions): Promise<void> => {
  if (!isCurrent()) return;
  try {
    const notifications = await getNotifications();
    if (!isCurrent()) return;
    const snapshot = new Set(snapshotIds);
    const confirmed = notifications.filter((item) => item.isRead && snapshot.has(item.id)).map((item) => item.id);
    if (confirmed.length) markAsRead(confirmed);
  } catch {
    // The successful bulk read remains applied; a later refresh can reconcile the rest.
  }
};
