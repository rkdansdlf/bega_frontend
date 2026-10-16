import assert from 'node:assert/strict';
import test from 'node:test';

import type { Stadium } from '../types/stadium';
import { isUnknownRouteStadium, isValidStadiumId, resolveSelectedStadium } from './stadiumGuideSelection';

const makeStadium = (stadiumId: string): Stadium => ({
  stadiumId,
  stadiumName: stadiumId,
  team: 'TEST',
  lat: 37,
  lng: 127,
  address: '',
  phone: '',
});

test('구장 선택 복구는 같은 id 객체를 유지하고 없으면 첫 구장을 선택한다', () => {
  const first = makeStadium('first');
  const second = makeStadium('second');

  assert.equal(resolveSelectedStadium([first, second], second), second);
  assert.equal(resolveSelectedStadium([first, second], makeStadium('missing')), first);
  assert.equal(resolveSelectedStadium([], second), null);
});

test('URL preferred stadium id wins when present in the list', () => {
  const first = makeStadium('first');
  const second = makeStadium('second');

  assert.equal(resolveSelectedStadium([first, second], first, 'second'), second);
  assert.equal(resolveSelectedStadium([first, second], first, 'missing'), null);
});

test('unknown route stadium id is flagged so the page renders NotFound', () => {
  const stadiums = [makeStadium('JAMSIL'), makeStadium('GOCHEOK')];
  assert.equal(isUnknownRouteStadium(stadiums, 'JAMSIL'), false);
  assert.equal(isUnknownRouteStadium(stadiums, null), false);
  assert.equal(isUnknownRouteStadium(stadiums, ''), false);
  assert.equal(isUnknownRouteStadium(stadiums, 'fake-id'), true);
  assert.equal(isUnknownRouteStadium(stadiums, '../etc'), true);
  assert.equal(isUnknownRouteStadium([], 'JAMSIL'), true);
});

test('stadium id validator only accepts slug characters', () => {
  assert.equal(isValidStadiumId('JAMSIL_2-a'), true);
  assert.equal(isValidStadiumId('../x'), false);
  assert.equal(isValidStadiumId('a b'), false);
  assert.equal(isValidStadiumId(''), false);
  assert.equal(isValidStadiumId(42), false);
});
