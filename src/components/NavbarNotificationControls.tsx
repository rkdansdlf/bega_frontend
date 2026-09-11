import { Suspense, lazy, type CSSProperties, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../lib/utils';
import { useNotificationStore } from '../store/notificationStore';
import { useUIStore } from '../store/uiStore';
import { NavbarBellIcon as BellIcon } from './icons/NavbarIcons';
import PlainMenu from './ui/plain-menu';
import type { NotificationPanelProps } from './NotificationPanel';

const NotificationPanel = lazy(() => import('./NotificationPanel'));

type NavbarNotificationControlsProps = {
  buttonClassName: string;
  onOpenChangeOverride?: (open: boolean) => void;
  notificationPanelPropsOverride?: NotificationPanelProps;
  openOverride?: boolean;
  panelContentOverride?: ReactNode;
  unreadCountOverride?: number;
  buttonStyle?: CSSProperties;
  iconStyle?: CSSProperties;
};

const normalizeUnreadCount = (count: number) => (
  Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
);

export default function NavbarNotificationControls({
  buttonClassName,
  onOpenChangeOverride,
  notificationPanelPropsOverride,
  openOverride,
  panelContentOverride,
  unreadCountOverride,
  buttonStyle,
  iconStyle,
}: NavbarNotificationControlsProps) {
  const { isNotificationOpen: liveIsNotificationOpen, setIsNotificationOpen } = useUIStore(
    useShallow((state) => ({
      isNotificationOpen: state.isNotificationOpen,
      setIsNotificationOpen: state.setIsNotificationOpen,
    })),
  );
  const liveUnreadCount = useNotificationStore(
    (state) => state.notifications.reduce(
      (count, notification) => (!notification.isRead ? count + 1 : count),
      0,
    ),
  );
  const isNotificationOpen = openOverride ?? liveIsNotificationOpen;
  const unreadCount = normalizeUnreadCount(unreadCountOverride ?? liveUnreadCount);
  const updateOpenState = onOpenChangeOverride ?? setIsNotificationOpen;
  const visibleUnreadCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <PlainMenu
      open={isNotificationOpen}
      onOpenChange={updateOpenState}
      align="end"
      role="dialog"
      panelClassName="w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] overflow-hidden sm:w-[360px] sm:max-w-[360px]"
      trigger={(
        <button
          type="button"
          onClick={() => updateOpenState(!isNotificationOpen)}
          className={cn(
            'relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            buttonClassName,
          )}
          style={buttonStyle}
          data-testid="navbar-notification-trigger"
          aria-label={`알림${unreadCount > 0 ? ` (읽지 않은 알림 ${unreadCount}개)` : ''}`}
          aria-expanded={isNotificationOpen}
          aria-haspopup="dialog"
          aria-controls="global-notification-popover"
        >
          <span
            className={unreadCount > 0 ? 'inline-flex animate-pulse' : 'inline-flex'}
            aria-hidden="true"
          >
            <BellIcon
              className={`h-6 w-6 ${unreadCount > 0 ? 'text-primary dark:text-primary-light' : ''}`}
              style={iconStyle}
            />
          </span>

          {unreadCount > 0 && (
            <span
              data-testid="navbar-notification-unread-badge"
              className="pointer-events-none absolute right-1 top-1 flex h-5 min-w-5 max-w-7 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-red-600 px-0.5 text-10 font-bold leading-none text-white"
              aria-hidden="true"
            >
              {visibleUnreadCount}
            </span>
          )}
        </button>
      )}
    >
      <div
        id="global-notification-popover"
        data-testid="navbar-notification-popover"
        aria-label="알림 목록"
        className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-border dark:bg-card"
      >
        <div className="flex min-w-0 items-start justify-between gap-3 border-b border-gray-200 bg-gray-50/50 p-4 dark:border-border dark:bg-secondary/70">
          <h3 className="shrink-0 font-bold text-body text-primary dark:text-primary-light">
            알림
          </h3>
          {unreadCount > 0 && (
            <span
              className="min-w-0 break-words text-right text-body text-muted-foreground dark:text-white"
              aria-label={`${unreadCount}개의 읽지 않은 알림`}
            >
              {visibleUnreadCount}개의 읽지 않은 알림
            </span>
          )}
        </div>
        <div className="max-h-[60vh] min-w-0 overflow-y-auto overscroll-contain">
          {panelContentOverride ?? (
            <Suspense
              fallback={(
                <div
                  data-testid="navbar-notification-panel-fallback"
                  className="flex min-h-[300px] items-center justify-center px-4 text-center text-body text-muted-foreground"
                >
                  알림을 불러오는 중...
                </div>
              )}
            >
              <NotificationPanel {...notificationPanelPropsOverride} />
            </Suspense>
          )}
        </div>
      </div>
    </PlainMenu>
  );
}
