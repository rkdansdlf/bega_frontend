import PredictionMatchScheduleRuntime from './PredictionMatchScheduleRuntime';
import type { ReactNode } from 'react';

export interface PredictionMatchRuntimeContentProps {
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function PredictionMatchRuntimeContent({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: PredictionMatchRuntimeContentProps = {}) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="prediction-match-runtime-content-fallback">경기 콘텐츠를 불러오는 중입니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }
  return <PredictionMatchScheduleRuntime />;
}
