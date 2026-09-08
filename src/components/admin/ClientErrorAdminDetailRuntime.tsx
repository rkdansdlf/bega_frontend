import type { AdminClientErrorEventDetail } from '../../types/admin';
import PlainDialog from '../ui/plain-dialog';
import { AdminAlertTriangleIcon } from './AdminDetailIcons';
import { AdminBadge } from './AdminPanelPrimitives';
import {
  bucketBadgeClass,
  formatDetailedDateTime,
  sourceBadgeClass,
} from './clientErrorAdminShared';

export default function ClientErrorAdminDetailRuntime({
  open,
  detailLoading,
  selectedEvent,
  onClose,
  onOpenDetail,
}: {
  open: boolean;
  detailLoading: boolean;
  selectedEvent: AdminClientErrorEventDetail | null;
  onClose: () => void;
  onOpenDetail: (eventId: string) => void | Promise<void>;
}) {
  return (
    <PlainDialog
      open={open}
      onClose={onClose}
      title="Client Error Detail"
      description="Error ID 기준 raw stack, feedback, 동일 fingerprint 최근 이벤트를 함께 봅니다."
      contentTestId="admin-client-error-detail"
      initialFocus="container"
      className="sm:max-w-4xl border-slate-700 bg-slate-950 text-slate-100"
      bodyClassName="overflow-x-hidden overflow-y-auto"
      bodyStyle={{ maxHeight: 'calc(85dvh - 5.5rem)' }}
    >
      {detailLoading ? (
        <div
          data-testid="admin-client-error-detail-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="min-w-0 py-12 text-center text-slate-400 [overflow-wrap:anywhere]"
        >
          상세 정보를 불러오는 중입니다.
        </div>
      ) : selectedEvent ? (
        <div
          data-testid="admin-client-error-detail-content"
          className="min-w-0 space-y-6 [overflow-wrap:anywhere]"
        >
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div
              data-testid="admin-client-error-detail-metadata"
              className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 [overflow-wrap:anywhere]"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <AdminBadge className={bucketBadgeClass[selectedEvent.event.bucket]}>{selectedEvent.event.bucket.toUpperCase()}</AdminBadge>
                <AdminBadge className={sourceBadgeClass[selectedEvent.event.source]}>{selectedEvent.event.source}</AdminBadge>
                <AdminBadge className="border-slate-700 bg-slate-800 text-slate-200">{selectedEvent.event.statusGroup}</AdminBadge>
              </div>
              <div className="min-w-0 space-y-2 text-caption text-slate-300 [overflow-wrap:anywhere]">
                <p className="font-mono text-caption text-slate-500 [overflow-wrap:anywhere]">{selectedEvent.event.eventId}</p>
                <p>{selectedEvent.event.message}</p>
                <p>route: {selectedEvent.event.route}</p>
                <p>endpoint: {selectedEvent.event.endpoint || '-'}</p>
                <p>occurredAt: {formatDetailedDateTime(selectedEvent.event.occurredAt)}</p>
                <p>feedbackCount: {selectedEvent.event.feedbackCount}</p>
                <p>fingerprint: {selectedEvent.event.fingerprint}</p>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 [overflow-wrap:anywhere]">
              <h4 className="mb-3 flex min-w-0 items-center gap-2 text-caption font-semibold uppercase tracking-[0.2em] text-slate-400 [overflow-wrap:anywhere]">
                <AdminAlertTriangleIcon className="h-4 w-4" />
                Feedback
              </h4>
              <div className="min-w-0 space-y-3">
                {selectedEvent.feedback.length ? selectedEvent.feedback.map((item) => (
                  <div
                    key={`${item.eventId}-${item.occurredAt}-${item.actionTaken}`}
                    data-testid="admin-client-error-feedback-item"
                    className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/80 p-3 [overflow-wrap:anywhere]"
                  >
                    <p className="text-caption text-slate-100 [overflow-wrap:anywhere]">{item.comment}</p>
                    <p className="mt-2 text-caption text-slate-500 [overflow-wrap:anywhere]">
                      {item.actionTaken} · {formatDetailedDateTime(item.occurredAt)}
                    </p>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-800 px-3 py-8 text-center text-caption text-slate-500">
                    연결된 피드백이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h4 className="mb-3 text-caption font-semibold uppercase tracking-[0.2em] text-slate-400 [overflow-wrap:anywhere]">Stack Trace</h4>
              <pre
                data-testid="admin-client-error-stack"
                data-vqa-max-height="280"
                className="w-full min-w-0 max-w-full overflow-auto rounded-xl bg-slate-950/80 p-4 text-caption text-slate-200"
                style={{ maxHeight: 280 }}
              >
                {selectedEvent.stack || 'No stack trace'}
              </pre>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h4 className="mb-3 text-caption font-semibold uppercase tracking-[0.2em] text-slate-400 [overflow-wrap:anywhere]">Component Stack</h4>
              <pre
                data-testid="admin-client-error-component-stack"
                data-vqa-max-height="280"
                className="w-full min-w-0 max-w-full overflow-auto rounded-xl bg-slate-950/80 p-4 text-caption text-slate-200"
                style={{ maxHeight: 280 }}
              >
                {selectedEvent.componentStack || 'No component stack'}
              </pre>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 [overflow-wrap:anywhere]">
            <h4 className="mb-3 text-caption font-semibold uppercase tracking-[0.2em] text-slate-400 [overflow-wrap:anywhere]">같은 Fingerprint 최근 이벤트</h4>
            <div className="min-w-0 space-y-3">
              {selectedEvent.sameFingerprintRecentEvents.length ? selectedEvent.sameFingerprintRecentEvents.map((item) => (
                <button
                  key={item.eventId}
                  type="button"
                  data-testid={`admin-client-error-recent-${item.eventId}`}
                  data-vqa-min-touch="44"
                  aria-label={`최근 오류 이벤트 ${item.eventId} 상세 보기`}
                  onClick={() => void onOpenDetail(item.eventId)}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-left transition [overflow-wrap:anywhere] hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <AdminBadge className={sourceBadgeClass[item.source]}>{item.source}</AdminBadge>
                    <span className="text-caption text-slate-500">{formatDetailedDateTime(item.occurredAt)}</span>
                  </div>
                  <p className="mt-2 min-w-0 text-caption text-slate-100 [overflow-wrap:anywhere]">{item.message}</p>
                </button>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-800 px-3 py-8 text-center text-caption text-slate-500">
                  같은 fingerprint의 최근 이벤트가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          data-testid="admin-client-error-detail-missing"
          role="alert"
          aria-live="polite"
          className="min-w-0 py-12 text-center text-slate-400 [overflow-wrap:anywhere]"
        >
          선택한 이벤트를 불러오지 못했습니다.
        </div>
      )}
    </PlainDialog>
  );
}
