import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { restoreTeamsFromIds } from '../utils/ranking';
import { usePredictionStore } from '../store/predictionStore';
import { getApiErrorMessage } from '../utils/errorUtils';
import { getRankingPredictionShareQueryOptions } from './rankingPredictionShareQueryOptions';

export const useRankingPredictionShare = () => {
  const { shareId, seasonYear } = useParams();
  const allTeams = usePredictionStore((state) => state.allTeams);
  const hasValidParams = Boolean(shareId && seasonYear);
  const sharedPredictionQuery = useQuery(getRankingPredictionShareQueryOptions(shareId, seasonYear));
  const errorMessage = !hasValidParams
    ? '잘못된 접근입니다.'
    : sharedPredictionQuery.isError
      ? getApiErrorMessage(sharedPredictionQuery.error, '데이터를 불러오는데 실패했습니다.')
      : null;

  const rankings = useMemo(
    () => sharedPredictionQuery.data
      ? restoreTeamsFromIds(sharedPredictionQuery.data.teamIdsInOrder, allTeams)
      : [],
    [allTeams, sharedPredictionQuery.data],
  );

  return {
    shareId,
    seasonYear,
    rankings,
    result: sharedPredictionQuery.data ?? null,
    errorMessage,
    isLoading: hasValidParams ? sharedPredictionQuery.isPending : false,
  };
};
