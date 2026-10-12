import PredictionMatchRuntimeContent from './PredictionMatchRuntimeContent';
import type { ReactNode } from 'react';

export interface PredictionMatchRuntimeProps {
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function PredictionMatchRuntime({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: PredictionMatchRuntimeProps = {}) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="prediction-match-runtime-fallback">경기 화면을 불러오는 중입니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }
  return <PredictionMatchRuntimeContent />;
}
