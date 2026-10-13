import { useMemo } from 'react';

import { usePowerups } from '../../hooks/useLeaderboardPrivate';
import { bindPowerupToGame } from '../../hooks/powerupGameBinding';
import PowerUpInventory from '../retro/PowerUpInventory';

interface PredictionGamePowerupInventoryProps {
  gameId: string;
}

export default function PredictionGamePowerupInventory({ gameId }: PredictionGamePowerupInventoryProps) {
  const {
    powerups,
    activePowerups,
    isLoading,
    isUsingPowerup,
    usePowerup,
  } = usePowerups(gameId);
  const handleUsePowerup = useMemo(
    () => bindPowerupToGame(gameId, usePowerup),
    [gameId, usePowerup],
  );

  return (
    <div className="mb-4">
      <PowerUpInventory
        gameId={gameId}
        powerups={powerups}
        activePowerups={activePowerups}
        disabled={isLoading || isUsingPowerup}
        onUsePowerup={handleUsePowerup}
        containerTestId="prediction-game-powerup-inventory"
      />
    </div>
  );
}
