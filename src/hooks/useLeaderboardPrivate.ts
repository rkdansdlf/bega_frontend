import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  fetchMyRank,
  fetchPowerups,
  fetchActivePowerups,
  usePowerup as usePowerupApi,
  type PowerupInventory,
} from '../api/leaderboard';
import { PRIVATE_QUERY_KEYS } from '../utils/privateQueryKeys';
import { useViewerQueryScope } from './useViewerQueryScope';

export function usePowerups(gameId?: string) {
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();
  const DEFAULT_POWERUPS: PowerupInventory = {
    MAGIC_BAT: 0,
    GOLDEN_GLOVE: 0,
    SCOUTER: 0,
  };

  const inventoryQuery = useQuery({
    queryKey: PRIVATE_QUERY_KEYS.powerupInventory(viewerScope),
    queryFn: fetchPowerups,
    staleTime: 60000,
  });

  const activeQuery = useQuery({
    queryKey: PRIVATE_QUERY_KEYS.activePowerups(viewerScope),
    queryFn: fetchActivePowerups,
    staleTime: 30000,
  });

  const usePowerupMutation = useMutation({
    mutationFn: ({ type, gameId }: { type: string; gameId?: string }) =>
      usePowerupApi(type, gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['powerups'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['powerups'] });
    },
  });

  const usePowerup = useCallback((type: string, gameId?: string) => (
    usePowerupMutation.mutateAsync({ type, gameId })
  ), [usePowerupMutation]);

  return {
    powerups: inventoryQuery.data ?? DEFAULT_POWERUPS,
    activePowerups: activeQuery.data
      ?.filter((powerup) => gameId === undefined || powerup.gameId === gameId)
      .map((powerup) => powerup.type) ?? [],
    isLoading: inventoryQuery.isLoading || activeQuery.isLoading,
    isUsingPowerup: usePowerupMutation.isPending,
    usePowerup,
  };
}

type UseUserLeaderboardStatsOptions = {
  enabled?: boolean;
};

export function useUserLeaderboardStats(options: UseUserLeaderboardStatsOptions = {}) {
  const viewerScope = useViewerQueryScope();
  const { enabled = true } = options;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: PRIVATE_QUERY_KEYS.leaderboardMe(viewerScope),
    queryFn: fetchMyRank,
    staleTime: 60000,
    enabled,
  });

  return {
    stats: data ?? null,
    isLoading,
    error,
    refetch,
  };
}
