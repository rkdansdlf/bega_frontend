import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RankingPredictionShareRuntime = lazy(() => import('./RankingPredictionShare'));

const RankingPredictionShareFallback = () => (
  <div data-testid="ranking-share-route-loading">
    <LoadingSpinner size="lg" text="공유 예측을 준비하고 있습니다..." fullScreen={false} />
  </div>
);

export type RankingPredictionSharePageProps = {
  runtimeLoader?: () => Promise<{ default: ComponentType<Record<string, never>> }>;
  runtimeOverride?: ReactNode;
};

export default function RankingPredictionSharePage({
  runtimeLoader,
  runtimeOverride,
}: RankingPredictionSharePageProps = {}) {
  const Runtime = runtimeLoader ? lazy(runtimeLoader) : RankingPredictionShareRuntime;

  return (
    <Suspense fallback={<RankingPredictionShareFallback />}>
      {runtimeOverride !== undefined ? runtimeOverride : <Runtime />}
    </Suspense>
  );
}
