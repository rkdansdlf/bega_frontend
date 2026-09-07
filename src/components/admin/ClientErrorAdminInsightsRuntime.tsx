import type { AdminClientErrorDashboard } from '../../types/admin';
import { getTimeAgo } from '../../utils/formatters';
import { AdminLinkIcon, AdminSirenIcon } from './AdminDetailIcons';
import { AdminBadge } from './AdminPanelPrimitives';
import {
  bucketBadgeClass,
  channelBadgeClass,
  formatDetailedDateTime,
} from './clientErrorAdminShared';

export default function ClientErrorAdminInsightsRuntime({
  dashboard,
}: {
  dashboard: AdminClientErrorDashboard | null;
}) {
  return (
    <div
      data-testid="admin-client-error-insights"
      className="grid min-w-0 gap-6 xl:grid-cols-2"
    >
      <section
        data-testid="admin-client-error-feedback-section"
        aria-labelledby="admin-client-error-feedback-heading"
        className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-3">
          <AdminLinkIcon className="h-5 w-5 shrink-0 text-amber-300" />
          <div className="min-w-0">
            <h3 id="admin-client-error-feedback-heading" className="text-lg font-bold text-white">
              Recent Feedback
            </h3>
            <p className="text-caption text-slate-400 [overflow-wrap:anywhere]">
              사용자가 Error ID 기준으로 전송한 최신 제보입니다.
            </p>
          </div>
        </div>

        <div
          data-testid="admin-client-error-feedback-list"
          data-vqa-max-height="480"
          className="min-w-0 space-y-3 overflow-x-hidden overflow-y-auto pr-1"
          style={{ maxHeight: 480 }}
        >
          {dashboard?.recentFeedback.length ? dashboard.recentFeedback.map((item) => (
            <div
              key={`${item.eventId}-${item.occurredAt}`}
              data-testid="admin-client-error-feedback-card"
              className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 [overflow-wrap:anywhere]"
            >
              <div
                data-testid="admin-client-error-feedback-card-header"
                className="mb-2 flex min-w-0 flex-wrap items-start justify-between gap-3"
              >
                <AdminBadge className={bucketBadgeClass.feedback}>FEEDBACK</AdminBadge>
                <span className="ml-auto min-w-0 text-caption text-slate-500 [overflow-wrap:anywhere]">
                  {getTimeAgo(item.occurredAt)}
                </span>
              </div>
              <p className="text-caption text-slate-100">{item.comment}</p>
              <div className="mt-3 min-w-0 space-y-1 text-caption text-slate-400">
                <p>eventId: {item.eventId}</p>
                <p>route: {item.route}</p>
                <p>actionTaken: {item.actionTaken}</p>
              </div>
            </div>
          )) : (
            <div
              data-testid="admin-client-error-feedback-empty"
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-caption text-slate-500"
            >
              최근 피드백이 없습니다.
            </div>
          )}
        </div>
      </section>

      <section
        data-testid="admin-client-error-alerts-section"
        aria-labelledby="admin-client-error-alerts-heading"
        className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-3">
          <AdminSirenIcon className="h-5 w-5 shrink-0 text-rose-300" />
          <div className="min-w-0">
            <h3 id="admin-client-error-alerts-heading" className="text-lg font-bold text-white">
              Recent Alerts
            </h3>
            <p className="text-caption text-slate-400 [overflow-wrap:anywhere]">
              백엔드가 설정된 채널로 전송한 최근 알림 결과입니다.
            </p>
          </div>
        </div>

        <div
          data-testid="admin-client-error-alerts-list"
          data-vqa-max-height="480"
          className="min-w-0 space-y-3 overflow-x-hidden overflow-y-auto pr-1"
          style={{ maxHeight: 480 }}
        >
          {dashboard?.recentAlerts.length ? dashboard.recentAlerts.map((item) => (
            <div
              key={item.id}
              data-testid="admin-client-error-alert-card"
              className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 [overflow-wrap:anywhere]"
            >
              <div
                data-testid="admin-client-error-alert-card-header"
                className="mb-2 flex min-w-0 flex-wrap items-start justify-between gap-3"
              >
                <div
                  data-testid="admin-client-error-alert-badges"
                  className="flex min-w-0 max-w-full flex-wrap items-center gap-2"
                >
                  <AdminBadge className={bucketBadgeClass[item.bucket]}>{item.bucket.toUpperCase()}</AdminBadge>
                  <AdminBadge className={channelBadgeClass[item.channel]}>{item.channel.toUpperCase()}</AdminBadge>
                  <AdminBadge className={item.deliveryStatus === 'SENT' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-red-500/30 bg-red-500/15 text-red-300'}>
                    {item.deliveryStatus}
                  </AdminBadge>
                </div>
                <span className="ml-auto min-w-0 text-caption text-slate-500 [overflow-wrap:anywhere]">
                  {formatDetailedDateTime(item.notifiedAt)}
                </span>
              </div>
              <p className="text-caption text-slate-100">{item.latestMessage || '메시지 없음'}</p>
              <div className="mt-3 min-w-0 space-y-1 text-caption text-slate-400">
                <p>route: {item.route}</p>
                <p>count: {item.observedCount} / threshold {item.thresholdCount}</p>
                <p>fingerprint: {item.fingerprint}</p>
                {item.failureReason ? <p className="text-red-300">failure: {item.failureReason}</p> : null}
              </div>
            </div>
          )) : (
            <div
              data-testid="admin-client-error-alerts-empty"
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-caption text-slate-500"
            >
              최근 알림 이력이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
