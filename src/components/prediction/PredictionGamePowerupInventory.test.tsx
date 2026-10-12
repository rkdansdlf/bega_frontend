import assert from 'node:assert/strict';
import test from 'node:test';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PRIVATE_QUERY_KEYS } from '../../utils/privateQueryKeys';
import { getViewerQueryScope } from '../../utils/viewerQueryScope';
import PredictionGamePowerupInventory from './PredictionGamePowerupInventory';

const inventory = {
  MAGIC_BAT: 1,
  GOLDEN_GLOVE: 0,
  SCOUTER: 0,
};

const renderInventoryForGame = (activeGameId: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const viewerScope = getViewerQueryScope();
  queryClient.setQueryData(PRIVATE_QUERY_KEYS.powerupInventory(viewerScope), inventory);
  queryClient.setQueryData(PRIVATE_QUERY_KEYS.activePowerups(viewerScope), [
    { type: 'MAGIC_BAT', gameId: activeGameId },
  ]);

  return renderToStaticMarkup(createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(PredictionGamePowerupInventory, { gameId: 'selected-game' }),
  ));
};

const getMagicBatButton = (html: string) => {
  const button = html.match(/<button[^>]*data-testid="retro-powerup-card-magic_bat"[^>]*>/)?.[0];
  assert.ok(button, 'expected the magic bat inventory button to render');
  return button;
};

test('PredictionGamePowerupInventory ignores an active powerup for a different game', () => {
  const html = renderInventoryForGame('other-game');

  assert.doesNotMatch(getMagicBatButton(html), /\sdisabled(?:="")?/);
  assert.doesNotMatch(html, />ACTIVE</);
});

test('PredictionGamePowerupInventory marks a powerup active for its selected game', () => {
  const html = renderInventoryForGame('selected-game');

  assert.match(getMagicBatButton(html), /\sdisabled(?:="")?/);
  assert.match(html, />ACTIVE</);
});
