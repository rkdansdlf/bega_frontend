import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthSession } from '../store/authStore';
import { notificationApi, isIgnorableNotificationError } from '../utils/notificationApi';
import { NotificationData as Notification, NotificationType } from '../types/notification';
import {
  NotificationAlertTriangleIcon,
  NotificationBellIcon,
  NotificationCalendarIcon,
  NotificationCheckCheckIcon,
  NotificationCheckIcon,
  NotificationClockIcon,
  NotificationCloseIcon,
  NotificationFileTextIcon,
  NotificationHeartIcon,
  NotificationMessageCircleIcon,
  NotificationMessageSquareIcon,
  NotificationRepeatIcon,
  NotificationShieldAlertIcon,
  NotificationStarIcon,
  NotificationTrashIcon,
  NotificationUserPlusIcon,
} from './icons/NotificationPanelIcons';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  type BrowserNotificationPermission,
} from '../utils/browserNotificationPermission';
import {
  loadNotificationPanelNotifications,
  type NotificationPanelLoadState,
} from './notificationPanelLoader';

export type TabType = 'ALL' | 'MATE' | 'CHEER';

export type NotificationPanelRuntime = {
  deleteNotification?: (notificationId: number) => Promise<void>;
  getNotifications?: () => Promise<Notification[]>;
  markAllAsRead?: () => Promise<void>;
  markAsRead?: (notificationId: number) => Promise<void>;
  navigate?: NavigateFunction;
  requestBrowserNotificationPermission?: () => Promise<BrowserNotificationPermission>;
};

export type NotificationPanelProps = {
  browserPermissionOverride?: BrowserNotificationPermission;
  initialActiveTabOverride?: TabType;
  isLoggedInOverride?: boolean;
  notificationsOverride?: readonly Notification[];
  nowOverride?: string;
  runtimeOverride?: NotificationPanelRuntime;
};

const MATE_NOTIFICATION_TYPES: NotificationType[] = [
  'APPLICATION_RECEIVED',
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'PARTY_EXPIRED',
  'PARTY_AUTO_COMPLETED',
  'GAME_TOMORROW_REMINDER',
  'GAME_DAY_REMINDER',
  'HOST_RESPONSE_NUDGE',
  'REVIEW_REQUEST',
];

const CHEER_NOTIFICATION_TYPES: NotificationType[] = [
  'POST_COMMENT',
  'COMMENT_REPLY',
  'POST_LIKE',
  'POST_REPOST',
  'NEW_FOLLOWER',
  'FOLLOWING_NEW_POST',
];

export default function NotificationPanel({
  browserPermissionOverride,
  initialActiveTabOverride = 'ALL',
  isLoggedInOverride,
  notificationsOverride,
  nowOverride,
  runtimeOverride,
}: NotificationPanelProps) {
  const liveNavigate = useNavigate();
  const { isLoggedIn: liveIsLoggedIn } = useAuthSession();
  const {
    notifications: liveNotifications,
    setNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotificationStore(
    useShallow((state) => ({
      notifications: state.notifications,
      setNotifications: state.setNotifications,
      markAsRead: state.markAsRead,
      markAllAsRead: state.markAllAsRead,
      removeNotification: state.removeNotification,
    })),
  );
  const [activeTab, setActiveTab] = useState<TabType>(initialActiveTabOverride);
  const [liveBrowserPermission, setLiveBrowserPermission] = useState<BrowserNotificationPermission>(
    () => browserPermissionOverride ?? getBrowserNotificationPermission(),
  );
  const [notificationLoadState, setNotificationLoadState] = useState<NotificationPanelLoadState>(
    notificationsOverride === undefined
      ? { status: 'idle' }
      : { status: 'success', notifications: [...notificationsOverride] },
  );
  const isLoggedIn = isLoggedInOverride ?? liveIsLoggedIn;
  const notifications = notificationsOverride ?? liveNotifications;
  const browserPermission = browserPermissionOverride ?? liveBrowserPermission;
  const navigate = runtimeOverride?.navigate ?? liveNavigate;
  const now = useMemo(
    () => new Date(nowOverride ?? Date.now()),
    [nowOverride],
  );
  const unreadCount = useMemo(
    () => notifications.reduce((count, notif) => (!notif.isRead ? count + 1 : count), 0),
    [notifications],
  );
  const usesDeterministicNotifications = notificationsOverride !== undefined;

  const loadNotifications = useCallback(async () => {
    const shouldLoadNotifications = notificationsOverride === undefined && isLoggedIn;
    if (!shouldLoadNotifications) {
      return;
    }

    await loadNotificationPanelNotifications({
      getNotifications: runtimeOverride?.getNotifications,
      onStateChange: (state) => {
        setNotificationLoadState(state);
        if (state.status === 'success') {
          setNotifications(state.notifications);
        } else if (state.status === 'error' && !isIgnorableNotificationError(state.error)) {
          console.error('알림 불러오기 오류:', state.error);
        }
      },
    });
  }, [isLoggedIn, notificationsOverride, runtimeOverride?.getNotifications, setNotifications]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        const markAsReadRequest = runtimeOverride?.markAsRead
          ?? (usesDeterministicNotifications ? async () => {} : notificationApi.markAsRead);
        await markAsReadRequest(notification.id);
        markAsRead(notification.id);
      }

      if (notification.type === 'APPLICATION_RECEIVED' || notification.type === 'HOST_RESPONSE_NUDGE') {
        navigate(`/mate/${notification.relatedId}/manage`);
      } else if (MATE_NOTIFICATION_TYPES.includes(notification.type)) {
        navigate(`/mate/${notification.relatedId}`);
      } else if (['POST_COMMENT', 'COMMENT_REPLY', 'POST_LIKE', 'POST_REPOST'].includes(notification.type)) {
        navigate(`/cheer/${notification.relatedId}`, { state: { highlightCheerPost: true } });
      } else if (notification.type === 'NEW_FOLLOWER') {
        navigate('/cheer');
      } else if (notification.type === 'FOLLOWING_NEW_POST') {
        navigate(`/cheer/${notification.relatedId}`, { state: { highlightCheerPost: true } });
      } else if (notification.type === 'NEW_DEVICE_LOGIN') {
        navigate('/mypage?view=accountSettings');
      } else if (notification.type === 'RANKING_PREDICTION_SETTLED') {
        navigate('/prediction?tab=ranking');
      }
    } catch (error) {
      console.error('알림 처리 오류:', error);
      toast.error('알림 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      const deleteNotification = runtimeOverride?.deleteNotification
        ?? (usesDeterministicNotifications ? async () => {} : notificationApi.deleteNotification);
      await deleteNotification(notificationId);
      removeNotification(notificationId);
    } catch (error) {
      console.error('알림 삭제 오류:', error);
      toast.error('알림 삭제에 실패했습니다.');
    }
  };

  const handleMarkAllRead = async () => {
    const requestStartedAt = now.getTime();
    try {
      const markAllAsReadRequest = runtimeOverride?.markAllAsRead
        ?? (usesDeterministicNotifications ? async () => {} : notificationApi.markAllAsRead);
      await markAllAsReadRequest();
      markAllAsRead(requestStartedAt);
    } catch (error) {
      console.error('일괄 읽음 처리 오류:', error);
      toast.error('일괄 읽음 처리에 실패했습니다.');
    }
  };

  const handleEnableBrowserNotifications = async () => {
    const requestPermission = runtimeOverride?.requestBrowserNotificationPermission
      ?? requestBrowserNotificationPermission;
    setLiveBrowserPermission(await requestPermission());
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'APPLICATION_RECEIVED': return <NotificationBellIcon className="h-5 w-5 text-blue-500" />;
      case 'APPLICATION_APPROVED': return <NotificationCheckIcon className="h-5 w-5 text-green-500" />;
      case 'APPLICATION_REJECTED': return <NotificationCloseIcon className="h-5 w-5 text-red-500" />;
      case 'PARTY_EXPIRED': return <NotificationAlertTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'PARTY_AUTO_COMPLETED': return <NotificationCheckIcon className="h-5 w-5 text-gray-500" />;
      case 'GAME_TOMORROW_REMINDER': return <NotificationCalendarIcon className="h-5 w-5 text-blue-500" />;
      case 'GAME_DAY_REMINDER': return <NotificationCalendarIcon className="h-5 w-5 text-green-500" />;
      case 'HOST_RESPONSE_NUDGE': return <NotificationClockIcon className="h-5 w-5 text-orange-500" />;
      case 'REVIEW_REQUEST': return <NotificationStarIcon className="h-5 w-5 text-yellow-500" />;
      case 'POST_COMMENT': return <NotificationMessageCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'COMMENT_REPLY': return <NotificationMessageSquareIcon className="h-5 w-5 text-purple-500" />;
      case 'POST_LIKE': return <NotificationHeartIcon className="h-5 w-5 fill-pink-500 text-pink-500" />;
      case 'POST_REPOST': return <NotificationRepeatIcon className="h-5 w-5 text-emerald-500" />;
      case 'NEW_FOLLOWER': return <NotificationUserPlusIcon className="h-5 w-5 text-green-500" />;
      case 'FOLLOWING_NEW_POST': return <NotificationFileTextIcon className="h-5 w-5 text-blue-500" />;
      case 'NEW_DEVICE_LOGIN': return <NotificationShieldAlertIcon className="h-5 w-5 text-red-500" />;
      case 'RANKING_PREDICTION_SETTLED': return <NotificationCheckCheckIcon className="h-5 w-5 text-emerald-500" />;
      default: return <NotificationBellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const renderMessageWithBold = (message: string) => {
    const parts = message.split(/([^\s]+님|'.*?')/g);
    return parts.map((part, index) => {
      if (part.match(/[^\s]+님|'.*?'/)) {
        return <strong key={index} className="font-bold text-gray-900 dark:text-white">{part}</strong>;
      }
      return part;
    });
  };

  const groupNotifications = (notifs: readonly Notification[]) => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const groups: Record<string, Notification[]> = {
      '오늘': [],
      '이번 주': [],
      '이전 알림': [],
    };

    notifs.forEach((notification) => {
      const date = new Date(notification.createdAt);
      if (date >= today) {
        groups['오늘'].push(notification);
      } else if (date >= startOfWeek) {
        groups['이번 주'].push(notification);
      } else {
        groups['이전 알림'].push(notification);
      }
    });

    return groups;
  };

  const filteredNotifications = useMemo(() => notifications.filter((notification) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'MATE') return MATE_NOTIFICATION_TYPES.includes(notification.type);
    if (activeTab === 'CHEER') return CHEER_NOTIFICATION_TYPES.includes(notification.type);
    return true;
  }), [notifications, activeTab]);

  const groupedNotifications = groupNotifications(filteredNotifications);

  return (
    <div data-testid="notification-panel" className="min-w-0">
      {browserPermission === 'default' && (
        <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 text-body sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/50 dark:bg-blue-950/30">
          <p className="min-w-0 break-words text-blue-900 dark:text-blue-100">
            브라우저 알림을 켜면 새 소식을 바로 받을 수 있습니다.
          </p>
          <button
            type="button"
            data-testid="notification-enable-browser"
            onClick={handleEnableBrowserNotifications}
            className="min-h-11 shrink-0 rounded-lg border border-blue-300 bg-white px-3 font-bold text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100"
          >
            알림 켜기
          </button>
        </div>
      )}

      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white dark:border-border dark:bg-card">
        <div className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div data-testid="notification-tabs" className="grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto sm:gap-2" role="tablist" aria-label="알림 카테고리">
            {(['ALL', 'MATE', 'CHEER'] as TabType[]).map((tab) => (
              <button
                type="button"
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                data-testid={`notification-tab-${tab.toLowerCase()}`}
                onClick={() => setActiveTab(tab)}
                className={`min-h-11 rounded-md border-b-2 px-2 text-body font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                  }`}
              >
                {tab === 'ALL' ? '전체' : tab === 'MATE' ? '메이트' : '응원석'}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              data-testid="notification-mark-all-read"
              onClick={handleMarkAllRead}
              className="flex min-h-11 shrink-0 items-center justify-center gap-1 self-end rounded-md px-2 text-body text-gray-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:text-gray-300"
            >
              <NotificationCheckCheckIcon className="h-4 w-4" />
              모두 읽음
            </button>
          )}
        </div>
      </div>

      <div className="min-h-[300px] min-w-0 p-0">
        {notificationLoadState.status === 'loading' ? (
          <div
            data-testid="notification-loading"
            role="status"
            className="flex min-h-[300px] items-center justify-center px-4 py-16 text-center text-body text-gray-500 dark:text-gray-300"
          >
            알림을 불러오는 중입니다.
          </div>
        ) : notificationLoadState.status === 'error' ? (
          <div
            data-testid="notification-error"
            role="alert"
            className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-4 py-16 text-center"
          >
            <p className="break-words text-body text-gray-600 dark:text-gray-200">
              알림을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              data-testid="notification-retry"
              onClick={() => void loadNotifications()}
              className="min-h-11 rounded-lg border border-gray-300 px-4 text-body font-bold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-gray-600 dark:text-gray-100"
            >
              다시 시도
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div data-testid="notification-empty" className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-6 dark:bg-secondary">
              <NotificationBellIcon className="h-8 w-8 text-gray-400 dark:text-white" />
            </div>
            <p className="mb-1 break-words font-bold text-gray-900 dark:text-white">
              새로운 알림이 없습니다
            </p>
            <p className="break-words text-body text-gray-500 dark:text-gray-300">
              {activeTab === 'ALL' ? '새로운 소식이 도착하면 알려드릴게요!' : '해당 카테고리의 알림이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="min-w-0 divide-y divide-gray-100 dark:divide-gray-700">
            {Object.entries(groupedNotifications).map(([groupName, groupNotifs]) => (
              groupNotifs.length > 0 && (
                <section key={groupName} aria-labelledby={`notification-group-${groupName}`}>
                  <h3
                    id={`notification-group-${groupName}`}
                    className="bg-gray-50/50 px-4 py-2 text-body font-bold uppercase tracking-wider text-gray-500 dark:bg-card/50 dark:text-gray-300"
                  >
                    {groupName}
                  </h3>
                  {groupNotifs.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group relative min-w-0 transition-colors duration-500 ${notification.isRead
                        ? 'bg-white hover:bg-gray-50 dark:bg-card dark:hover:bg-gray-700/50'
                        : 'bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20'
                        }`}
                    >
                      <button
                        type="button"
                        data-testid={`notification-item-${notification.id}`}
                        onClick={() => handleNotificationClick(notification)}
                        className="block min-h-[96px] w-full min-w-0 p-4 pr-16 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <span className="flex min-w-0 gap-3">
                          <span className="mt-0.5 flex-shrink-0">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm ${notification.isRead
                              ? 'bg-gray-100 dark:bg-secondary'
                              : 'border-2 border-blue-100 bg-white dark:border-blue-900 dark:bg-card'
                              }`}
                            >
                              {getNotificationIcon(notification.type)}
                            </span>
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="mb-1 flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
                              <span className="min-w-0 break-words [overflow-wrap:anywhere] text-body font-bold text-gray-900 dark:text-white">
                                {notification.title}
                              </span>
                              <span className="shrink-0 text-body text-gray-500 dark:text-gray-300">
                                {formatTime(notification.createdAt)}
                              </span>
                            </span>
                            <span className="line-clamp-3 break-words [overflow-wrap:anywhere] text-body leading-relaxed text-gray-600 dark:text-gray-200">
                              {renderMessageWithBold(notification.message)}
                            </span>
                          </span>
                        </span>

                        {!notification.isRead && (
                          <span className="absolute right-3 top-3 h-2 w-2 rounded-full border-2 border-white bg-blue-500 dark:border-gray-800" aria-label="읽지 않음" />
                        )}
                      </button>

                      <button
                        type="button"
                        data-testid={`notification-delete-${notification.id}`}
                        onClick={() => handleDelete(notification.id)}
                        className="absolute bottom-2 right-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-gray-500 opacity-100 sm:opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 dark:text-gray-300 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        aria-label={`${notification.title} 알림 삭제`}
                        title="알림 삭제"
                      >
                        <NotificationTrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </section>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
