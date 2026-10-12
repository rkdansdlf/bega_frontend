import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PowerUpInventory from './PowerUpInventory';

const inventory = {
  MAGIC_BAT: 1,
  GOLDEN_GLOVE: 1,
  SCOUTER: 1,
};

const getMagicBatButton = (html: string) => {
  const button = html.match(/<button[^>]*data-testid="retro-powerup-card-magic_bat"[^>]*>/)?.[0];
  assert.ok(button, 'expected the magic bat inventory button to render');
  return button;
};

test('PowerUpInventory disables activation when there is no selected game', () => {
  const html = renderToStaticMarkup(createElement(PowerUpInventory, {
    powerups: inventory,
    onUsePowerup: async () => {},
  }));

  assert.match(getMagicBatButton(html), /\sdisabled(?:="")?/);
});

test('PowerUpInventory allows activation when bound to a selected game', () => {
  const html = renderToStaticMarkup(createElement(PowerUpInventory, {
    powerups: inventory,
    gameId: 'internal-game-42',
    onUsePowerup: async () => {},
  }));

  assert.doesNotMatch(getMagicBatButton(html), /\sdisabled(?:="")?/);
});
