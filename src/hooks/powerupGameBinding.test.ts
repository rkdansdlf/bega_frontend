import assert from 'node:assert/strict';
import test from 'node:test';

import { bindPowerupToGame } from './powerupGameBinding';

test('bindPowerupToGame forwards the selected game id with the powerup type', async () => {
  const calls: Array<[string, string]> = [];
  const usePowerup = async (type: string, gameId: string) => {
    calls.push([type, gameId]);
  };

  await bindPowerupToGame('internal-game-42', usePowerup)('MAGIC_BAT');

  assert.deepEqual(calls, [['MAGIC_BAT', 'internal-game-42']]);
});
