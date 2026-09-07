import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import MateCreateSeatStep, {
  type MateCreateSeatStepVisualQaStateOverride,
} from './MateCreateSeatStep';
import type { PartyFormData } from '../utils/mateCreateDraft';

const formData: PartyFormData = {
  gameDate: '2026-09-05',
  gameTime: '18:30',
  homeTeam: 'KT',
  awayTeam: 'KIA',
  stadium: '내부 테스트 구장',
  section: '305블록',
  cheeringSide: 'HOME',
  seatCategory: '응원석',
  seatDetail: '305블록 12열 15번',
  maxParticipants: 2,
  ticketPrice: 12_000,
  reservationDepositAmount: 5_000,
  description: '',
  ticketFile: null,
  reservationNumber: '',
};

const renderStep = (visualQaStateOverride: MateCreateSeatStepVisualQaStateOverride) => (
  renderToStaticMarkup(createElement(MateCreateSeatStep, {
    availableCategoryKeys: ['CHEERING', 'TABLE'],
    formData,
    updateFormData: () => {},
    visualQaStateOverride,
  }))
);

test('seat step exposes a contained selection fallback with loading semantics', () => {
  const markup = renderStep({
    pricingPhase: 'runtime',
    selectionPhase: 'fallback',
  });

  assert.match(markup, /data-testid="mate-create-seat-step"/);
  assert.match(markup, /data-selection-phase="fallback"/);
  assert.match(markup, /data-pricing-phase="runtime"/);
  assert.match(markup, /data-testid="mate-create-seat-selection-fallback"/);
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /좌석 선택 UI를 준비하고 있습니다\./);
  assert.match(markup, /min-w-0/);
  assert.match(markup, /overflow-wrap:anywhere/);
});

test('seat step exposes an independently addressable pricing fallback', () => {
  const markup = renderStep({
    pricingPhase: 'fallback',
    selectionPhase: 'runtime',
  });

  assert.match(markup, /data-selection-phase="runtime"/);
  assert.match(markup, /data-pricing-phase="fallback"/);
  assert.match(markup, /data-testid="mate-create-seat-pricing-fallback"/);
  assert.match(markup, /가격과 예약금 입력 UI를 준비하고 있습니다\./);
  assert.match(markup, /motion-reduce:animate-none/);
  assert.match(markup, /dark:bg-white\/10/);
});
