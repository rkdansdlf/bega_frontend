import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAuthSession } from '../../store/authStore';
import type { PredictionLocationState, PredictionNavigationOptions } from '../../utils/predictionDeepLink';
import {
  buildPredictionEffectiveSearchParams,
  buildPredictionRouteNavigationPath,
} from '../../utils/predictionRouteNavigation';
import PredictionLoadingView from './PredictionLoadingView';
import PredictionMatchScheduleResolvedRuntime from './PredictionMatchScheduleResolvedRuntime';

export interface PredictionMatchScheduleDataContentProps {
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function PredictionMatchScheduleDataContent({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: PredictionMatchScheduleDataContentProps = {}) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="prediction-match-schedule-data-content-fallback">일정 데이터를 불러오는 중입니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  const location = useLocation();
  const navigate = useNavigate();
  const { gameId: routeGameId } = useParams<{ gameId?: string }>();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, isAuthLoading, userId } = useAuthSession();
  const locationState = location.state as PredictionLocationState;
  const effectiveSearchParams = useMemo(
    () => buildPredictionEffectiveSearchParams(searchParams, routeGameId),
    [routeGameId, searchParams],
  );
  const setRouteAwareSearchParams = useCallback((
    nextSearchParams: URLSearchParams,
    navigateOptions?: PredictionNavigationOptions,
  ) => {
    const nextPath = buildPredictionRouteNavigationPath(nextSearchParams);

    navigate(nextPath, {
      replace: navigateOptions?.replace,
      state: navigateOptions?.state,
    });
  }, [navigate]);

  if (isAuthLoading) {
    return (
      <div className="font-sans">
        <PredictionLoadingView topNotice={null} />
      </div>
    );
  }

  return (
    <div className="font-sans">
      <PredictionMatchScheduleResolvedRuntime
        isAuthLoading={isAuthLoading}
        isLoggedIn={isLoggedIn}
        userId={userId}
        locationState={locationState}
        searchParams={effectiveSearchParams}
        setSearchParams={setRouteAwareSearchParams}
      />
    </div>
  );
}
