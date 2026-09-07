import { lazy, Suspense, type ReactNode } from 'react';

import type {
  AdminCoachAutoBriefOpsHealth,
  AdminCoachAutoBriefOpsWindow,
} from '../../types/admin';

const AdminCoachAutoBriefOpsPanelRuntime = lazy(() => import('./AdminCoachAutoBriefOpsPanelRuntime'));
const AdminAiReleaseDecisionRuntime = lazy(() => import('./AdminAiReleaseDecisionRuntime'));

export interface AdminAiOperationsPanelVisualQaState {
  releaseDecisionPhase: 'fallback' | 'resolved';
  autoBriefPhase: 'fallback' | 'resolved';
  copy: string;
}

export interface AdminAiOperationsPanelProps {
  autoBriefOpsPanel: {
    health: AdminCoachAutoBriefOpsHealth | null;
    loading: boolean;
    error: string | null;
    selectedWindow: AdminCoachAutoBriefOpsWindow;
    startDate: string;
    endDate: string;
    commandCopyState: 'idle' | 'done' | 'error';
    onWindowChange: (value: AdminCoachAutoBriefOpsWindow) => void;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onRefresh: () => void | Promise<void>;
    onApplyCustomWindow: () => void | Promise<void>;
    onCopyCommand: () => void | Promise<void>;
  };
  visualQaStateOverride?: AdminAiOperationsPanelVisualQaState;
}

const AutoBriefFallback = () => (
  <div
    data-testid="admin-ai-operations-auto-brief-fallback"
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center text-caption text-slate-400 [overflow-wrap:anywhere]"
  >
    Coach auto brief ops 패널 로딩 중...
  </div>
);

const ReleaseDecisionFallback = ({ autoBriefPanel }: { autoBriefPanel: ReactNode }) => (
  <div
    data-testid="admin-ai-operations-layout"
    className="grid min-w-0 gap-6 overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)]"
  >
    {autoBriefPanel}
    <div
      data-testid="admin-ai-operations-release-fallback"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400 [overflow-wrap:anywhere]"
    >
      AI 릴리즈 결정 패널 로딩 중...
    </div>
  </div>
);

export function AdminAiOperationsPanel({
  autoBriefOpsPanel,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: AdminAiOperationsPanelProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const autoBriefPanel = visualQaStateOverride
    ? visualQaStateOverride.autoBriefPhase === 'fallback'
      ? <AutoBriefFallback />
      : (
        <section
          data-testid="admin-ai-operations-auto-brief-resolved"
          className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-caption text-slate-300 [overflow-wrap:anywhere]"
        >
          {visualQaStateOverride.copy}
        </section>
      )
    : (
      <Suspense fallback={<AutoBriefFallback />}>
        <AdminCoachAutoBriefOpsPanelRuntime {...autoBriefOpsPanel} />
      </Suspense>
    );

  const content = visualQaStateOverride?.releaseDecisionPhase === 'fallback'
    ? <ReleaseDecisionFallback autoBriefPanel={autoBriefPanel} />
    : visualQaStateOverride?.releaseDecisionPhase === 'resolved'
      ? (
        <div
          data-testid="admin-ai-operations-layout"
          className="grid min-w-0 gap-6 overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)]"
        >
          {autoBriefPanel}
          <section
            data-testid="admin-ai-operations-release-resolved"
            className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-caption text-slate-300 [overflow-wrap:anywhere]"
          >
            {visualQaStateOverride.copy}
          </section>
        </div>
      )
      : (
        <Suspense fallback={<ReleaseDecisionFallback autoBriefPanel={autoBriefPanel} />}>
          <AdminAiReleaseDecisionRuntime autoBriefPanel={autoBriefPanel} />
        </Suspense>
      );

  return (
    <section
      data-testid="admin-ai-operations-panel"
      aria-busy={visualQaStateOverride
        ? visualQaStateOverride.releaseDecisionPhase === 'fallback'
          || visualQaStateOverride.autoBriefPhase === 'fallback'
        : undefined}
      className="min-w-0 overflow-hidden"
    >
      {content}
    </section>
  );
}
