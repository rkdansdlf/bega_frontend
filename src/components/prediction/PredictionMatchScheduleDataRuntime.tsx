import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

import PredictionLoadingView from './PredictionLoadingView';

const predictionMatchScheduleDataContentModule = import('./PredictionMatchScheduleDataContent');
const PredictionMatchScheduleDataContent = lazy(() => predictionMatchScheduleDataContentModule);

export interface PredictionMatchScheduleDataRuntimeProps {
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function PredictionMatchScheduleDataRuntime({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: PredictionMatchScheduleDataRuntimeProps = {}) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="prediction-match-schedule-data-runtime-fallback">일정 화면을 불러오는 중입니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  return (
    <div className="font-sans">
      <Suspense fallback={<PredictionLoadingView topNotice={null} />}>
        <PredictionMatchScheduleDataContent />
      </Suspense>
    </div>
  );
}
