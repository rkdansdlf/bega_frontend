export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

interface NotificationPermissionApi {
  permission: NotificationPermission;
  requestPermission?: () => Promise<NotificationPermission>;
}

export const getBrowserNotificationPermission = (
  api: Pick<NotificationPermissionApi, 'permission'> | undefined = (
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification : undefined
  ),
): BrowserNotificationPermission => api?.permission ?? 'unsupported';

export const requestBrowserNotificationPermission = async (
  api: NotificationPermissionApi | undefined = (
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification : undefined
  ),
): Promise<BrowserNotificationPermission> => {
  if (!api || typeof api.requestPermission !== 'function') {
    return 'unsupported';
  }

  try {
    return await api.requestPermission();
  } catch {
    return api.permission;
  }
};
