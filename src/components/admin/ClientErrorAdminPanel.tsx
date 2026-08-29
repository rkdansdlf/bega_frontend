import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { AdminBadge } from './AdminPanelPrimitives';
import {
  AdminClockIcon,
  AdminFilterIcon,
  AdminRefreshIcon,
} from './AdminDetailIcons';
import {
  AdminBugIcon,
  AdminSearchIcon,
} from './AdminPanelIcons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import ViewportDeferred from '../ViewportDeferred';
import {
  fetchAdminClientErrorDashboard,
  fetchAdminClientErrorEventDetail,
  fetchAdminClientErrorEvents,
} from '../../api/admin';
import type {
  AdminClientErrorDashboard,
  AdminClientErrorEventDetail,
  AdminClientErrorEventPage,
} from '../../types/admin';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { getTimeAgo } from '../../utils/formatters';
import {
  adminNativeSelectClassName,
  bucketBadgeClass,
  channelBadgeClass,
  formatDetailedDateTime,
  sourceBadgeClass,
} from './clientErrorAdminShared';
import {
  createClientErrorEventFilterKey,
  createClientErrorEventRequestCoordinator,
  type ClientErrorEventRequestCoordinator,
} from './clientErrorAdminRequestCoordinator';

const ClientErrorTrendChart = lazy(() => import('./ClientErrorTrendChart'));
const ClientErrorAdminInsightsRuntime = lazy(() => import('./ClientErrorAdminInsightsRuntime'));
const ClientErrorAdminDetailRuntime = lazy(() => import('./ClientErrorAdminDetailRuntime'));

export type ClientErrorAdminWindowKey = '1h' | '24h' | '7d';

export interface ClientErrorAdminEventFilters {
  bucket: 'all' | 'api' | 'runtime';
  source: 'all' | 'api' | 'runtime' | 'unhandled_rejection';
  statusGroup: 'all' | '5xx' | '4xx' | 'none';
  route: string;
  fingerprint: string;
  search: string;
}

export interface ClientErrorAdminPanelVisualQaState {
  active: boolean;
  windowKey: ClientErrorAdminWindowKey;
  filters: ClientErrorAdminEventFilters;
  dashboard: AdminClientErrorDashboard | null;
  eventsPage: AdminClientErrorEventPage;
  currentPage: number;
  loadingDashboard: boolean;
  loadingEvents: boolean;
  panelError: string | null;
  detailOpen: boolean;
  detailLoading: boolean;
  selectedEvent: AdminClientErrorEventDetail | null;
  chartPhase: 'fallback' | 'resolved';
  insightsPhase: 'deferred-fallback' | 'suspense-fallback' | 'resolved';
  detailPhase: 'closed' | 'suspense-fallback' | 'resolved';
}

export interface ClientErrorAdminPanelVisualQaRenderers {
  chart?: (props: ComponentProps<typeof ClientErrorTrendChart>) => ReactNode;
  detail?: (props: ComponentProps<typeof ClientErrorAdminDetailRuntime>) => ReactNode;
  insights?: (props: ComponentProps<typeof ClientErrorAdminInsightsRuntime>) => ReactNode;
}

export interface ClientErrorAdminPanelProps {
  active: boolean;
  visualQaStateOverride?: ClientErrorAdminPanelVisualQaState;
  visualQaRenderers?: ClientErrorAdminPanelVisualQaRenderers;
}

const WINDOW_LABEL: Record<ClientErrorAdminWindowKey, string> = {
  '1h': '최근 1시간',
  '24h': '최근 24시간',
  '7d': '최근 7일',
};

const initialEventPage: AdminClientErrorEventPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 20,
  number: 0,
  last: true,
};

const initialFilters: ClientErrorAdminEventFilters = {
  bucket: 'all',
  source: 'all',
  statusGroup: 'all',
  route: '',
  fingerprint: '',
  search: '',
};

const buildWindowRange = (windowKey: ClientErrorAdminWindowKey) => {
  const to = new Date();
  const from = new Date(to);

  if (windowKey === '1h') {
    from.setHours(from.getHours() - 1);
  } else if (windowKey === '24h') {
    from.setHours(from.getHours() - 24);
  } else {
    from.setDate(from.getDate() - 7);
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

const formatAxisLabel = (value: string, granularity: 'hour' | 'day') => {
  const date = new Date(value);
  if (granularity === 'day') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${String(date.getHours()).padStart(2, '0')}:00`;
};

function MonitoringCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'api' | 'runtime' | 'feedback';
}) {
  const toneClass = {
    api: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    runtime: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    feedback: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  }[tone];

  return (
    <div className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${toneClass}`}>
      <p className="min-w-0 text-caption uppercase tracking-[0.2em] text-slate-400 [overflow-wrap:anywhere]">{label}</p>
      <p className="mt-3 min-w-0 text-3xl font-black [overflow-wrap:anywhere] sm:text-4xl">{value.toLocaleString()}</p>
    </div>
  );
}

function ClientErrorInsightsSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      data-testid={compact
        ? 'admin-client-error-insights-skeleton-compact'
        : 'admin-client-error-insights-skeleton-full'}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid min-w-0 gap-6 xl:grid-cols-2"
    >
      {[1, 2].map((item) => (
        <section key={item} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-32 rounded bg-slate-800" />
            <div className="h-4 w-56 rounded bg-slate-800" />
            {!compact ? (
              <div className="space-y-3 pt-2">
                {[1, 2].map((card) => (
                  <div key={card} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="h-4 w-24 rounded bg-slate-800" />
                    <div className="mt-3 h-4 w-full rounded bg-slate-800" />
                    <div className="mt-2 h-4 w-5/6 rounded bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function ClientErrorChartFallback() {
  return (
    <div
      data-testid="admin-client-error-chart-fallback"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex h-full min-w-0 items-center justify-center text-slate-400 [overflow-wrap:anywhere]"
    >
      차트 로딩 중...
    </div>
  );
}

function ClientErrorDetailFallback({ onClose }: { onClose: () => void }) {
  return (
    <PlainDialog
      open
      onClose={onClose}
      title="Client Error Detail"
      description="Client error detail loading"
      contentTestId="admin-client-error-detail-fallback"
      initialFocus="container"
      className="border-slate-700 bg-slate-950 text-slate-100"
      bodyClassName="overflow-x-hidden overflow-y-auto"
    >
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex min-h-48 min-w-0 items-center justify-center text-slate-400 [overflow-wrap:anywhere]"
      >
        상세 화면을 준비하고 있습니다.
      </div>
    </PlainDialog>
  );
}

const validateVisualQaState = (
  state: ClientErrorAdminPanelVisualQaState,
  renderers: ClientErrorAdminPanelVisualQaRenderers | undefined,
) => {
  if (state.chartPhase !== 'fallback' && state.chartPhase !== 'resolved') {
    throw new Error('ClientErrorAdminPanel Visual QA chart phase is invalid.');
  }
  if (
    state.insightsPhase !== 'deferred-fallback'
    && state.insightsPhase !== 'suspense-fallback'
    && state.insightsPhase !== 'resolved'
  ) {
    throw new Error('ClientErrorAdminPanel Visual QA insights phase is invalid.');
  }
  if (
    state.detailPhase !== 'closed'
    && state.detailPhase !== 'suspense-fallback'
    && state.detailPhase !== 'resolved'
  ) {
    throw new Error('ClientErrorAdminPanel Visual QA detail phase is invalid.');
  }
  if (state.chartPhase === 'resolved' && !renderers?.chart) {
    throw new Error('ClientErrorAdminPanel Visual QA resolved chart renderer is required.');
  }
  if (state.insightsPhase === 'resolved' && !renderers?.insights) {
    throw new Error('ClientErrorAdminPanel Visual QA resolved insights renderer is required.');
  }
  if (state.detailPhase === 'closed') {
    if (state.detailOpen) {
      throw new Error('ClientErrorAdminPanel Visual QA closed detail phase must not be open.');
    }
    return;
  }
  if (!state.detailOpen) {
    throw new Error('ClientErrorAdminPanel Visual QA detail phase requires an open detail.');
  }
  if (state.detailPhase === 'resolved' && !renderers?.detail) {
    throw new Error('ClientErrorAdminPanel Visual QA resolved detail renderer is required.');
  }
};

export function ClientErrorAdminPanel({
  active: requestedActive,
  visualQaStateOverride: requestedVisualQaStateOverride,
  visualQaRenderers: requestedVisualQaRenderers,
}: ClientErrorAdminPanelProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaRenderers = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaRenderers;
  const active = visualQaStateOverride?.active ?? requestedActive;
  const [windowKey, setWindowKey] = useState<ClientErrorAdminWindowKey>(
    () => visualQaStateOverride?.windowKey ?? '24h',
  );
  const [dashboard, setDashboard] = useState<AdminClientErrorDashboard | null>(
    () => visualQaStateOverride?.dashboard ?? null,
  );
  const [eventsPage, setEventsPage] = useState<AdminClientErrorEventPage>(
    () => visualQaStateOverride?.eventsPage ?? initialEventPage,
  );
  const [filters, setFilters] = useState<ClientErrorAdminEventFilters>(
    () => visualQaStateOverride?.filters ?? initialFilters,
  );
  const [currentPage, setCurrentPage] = useState(() => visualQaStateOverride?.currentPage ?? 0);
  const [loadingDashboard, setLoadingDashboard] = useState(() => visualQaStateOverride?.loadingDashboard ?? false);
  const [loadingEvents, setLoadingEvents] = useState(() => visualQaStateOverride?.loadingEvents ?? false);
  const [panelError, setPanelError] = useState<string | null>(() => visualQaStateOverride?.panelError ?? null);
  const [detailOpen, setDetailOpen] = useState(() => visualQaStateOverride?.detailOpen ?? false);
  const [detailLoading, setDetailLoading] = useState(() => visualQaStateOverride?.detailLoading ?? false);
  const [selectedEvent, setSelectedEvent] = useState<AdminClientErrorEventDetail | null>(
    () => visualQaStateOverride?.selectedEvent ?? null,
  );
  const eventRequestCoordinatorRef = useRef<ClientErrorEventRequestCoordinator | null>(null);
  if (!eventRequestCoordinatorRef.current) {
    eventRequestCoordinatorRef.current = createClientErrorEventRequestCoordinator();
  }

  if (visualQaStateOverride) {
    validateVisualQaState(visualQaStateOverride, visualQaRenderers);
  }

  const timeRange = buildWindowRange(windowKey);

  const loadDashboard = async () => {
    if (visualQaStateOverride || !active) {
      return;
    }

    setLoadingDashboard(true);
    setPanelError(null);
    try {
      const data = await fetchAdminClientErrorDashboard(timeRange);
      setDashboard(data);
    } catch (error) {
      console.error('클라이언트 에러 대시보드 조회 오류:', error);
      setPanelError(getApiErrorMessage(error, '클라이언트 에러 대시보드를 불러오지 못했습니다.'));
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadEvents = async (page = currentPage) => {
    if (visualQaStateOverride || !active) {
      return;
    }

    setLoadingEvents(true);
    setPanelError(null);
    try {
      const data = await fetchAdminClientErrorEvents({
        bucket: filters.bucket !== 'all' ? filters.bucket : undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
        statusGroup: filters.statusGroup !== 'all' ? filters.statusGroup : undefined,
        route: filters.route || undefined,
        fingerprint: filters.fingerprint || undefined,
        search: filters.search || undefined,
        from: timeRange.from,
        to: timeRange.to,
        page,
        size: 20,
      });
      setEventsPage(data);
      setCurrentPage(data.number ?? page);
    } catch (error) {
      console.error('클라이언트 에러 이벤트 조회 오류:', error);
      setPanelError(getApiErrorMessage(error, '클라이언트 에러 이벤트를 불러오지 못했습니다.'));
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (visualQaStateOverride || !active) {
      return;
    }

    void loadDashboard();
  }, [active, visualQaStateOverride, windowKey]);

  useEffect(() => {
    if (visualQaStateOverride) {
      return;
    }

    eventRequestCoordinatorRef.current?.sync({
      active,
      windowKey,
      filterKey: createClientErrorEventFilterKey(filters),
    }, () => {
      setCurrentPage(0);
      void loadEvents(0);
    });
  }, [
    active,
    filters.bucket,
    filters.source,
    filters.statusGroup,
    filters.route,
    filters.fingerprint,
    filters.search,
    visualQaStateOverride,
    windowKey,
  ]);

  useEffect(() => () => eventRequestCoordinatorRef.current?.dispose(), []);

  const handleRefresh = async () => {
    if (visualQaStateOverride) {
      return;
    }
    await Promise.all([loadDashboard(), loadEvents(currentPage)]);
  };

  const handleOpenDetail = async (eventId: string) => {
    if (visualQaStateOverride) {
      return;
    }
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await fetchAdminClientErrorEventDetail(eventId);
      setSelectedEvent(detail);
    } catch (error) {
      console.error('클라이언트 에러 상세 조회 오류:', error);
      setSelectedEvent(null);
      setPanelError(getApiErrorMessage(error, '클라이언트 에러 상세를 불러오지 못했습니다.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const chartData = dashboard?.timeSeries.map((point) => ({
    ...point,
    label: formatAxisLabel(point.bucketStart, dashboard.granularity),
  })) || [];

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedEvent(null);
  };

  const chartProps: ComponentProps<typeof ClientErrorTrendChart> = {
    chartData,
    loading: loadingDashboard,
  };
  const insightsProps: ComponentProps<typeof ClientErrorAdminInsightsRuntime> = { dashboard };
  const detailProps: ComponentProps<typeof ClientErrorAdminDetailRuntime> = {
    open: detailOpen,
    detailLoading,
    selectedEvent,
    onClose: handleCloseDetail,
    onOpenDetail: (eventId) => void handleOpenDetail(eventId),
  };
  const chartContent = visualQaStateOverride
    ? visualQaStateOverride.chartPhase === 'fallback'
      ? <ClientErrorChartFallback />
      : visualQaRenderers?.chart?.(chartProps)
    : (
      <Suspense fallback={<ClientErrorChartFallback />}>
        <ClientErrorTrendChart {...chartProps} />
      </Suspense>
    );
  const insightsContent = visualQaStateOverride
    ? visualQaStateOverride.insightsPhase === 'deferred-fallback'
      ? <ClientErrorInsightsSkeleton />
      : visualQaStateOverride.insightsPhase === 'suspense-fallback'
        ? <ClientErrorInsightsSkeleton compact />
        : visualQaRenderers?.insights?.(insightsProps)
    : (
      <ViewportDeferred
        fallback={<ClientErrorInsightsSkeleton />}
        rootMargin="240px 0px 280px 0px"
      >
        <Suspense fallback={<ClientErrorInsightsSkeleton compact />}>
          <ClientErrorAdminInsightsRuntime {...insightsProps} />
        </Suspense>
      </ViewportDeferred>
    );
  const detailContent = visualQaStateOverride
    ? visualQaStateOverride.detailPhase === 'closed'
      ? null
      : visualQaStateOverride.detailPhase === 'suspense-fallback'
        ? <ClientErrorDetailFallback onClose={detailProps.onClose} />
        : visualQaRenderers?.detail?.(detailProps)
    : detailOpen ? (
      <Suspense fallback={<ClientErrorDetailFallback onClose={detailProps.onClose} />}>
        <ClientErrorAdminDetailRuntime {...detailProps} />
      </Suspense>
    ) : null;

  return (
    <div
      data-testid="admin-client-error-panel"
      aria-busy={loadingDashboard || loadingEvents || detailLoading || undefined}
      className="min-w-0 space-y-6 overflow-x-hidden"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
              <AdminBugIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">클라이언트 에러 관제</h2>
              <p className="text-caption text-slate-400 [overflow-wrap:anywhere]">
                브라우저가 보고한 API/Runtime/Feedback 이벤트를 한 화면에서 추적합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-start gap-3 sm:w-auto sm:items-center">
          <select
            data-testid="admin-client-error-window"
            aria-label="기간 선택"
            value={windowKey}
            onChange={(event) => setWindowKey(event.target.value as ClientErrorAdminWindowKey)}
            className={`min-h-11 w-full sm:w-[150px] ${adminNativeSelectClassName}`}
          >
            <option value="1h">최근 1시간</option>
            <option value="24h">최근 24시간</option>
            <option value="7d">최근 7일</option>
          </select>

          <Button
            type="button"
            variant="outline"
            data-testid="admin-client-error-refresh"
            aria-label="클라이언트 에러 새로고침"
            onClick={() => void handleRefresh()}
            className="min-h-11 rounded-xl border-slate-700 bg-slate-800/70 text-slate-100 hover:bg-slate-700"
          >
            <AdminRefreshIcon className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
      </div>

      {panelError ? (
        <div
          role="alert"
          className="min-w-0 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-caption text-red-200 [overflow-wrap:anywhere]"
        >
          {panelError}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <MonitoringCard label="API Events" value={dashboard?.totals.api ?? 0} tone="api" />
        <MonitoringCard label="Runtime Events" value={dashboard?.totals.runtime ?? 0} tone="runtime" />
        <MonitoringCard label="Feedback" value={dashboard?.totals.feedback ?? 0} tone="feedback" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white">Bucket별 발생 추이</h3>
              <p className="text-caption text-slate-400 [overflow-wrap:anywhere]">
                {WINDOW_LABEL[windowKey]} 기준 집계. 피드백은 별도 row로 적재된 사용자 제보 수입니다.
              </p>
            </div>
            <AdminBadge className="border-slate-700 bg-slate-800 text-slate-200">
              <AdminClockIcon className="mr-1 h-3 w-3" />
              {dashboard?.granularity === 'day' ? 'Daily' : 'Hourly'}
            </AdminBadge>
          </div>

          <div className="h-[320px] min-w-0">
            {chartContent}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <h3 className="text-lg font-bold text-white">상위 Fingerprints</h3>
          <p className="mb-4 text-caption text-slate-400 [overflow-wrap:anywhere]">
            동일 오류를 hash fingerprint로 묶어 상위 재발 패턴을 확인합니다.
          </p>
          <div
            data-testid="admin-client-error-fingerprints"
            data-vqa-max-height="480"
            className="max-h-[480px] min-w-0 space-y-3 overflow-x-hidden overflow-y-auto"
          >
            {dashboard?.topFingerprints.length ? dashboard.topFingerprints.map((item) => (
              <button
                key={item.fingerprint}
                type="button"
                data-testid={`admin-client-error-fingerprint-${item.fingerprint}`}
                aria-label={`Fingerprint ${item.fingerprint} 이벤트 필터`}
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    bucket: item.bucket === 'feedback' ? prev.bucket : item.bucket,
                    fingerprint: item.fingerprint,
                  }));
                  setCurrentPage(0);
                }}
                className="min-h-11 w-full min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition [overflow-wrap:anywhere] hover:border-rose-500/30 hover:bg-slate-950"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <AdminBadge className={bucketBadgeClass[item.bucket]}>{item.bucket.toUpperCase()}</AdminBadge>
                  <AdminBadge className={sourceBadgeClass[item.source]}>{item.source}</AdminBadge>
                  {item.latestAlertChannel ? (
                    <AdminBadge className={channelBadgeClass[item.latestAlertChannel]}>
                      {item.latestAlertChannel.toUpperCase()}
                    </AdminBadge>
                  ) : null}
                <span className="text-caption font-semibold text-white">{item.count.toLocaleString()}건</span>
                </div>
                <p className="line-clamp-2 text-caption text-slate-200 [overflow-wrap:anywhere]">{item.message}</p>
                <div className="mt-3 min-w-0 space-y-1 text-caption text-slate-400 [overflow-wrap:anywhere]">
                  <p className="[overflow-wrap:anywhere]">route: {item.route}</p>
                  <p className="[overflow-wrap:anywhere]">fingerprint: {item.fingerprint}</p>
                  <p>최근 발생: {getTimeAgo(item.latestOccurredAt)}</p>
                  <p>최근 알림: {item.latestAlertSentAt ? getTimeAgo(item.latestAlertSentAt) : '없음'}</p>
                </div>
              </button>
            )) : (
              <div role="status" aria-live="polite" className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-caption text-slate-500">
                집계할 fingerprint가 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="mb-4 flex min-w-0 items-start gap-3">
          <AdminFilterIcon className="h-5 w-5 text-slate-400" />
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white">이벤트 탐색</h3>
            <p className="text-caption text-slate-400 [overflow-wrap:anywhere]">
              bucket, source, status group, route, fingerprint, 전문 검색으로 raw event를 좁힙니다.
            </p>
          </div>
        </div>

        <div data-testid="admin-client-error-filter-tab-path" className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select
            data-testid="admin-client-error-bucket"
            aria-label="Bucket 필터"
            value={filters.bucket}
            onChange={(event) => setFilters((prev) => ({ ...prev, bucket: event.target.value as ClientErrorAdminEventFilters['bucket'] }))}
            className={`min-h-11 ${adminNativeSelectClassName}`}
          >
            <option value="all">Bucket 전체</option>
            <option value="api">API</option>
            <option value="runtime">Runtime</option>
          </select>

          <select
            data-testid="admin-client-error-source"
            aria-label="Source 필터"
            value={filters.source}
            onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value as ClientErrorAdminEventFilters['source'] }))}
            className={`min-h-11 ${adminNativeSelectClassName}`}
          >
            <option value="all">Source 전체</option>
            <option value="api">api</option>
            <option value="runtime">runtime</option>
            <option value="unhandled_rejection">unhandled_rejection</option>
          </select>

          <select
            data-testid="admin-client-error-status"
            aria-label="Status 필터"
            value={filters.statusGroup}
            onChange={(event) => setFilters((prev) => ({ ...prev, statusGroup: event.target.value as ClientErrorAdminEventFilters['statusGroup'] }))}
            className={`min-h-11 ${adminNativeSelectClassName}`}
          >
            <option value="all">Status 전체</option>
            <option value="5xx">5xx</option>
            <option value="4xx">4xx</option>
            <option value="none">none</option>
          </select>

          <Input
            data-testid="admin-client-error-route"
            aria-label="Route 필터"
            value={filters.route}
            onChange={(event) => setFilters((prev) => ({ ...prev, route: event.target.value }))}
            placeholder="Route filter"
            className="min-h-11 rounded-xl border-slate-700 bg-slate-800/70 text-slate-100 placeholder:text-slate-500"
          />

          <Input
            data-testid="admin-client-error-fingerprint-input"
            aria-label="Fingerprint 필터"
            value={filters.fingerprint}
            onChange={(event) => setFilters((prev) => ({ ...prev, fingerprint: event.target.value }))}
            placeholder="Fingerprint"
            className="min-h-11 rounded-xl border-slate-700 bg-slate-800/70 font-mono text-slate-100 placeholder:text-slate-500"
          />

          <div className="relative">
            <AdminSearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              data-testid="admin-client-error-search"
              aria-label="이벤트 검색"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="message / route / eventId"
              className="min-h-11 rounded-xl border-slate-700 bg-slate-800/70 pl-10 text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div
          data-testid="admin-client-error-events-scroll"
          className="mt-5 min-w-0 overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-800"
        >
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-800/40 hover:bg-slate-800/40">
                <TableHead className="text-slate-400">Bucket</TableHead>
                <TableHead className="text-slate-400">Message</TableHead>
                <TableHead className="text-slate-400">Route</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Occurred</TableHead>
                <TableHead className="text-right text-slate-400">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingEvents ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} role="status" aria-live="polite" aria-busy="true" className="py-12 text-center text-slate-500">
                    이벤트를 불러오는 중입니다.
                  </TableCell>
                </TableRow>
              ) : eventsPage.content.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} role="status" aria-live="polite" className="py-12 text-center text-slate-500">
                    조건에 맞는 이벤트가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                eventsPage.content.map((event) => (
                  <TableRow key={event.eventId} className="border-slate-800 hover:bg-slate-800/30">
                    <TableCell>
                      <div className="flex min-w-0 flex-col gap-2">
                        <AdminBadge className={bucketBadgeClass[event.bucket]}>{event.bucket}</AdminBadge>
                        <AdminBadge className={sourceBadgeClass[event.source]}>{event.source}</AdminBadge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal">
                      <p className="line-clamp-2 min-w-0 text-caption text-slate-200 [overflow-wrap:anywhere]">{event.message}</p>
                      <p className="mt-2 min-w-0 text-caption font-mono text-slate-500 [overflow-wrap:anywhere]">{event.eventId}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal text-caption text-slate-300 [overflow-wrap:anywhere]">
                      {event.route}
                    </TableCell>
                    <TableCell className="text-caption text-slate-300">
                      {event.statusCode ? `${event.statusCode} (${event.statusGroup})` : event.statusGroup}
                    </TableCell>
                    <TableCell className="text-caption text-slate-400">
                      <p>{getTimeAgo(event.occurredAt)}</p>
                      <p className="mt-1 text-caption text-slate-500">{formatDetailedDateTime(event.occurredAt)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        data-testid={`admin-client-error-detail-${event.eventId}`}
                        aria-label={`이벤트 ${event.eventId} 상세 보기`}
                        onClick={() => void handleOpenDetail(event.eventId)}
                        className="min-h-11 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white"
                      >
                        열기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex min-w-0 flex-wrap items-start justify-between gap-3 text-caption text-slate-400">
          <span className="min-w-0 [overflow-wrap:anywhere]">
            총 {eventsPage.totalElements.toLocaleString()}건 중 {(eventsPage.number ?? 0) + 1} / {Math.max(eventsPage.totalPages, 1)} 페이지
          </span>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              data-testid="admin-client-error-previous"
              aria-label="이전 이벤트 페이지"
              disabled={(eventsPage.number ?? 0) <= 0 || loadingEvents}
              onClick={() => void loadEvents(Math.max((eventsPage.number ?? 0) - 1, 0))}
              className="min-h-11 flex-1 rounded-xl border-slate-700 bg-slate-800/70 text-slate-100 hover:bg-slate-700 sm:flex-none"
            >
              이전
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="admin-client-error-next"
              aria-label="다음 이벤트 페이지"
              disabled={eventsPage.last || loadingEvents}
              onClick={() => void loadEvents((eventsPage.number ?? 0) + 1)}
              className="min-h-11 flex-1 rounded-xl border-slate-700 bg-slate-800/70 text-slate-100 hover:bg-slate-700 sm:flex-none"
            >
              다음
            </Button>
          </div>
        </div>
      </section>

      {insightsContent}

      {detailContent}
    </div>
  );
}
