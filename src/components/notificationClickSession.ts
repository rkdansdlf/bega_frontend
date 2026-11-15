type NotificationReadOptions = {
  notificationId: number;
  isRead: boolean;
  isCurrent: () => boolean;
  request: (id: number) => Promise<void>;
  markAsRead: (id: number) => void;
};

export const completeNotificationRead = async ({
  notificationId,
  isRead,
  isCurrent,
  request,
  markAsRead,
}: NotificationReadOptions): Promise<boolean> => {
  if (!isCurrent()) return false;
  if (!isRead) {
    await request(notificationId);
    if (!isCurrent()) return false;
    markAsRead(notificationId);
  }
  return isCurrent();
};
