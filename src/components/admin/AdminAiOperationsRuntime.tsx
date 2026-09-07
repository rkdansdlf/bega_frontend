import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchCoachAutoBriefOpsHealth,
} from '../../api/admin';
import type {
  AdminCoachAutoBriefOpsHealth,
  AdminCoachAutoBriefOpsWindow,
} from '../../types/admin';
import type { AdminAiOperationsPanelProps } from './AdminAiOperationsPanel';

const AdminAiOperationsPanelRuntime = lazy(() => import('./AdminAiOperationsPanelRuntime'));

const toDateInputValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DEFAULT_AUTO_BRIEF_START_DATE = toDateInputValue(new Date());
const DEFAULT_AUTO_BRIEF_END_DATE = DEFAULT_AUTO_BRIEF_START_DATE;

export interface AdminAiOperationsRuntimeVisualQaState {
  panelPhase: 'fallback' | 'resolved';
  health: AdminCoachAutoBriefOpsHealth | null;
  loading: boolean;
  error: string | null;
  selectedWindow: AdminCoachAutoBriefOpsWindow;
  startDate: string;
  endDate: string;
  commandCopyState: 'idle' | 'done' | 'error';
}

export interface AdminAiOperationsRuntimeProps {
  visualQaStateOverride?: AdminAiOperationsRuntimeVisualQaState;
  visualQaPanelRenderer?: (
    props: AdminAiOperationsPanelProps['autoBriefOpsPanel'],
  ) => ReactNode;
}

const AdminAiOperationsRuntimeFallback = () => (
  <div
    data-testid="admin-ai-operations-runtime-fallback"
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400 [overflow-wrap:anywhere]"
  >
    AI 운영 패널 로딩 중...
  </div>
);

export default function AdminAiOperationsRuntime({
  visualQaStateOverride: requestedVisualQaStateOverride,
  visualQaPanelRenderer: requestedVisualQaPanelRenderer,
}: AdminAiOperationsRuntimeProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaPanelRenderer = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaPanelRenderer;
  const [autoBriefOpsHealth, setAutoBriefOpsHealth] = useState<AdminCoachAutoBriefOpsHealth | null>(null);
  const [autoBriefOpsLoading, setAutoBriefOpsLoading] = useState(false);
  const [autoBriefOpsError, setAutoBriefOpsError] = useState<string | null>(null);
  const [autoBriefOpsWindow, setAutoBriefOpsWindow] = useState<AdminCoachAutoBriefOpsWindow>('today');
  const [autoBriefOpsStartDate, setAutoBriefOpsStartDate] = useState(DEFAULT_AUTO_BRIEF_START_DATE);
  const [autoBriefOpsEndDate, setAutoBriefOpsEndDate] = useState(DEFAULT_AUTO_BRIEF_END_DATE);
  const [autoBriefOpsCommandCopyState, setAutoBriefOpsCommandCopyState] =
    useState<'idle' | 'done' | 'error'>('idle');

  const runAutoBriefOpsHealthFetch = useCallback(async (request: {
    window: AdminCoachAutoBriefOpsWindow;
    startDate?: string;
    endDate?: string;
  }) => {
    if (visualQaStateOverride) return;
    setAutoBriefOpsLoading(true);
    setAutoBriefOpsError(null);
    try {
      const health = await fetchCoachAutoBriefOpsHealth({
        window: request.window,
        startDate: request.startDate,
        endDate: request.endDate,
      });
      setAutoBriefOpsHealth(health);
      setAutoBriefOpsCommandCopyState('idle');
    } catch (error) {
      setAutoBriefOpsError(
        error instanceof Error ? error.message : 'Coach auto brief 운영 상태를 불러오지 못했습니다.',
      );
    } finally {
      setAutoBriefOpsLoading(false);
    }
  }, [visualQaStateOverride]);

  useEffect(() => {
    if (visualQaStateOverride) return;
    void runAutoBriefOpsHealthFetch({
      window: 'today',
      startDate: DEFAULT_AUTO_BRIEF_START_DATE,
      endDate: DEFAULT_AUTO_BRIEF_END_DATE,
    });
  }, [runAutoBriefOpsHealthFetch, visualQaStateOverride]);

  const handleAutoBriefOpsWindowChange = (window: AdminCoachAutoBriefOpsWindow) => {
    setAutoBriefOpsWindow(window);
    setAutoBriefOpsCommandCopyState('idle');
    if (window !== 'custom') {
      void runAutoBriefOpsHealthFetch({
        window,
        startDate: autoBriefOpsStartDate,
        endDate: autoBriefOpsEndDate,
      });
    }
  };

  const handleAutoBriefOpsRefresh = async () => {
    await runAutoBriefOpsHealthFetch({
      window: autoBriefOpsWindow,
      startDate: autoBriefOpsStartDate,
      endDate: autoBriefOpsEndDate,
    });
  };

  const handleAutoBriefOpsApplyCustomWindow = async () => {
    await runAutoBriefOpsHealthFetch({
      window: 'custom',
      startDate: autoBriefOpsStartDate,
      endDate: autoBriefOpsEndDate,
    });
  };

  const handleAutoBriefOpsCopyCommand = async () => {
    if (!autoBriefOpsHealth?.recommended_command) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-unavailable');
      }
      await navigator.clipboard.writeText(autoBriefOpsHealth.recommended_command);
      setAutoBriefOpsCommandCopyState('done');
    } catch {
      setAutoBriefOpsCommandCopyState('error');
    }
  };

  const effectiveAutoBriefOpsHealth = visualQaStateOverride
    ? visualQaStateOverride.health
    : autoBriefOpsHealth;
  const effectiveAutoBriefOpsLoading = visualQaStateOverride
    ? visualQaStateOverride.loading
    : autoBriefOpsLoading;
  const effectiveAutoBriefOpsError = visualQaStateOverride
    ? visualQaStateOverride.error
    : autoBriefOpsError;
  const effectiveAutoBriefOpsWindow = visualQaStateOverride
    ? visualQaStateOverride.selectedWindow
    : autoBriefOpsWindow;
  const effectiveAutoBriefOpsStartDate = visualQaStateOverride
    ? visualQaStateOverride.startDate
    : autoBriefOpsStartDate;
  const effectiveAutoBriefOpsEndDate = visualQaStateOverride
    ? visualQaStateOverride.endDate
    : autoBriefOpsEndDate;
  const effectiveAutoBriefOpsCommandCopyState = visualQaStateOverride
    ? visualQaStateOverride.commandCopyState
    : autoBriefOpsCommandCopyState;

  const autoBriefOpsPanel = useMemo(() => ({
    health: effectiveAutoBriefOpsHealth,
    loading: effectiveAutoBriefOpsLoading,
    error: effectiveAutoBriefOpsError,
    selectedWindow: effectiveAutoBriefOpsWindow,
    startDate: effectiveAutoBriefOpsStartDate,
    endDate: effectiveAutoBriefOpsEndDate,
    commandCopyState: effectiveAutoBriefOpsCommandCopyState,
    onWindowChange: handleAutoBriefOpsWindowChange,
    onStartDateChange: setAutoBriefOpsStartDate,
    onEndDateChange: setAutoBriefOpsEndDate,
    onRefresh: handleAutoBriefOpsRefresh,
    onApplyCustomWindow: handleAutoBriefOpsApplyCustomWindow,
    onCopyCommand: handleAutoBriefOpsCopyCommand,
  }), [
    effectiveAutoBriefOpsCommandCopyState,
    effectiveAutoBriefOpsEndDate,
    effectiveAutoBriefOpsError,
    effectiveAutoBriefOpsHealth,
    effectiveAutoBriefOpsLoading,
    effectiveAutoBriefOpsStartDate,
    effectiveAutoBriefOpsWindow,
  ]);

  if (
    visualQaStateOverride?.panelPhase === 'resolved'
    && visualQaPanelRenderer === undefined
  ) {
    throw new Error('AdminAiOperationsRuntime Visual QA resolved renderer is required.');
  }

  const content = visualQaStateOverride?.panelPhase === 'fallback'
    ? <AdminAiOperationsRuntimeFallback />
    : visualQaStateOverride?.panelPhase === 'resolved'
      ? visualQaPanelRenderer?.(autoBriefOpsPanel)
      : (
        <Suspense fallback={<AdminAiOperationsRuntimeFallback />}>
          <AdminAiOperationsPanelRuntime
            autoBriefOpsPanel={autoBriefOpsPanel}
          />
        </Suspense>
      );

  return (
    <section
      data-testid="admin-ai-operations-runtime"
      aria-busy={visualQaStateOverride?.panelPhase === 'fallback'
        || effectiveAutoBriefOpsLoading
        || undefined}
      className="min-w-0 overflow-hidden"
    >
      {content}
    </section>
  );
}
