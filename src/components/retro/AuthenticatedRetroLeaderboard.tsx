import { useCallback } from 'react';
import type { ComponentProps } from 'react';
import RetroLeaderboard from './RetroLeaderboard';
import { usePowerups, useUserLeaderboardStats } from '../../hooks/useLeaderboardPrivate';
import type { PowerupInventory, UserLeaderboardStats } from '../../api/leaderboard';

export interface AuthenticatedRetroLeaderboardStateOverride {
  stats: UserLeaderboardStats | null;
  powerups: PowerupInventory;
  activePowerups: string[];
  onUsePowerup?: (powerupType: string) => Promise<void>;
}

export type AuthenticatedRetroLeaderboardProps = Omit<
  ComponentProps<typeof RetroLeaderboard>,
  'userStats' | 'powerups' | 'activePowerups' | 'onUsePowerup'
> & {
  stateOverride?: AuthenticatedRetroLeaderboardStateOverride;
};

export default function AuthenticatedRetroLeaderboard(
  { stateOverride, ...props }: AuthenticatedRetroLeaderboardProps,
) {
  const { stats: myRank } = useUserLeaderboardStats();
  const {
    powerups,
    activePowerups,
    usePowerup,
  } = usePowerups();

  const handleUsePowerup = useCallback(async (powerupType: string) => {
    if (stateOverride?.onUsePowerup) {
      await stateOverride.onUsePowerup(powerupType);
      return;
    }
    await usePowerup(powerupType);
  }, [stateOverride, usePowerup]);

  return (
    <RetroLeaderboard
      {...props}
      userStats={stateOverride ? stateOverride.stats : myRank}
      powerups={stateOverride ? stateOverride.powerups : powerups}
      activePowerups={stateOverride ? stateOverride.activePowerups : activePowerups}
      onUsePowerup={handleUsePowerup}
    />
  );
}
