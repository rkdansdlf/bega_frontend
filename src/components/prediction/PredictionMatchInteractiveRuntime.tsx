import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

import { Card } from '../ui/card';
import { PredictionLoaderIcon } from './PredictionShellIcons';

const PredictionMatchInteractiveDataRuntime = lazy(() => import('./PredictionMatchInteractiveDataRuntime'));

export interface PredictionMatchInteractiveRuntimeProps {
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function PredictionMatchInteractiveRuntime({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: PredictionMatchInteractiveRuntimeProps = {}) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="prediction-match-interactive-runtime-fallback">경기 화면을 불러오는 중입니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }
  return (
    <Suspense
      fallback={(
        <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="inline-flex items-center gap-2 text-body text-slate-500 dark:text-white">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
            경기 화면을 준비하고 있습니다.
          </div>
        </Card>
      )}
    >
      <PredictionMatchInteractiveDataRuntime />
    </Suspense>
  );
}
