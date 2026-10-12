import PredictionMatchScheduleDataRuntime from './PredictionMatchScheduleDataRuntime';
import type { ReactNode } from 'react';

export interface PredictionMatchScheduleRuntimeProps {
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function PredictionMatchScheduleRuntime({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: PredictionMatchScheduleRuntimeProps = {}) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="prediction-match-schedule-runtime-fallback">경기 일정을 불러오는 중입니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }
  return (
    <div className="font-sans">
      <PredictionMatchScheduleDataRuntime />
    </div>
  );
}
