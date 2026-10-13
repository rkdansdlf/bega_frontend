export const bindPowerupToGame = (
  gameId: string,
  usePowerup: (type: string, gameId: string) => Promise<unknown>,
) => (type: string): Promise<unknown> => usePowerup(type, gameId);
