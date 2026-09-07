import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import MateCreateTicketStep, {
  type MateCreateTicketStepVisualQaStateOverride,
} from './MateCreateTicketStep';

type RenderOverrides = Partial<{
  errorType: 'scan' | 'matches' | 'submit' | null;
  fileErrorMessage: string;
  isScanning: boolean;
  ticketFile: File | null;
  visualQaStateOverride: MateCreateTicketStepVisualQaStateOverride;
}>;

const renderStep = (overrides: RenderOverrides = {}) => renderToStaticMarkup(createElement(
  MateCreateTicketStep,
  {
    errorType: null,
    fileErrorMessage: '',
    isScanning: false,
    ticketFile: null,
    retry: () => {},
    onFileUpload: () => {},
    updateFormData: () => {},
    goNext: () => {},
    visualQaStateOverride: { showDevelopmentFixture: false },
    ...overrides,
  },
));

test('ticket step renders when the Vite import-meta environment is unavailable', () => {
  assert.match(renderStep(), /티켓 인증/);
});

test('ticket step owns a contained mobile upload target with explicit idle semantics', () => {
  const markup = renderStep();

  assert.match(markup, /data-testid="mate-create-ticket-step"/);
  assert.match(markup, /min-w-0/);
  assert.match(markup, /overflow-wrap:anywhere/);
  assert.match(markup, /data-testid="mate-create-ticket-upload"/);
  assert.match(markup, /data-upload-state="idle"/);
  assert.match(markup, /aria-busy="false"/);
  assert.match(markup, /data-testid="mate-create-ticket-picker"/);
  assert.match(markup, /aria-disabled="false"/);
  assert.match(markup, /min-h-11/);
});

test('ticket scanning disables activation and exposes polite reduced-motion status', () => {
  const markup = renderStep({
    isScanning: true,
    ticketFile: new File(['ticket'], 'ticket.jpg', { type: 'image/jpeg' }),
  });

  assert.match(markup, /data-upload-state="scanning"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /aria-disabled="true"/);
  assert.match(markup, /tabindex="-1"/);
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /motion-reduce:animate-none/);
});

test('scan failure wraps pressure copy and keeps retry reachable at mobile touch width', () => {
  const markup = renderStep({
    errorType: 'scan',
    fileErrorMessage: `분석 실패 ${'ERROR'.repeat(30)}`,
    ticketFile: new File(
      ['ticket'],
      `모바일에서여러줄로표시되는매우긴예매내역파일이름-${'TICKET'.repeat(24)}.jpg`,
      { type: 'image/jpeg' },
    ),
  });

  assert.match(markup, /data-upload-state="scan-error"/);
  assert.match(markup, /break-all/);
  assert.match(markup, /line-clamp-3/);
  assert.match(markup, /title="모바일에서여러줄로표시되는매우긴예매내역파일이름-/);
  assert.match(markup, /data-testid="mate-create-ticket-error"/);
  assert.match(markup, /overflow-wrap:anywhere/);
  assert.match(markup, /data-testid="mate-create-ticket-retry"/);
  assert.match(markup, /min-h-11/);
  assert.match(markup, /w-full/);
  assert.match(markup, /sm:w-auto/);
});

test('client validation failure uses an error surface even before a file is retained', () => {
  const markup = renderStep({
    fileErrorMessage: '파일 크기는 10MB 이하여야 합니다.',
  });

  assert.match(markup, /data-upload-state="validation-error"/);
  assert.match(markup, /border-red-500/);
  assert.match(markup, /data-testid="mate-create-ticket-error"/);
});
