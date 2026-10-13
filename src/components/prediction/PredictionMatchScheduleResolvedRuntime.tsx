import type { ReactNode } from 'react';
import type { PredictionLocationState, PredictionNavigationOptions } from '../../utils/predictionDeepLink';
import PredictionLoadingView from './PredictionLoadingView';
import PredictionMatchesErrorView from './PredictionMatchesErrorView';
import PredictionMatchScheduleReadyView from './PredictionMatchScheduleReadyView';
import PredictionMatchScheduleResolvedDataRuntime from './PredictionMatchScheduleResolvedDataRuntime';

interface PredictionMatchScheduleResolvedRuntimeProps {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  userId?: number | string | null;
  locationState: PredictionLocationState;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: PredictionNavigationOptions) => void;
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function PredictionMatchScheduleResolvedRuntime({
  isAuthLoading,
  isLoggedIn,
  userId,
  locationState,
  searchParams,
  setSearchParams,
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: PredictionMatchScheduleResolvedRuntimeProps) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="prediction-match-schedule-resolved-runtime-fallback">일정 화면을 확인하고 있습니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  return (
    <PredictionMatchScheduleResolvedDataRuntime
      isAuthLoading={isAuthLoading}
      isLoggedIn={isLoggedIn}
      userId={userId}
      locationState={locationState}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
      PredictionLoadingViewComponent={PredictionLoadingView}
      PredictionMatchesErrorViewComponent={PredictionMatchesErrorView}
      PredictionMatchScheduleReadyViewComponent={PredictionMatchScheduleReadyView}
    />
  );
}
