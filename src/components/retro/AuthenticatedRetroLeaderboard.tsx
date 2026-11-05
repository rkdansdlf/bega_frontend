import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import RetroLeaderboard from './RetroLeaderboard';
import { usePowerups, useUserLeaderboardStats } from '../../hooks/useLeaderboardPrivate';
import type { PowerupInventory, UserLeaderboardStats } from '../../api/leaderboard';
import PowerupGameSelector from './PowerupGameSelector';

export interface AuthenticatedRetroLeaderboardStateOverride {
  stats: UserLeaderboardStats | null;
  powerups: PowerupInventory;
  activePowerups: string[];
  onUsePowerup?: (powerupType: string, gameId: string) => Promise<void>;
}

export type AuthenticatedRetroLeaderboardProps = Omit<
  ComponentProps<typeof RetroLeaderboard>,
  'userStats' | 'powerups' | 'activePowerups' | 'onUsePowerup'
> & {
  stateOverride?: AuthenticatedRetroLeaderboardStateOverride;
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
};

export default function AuthenticatedRetroLeaderboard(
  {
    stateOverride,
    visualQaPhase: requestedVisualQaPhase,
    visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
    ...props
  }: AuthenticatedRetroLeaderboardProps,
) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="authenticated-retro-leaderboard-fallback">개인 랭킹을 불러오는 중입니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  const [selectedGameId, setSelectedGameId] = useState('');
  const { stats: myRank } = useUserLeaderboardStats();
  const {
    powerups,
    activePowerups,
    isLoading,
    isUsingPowerup,
    usePowerup,
  } = usePowerups(selectedGameId);
  const handleUsePowerup = useCallback(async (powerupType: string) => {
    if (stateOverride?.onUsePowerup) {
      await stateOverride.onUsePowerup(powerupType, selectedGameId);
      return;
    }

    await usePowerup(powerupType, selectedGameId);
  }, [selectedGameId, stateOverride?.onUsePowerup, usePowerup]);
  const powerupGameSelector = (
    <PowerupGameSelector
      selectedGameId={selectedGameId}
      onSelectGame={setSelectedGameId}
    />
  );

  return (
    <RetroLeaderboard
      {...props}
      userStats={stateOverride ? stateOverride.stats : myRank}
      powerups={stateOverride ? stateOverride.powerups : powerups}
      activePowerups={stateOverride ? stateOverride.activePowerups : activePowerups}
      powerupGameId={selectedGameId}
      powerupGameSelector={powerupGameSelector}
      powerupsDisabled={stateOverride ? !stateOverride.onUsePowerup : isLoading || isUsingPowerup}
      onUsePowerup={handleUsePowerup}
    />
  );
}
