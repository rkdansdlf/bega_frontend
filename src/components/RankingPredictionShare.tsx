import RankingItem from './ranking/RankingItem';
import RankingPredictionResultPanel from './ranking/RankingPredictionResultPanel';
import { useRankingPredictionShare } from '../hooks/useRankingPredictionShare';
import LoadingSpinner from './LoadingSpinner';
import type { ReactNode } from 'react';

export interface RankingPredictionShareProps {
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function RankingPredictionShare({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: RankingPredictionShareProps = {}) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="ranking-prediction-share-fallback">공유된 순위 예측을 불러오는 중입니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  const { seasonYear, rankings, result, errorMessage, isLoading } = useRankingPredictionShare();

  if (isLoading) {
    return (
      <LoadingSpinner size="lg" text="로딩 중..." fullScreen={false} />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-primary">
          {seasonYear} KBO 시즌 순위 예측
        </h1>

        {errorMessage ? (
          <div
            data-testid="ranking-share-error"
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
          >
            {errorMessage}
          </div>
        ) : result?.settledAt ? (
          <RankingPredictionResultPanel result={result} />
        ) : (
          <div className="space-y-2">
            {rankings.map((team, index) => (
              <RankingItem
                key={index}
                team={team}
                index={index}
                alreadySaved={true} // 공유된 예측은 수정 불가
                onRemove={() => {}} // 동작 안함
                onMoveTeamToIndex={() => {}} // 동작 안함
                onMoveTeamByStep={() => {}} // 동작 안함
              />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a 
            href="/prediction"
            className="inline-block px-6 py-3 text-white bg-primary rounded-lg hover:opacity-90 transition-opacity"
            style={{ fontWeight: 700 }}
          >
            나도 예측하기
          </a>
        </div>
      </div>
    </div>
  );
}
