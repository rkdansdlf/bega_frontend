import assert from 'node:assert/strict';
import test from 'node:test';

import type { Stadium } from '../types/stadium';
import { resolveSelectedStadium } from './stadiumGuideSelection';

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
