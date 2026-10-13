import NotificationPanel from '../NotificationPanel';
import type { NotificationPanelProps } from '../NotificationPanel';

export type AlertsSectionProps = {
  notificationPanelPropsOverride?: NotificationPanelProps;
};

export default function AlertsSection({
  notificationPanelPropsOverride: requestedNotificationPanelPropsOverride,
}: AlertsSectionProps = {}) {
  const notificationPanelPropsOverride = import.meta.env.PROD === true
    ? undefined
    : requestedNotificationPanelPropsOverride;

  return (
    <section data-screen-label="알림" data-testid="mypage-alerts-section">
      <div className="mypage-season-head">
        <div>
          <h1>알림</h1>
          <p>메이트, 응원석, 계정 보안 알림을 확인해요</p>
        </div>
      </div>

      <div className="mypage-season-panel p-0">
        <NotificationPanel {...notificationPanelPropsOverride} />
      </div>
    </section>
  );
}
