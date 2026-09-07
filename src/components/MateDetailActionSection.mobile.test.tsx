import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Party } from '../types/mate';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) {
      return { format: 'module', shortCircuit: true, source: 'export default {};' };
    }
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/visual-qa-test-image.png";',
      };
    }
    return nextLoad(url, context);
  },
});

const noop = () => {};

const createParty = (overrides: Partial<Party> = {}): Party => ({
  id: 1,
  hostName: '호스트',
  hostBadge: 'VERIFIED',
  hostAverageRating: 4.8,
  hostReviewCount: 12,
  teamId: 'lg',
  gameDate: '2026-09-10',
  gameTime: '18:30:00',
  stadium: '잠실야구장',
  homeTeam: 'LG 트윈스',
  awayTeam: '두산 베어스',
  section: '1루 네이비석',
  seatDetail: '101블록 12열',
  maxParticipants: 4,
  currentParticipants: 2,
  description: '함께 응원해요',
  ticketVerified: true,
  status: 'PENDING',
  ticketPrice: 18000,
  reservationDepositAmount: 5000,
  createdAt: '2026-08-28T00:00:00Z',
  ...overrides,
});

const renderSection = async ({
  actionClassName,
  actionKey = 'apply',
  actionLabel = '참여하기',
  layout = 'mobile',
  partyOverrides,
  sheetOpen = false,
}: {
  actionClassName?: string;
  actionKey?: string;
  actionLabel?: string;
  layout?: 'desktop' | 'mobile';
  partyOverrides?: Partial<Party>;
  sheetOpen?: boolean;
} = {}) => {
  const { default: MateDetailActionSection } = await import('./MateDetailActionSection');
  return renderToStaticMarkup(createElement(MateDetailActionSection, {
  party: createParty(partyOverrides),
  actionContext: {
    eyebrow: '지금 참여 가능',
    title: '핵심 정보 확인 후 바로 참여할 수 있습니다.',
    detail: '승인 후 채팅에서 거래 시간과 장소를 조율합니다.',
  },
  actionButtons: [{ key: actionKey, label: actionLabel, onClick: noop, className: actionClassName }],
  isAwaitingApproval: false,
  primaryMobileAction: { key: actionKey, label: actionLabel, onClick: noop, className: actionClassName },
  canAccessCheckIn: false,
  isHost: true,
  onOpenQrPanel: noop,
  onShare: noop,
  onShareToCheer: noop,
  isShareToCheerPending: false,
  onBrowsePartyList: noop,
  visualQaStateOverride: { layout, sheetOpen },
  } as never));
};

test('action section Visual QA layout and sheet state are disabled in production', async () => {
  const source = await readFile(new URL('./MateDetailActionSection.tsx', import.meta.url), 'utf8');

  assert.match(source, /visualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaLayout/);
  assert.match(source, /showSheetValue/);
});

test('mobile action bar exposes stable expanded state and touch-sized pressure-safe controls', async () => {
  const markup = await renderSection({ actionLabel: `ACTION-${'X'.repeat(160)}` });

  assert.match(markup, /data-testid="mate-mobile-action-bar"/);
  assert.match(markup, /data-testid="mate-detail-mobile-summary"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="mate-detail-action-sheet"/);
  assert.match(markup, /data-testid="mate-detail-mobile-primary"/);
  assert.match(markup, /min-h-11/);
  assert.match(markup, /min-w-0/);
  assert.match(markup, /overflow-wrap:anywhere/);
});

test('mobile detail sheet is an accessible contained dialog with the complete action context', async () => {
  const markup = await renderSection({ sheetOpen: true });

  assert.match(markup, /data-testid="mate-detail-action-sheet"/);
  assert.match(markup, /id="mate-detail-action-sheet"/);
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="mate-detail-action-sheet-title"/);
  assert.match(markup, /data-testid="mate-detail-action-sheet-close"/);
  assert.match(markup, /aria-label="상세 액션 닫기"/);
  assert.match(markup, /핵심 정보 확인 후 바로 참여할 수 있습니다/);
  assert.match(markup, /승인 후 채팅에서 거래 시간과 장소를 조율합니다/);
  assert.match(markup, /overflow-x-hidden/);
  assert.match(markup, /overflow-wrap:anywhere/);
});

test('sheet actions override caller fixed heights so long labels expand without overlapping', async () => {
  const markup = await renderSection({
    actionClassName: 'h-14 text-lg',
    actionKey: 'manage',
    actionLabel: `긴 한국어 액션 문구 ${'결과를 충분히 이해할 수 있는 설명 '.repeat(6)}`,
    sheetOpen: true,
  });
  const actionTag = markup.match(/<button[^>]*data-testid="mate-detail-sheet-action-manage"[^>]*>/)?.[0];

  assert.ok(actionTag);
  assert.match(actionTag, /style="[^"]*height:auto/);
  assert.match(actionTag, /padding-top:0\.75rem/);
  assert.match(actionTag, /white-space:normal/);
  assert.match(actionTag, /overflow-wrap:anywhere/);
});

test('maximum monetary values wrap below readable price labels instead of crushing them', async () => {
  const markup = await renderSection({
    partyOverrides: {
      reservationDepositAmount: Number.MAX_SAFE_INTEGER,
      ticketPrice: Number.MAX_SAFE_INTEGER,
    },
    sheetOpen: true,
  });
  const depositRow = markup.match(/<div[^>]*data-testid="mate-detail-deposit-row"[^>]*>/)?.[0];
  const ticketRow = markup.match(/<div[^>]*data-testid="mate-detail-ticket-row"[^>]*>/)?.[0];
  const depositAmount = markup.match(/<span[^>]*data-testid="mate-detail-deposit-amount"[^>]*>/)?.[0];
  const ticketAmount = markup.match(/<span[^>]*data-testid="mate-detail-ticket-amount"[^>]*>/)?.[0];

  assert.ok(depositRow);
  assert.ok(ticketRow);
  assert.ok(depositAmount);
  assert.ok(ticketAmount);
  assert.match(depositRow, /flex-col/);
  assert.match(depositRow, /items-stretch/);
  assert.match(depositRow, /sm:flex-row/);
  assert.match(ticketRow, /flex-col/);
  assert.match(ticketRow, /items-stretch/);
  assert.match(ticketRow, /sm:flex-row/);
  assert.match(depositAmount, /self-end/);
  assert.match(depositAmount, /overflow-wrap:anywhere/);
  assert.match(ticketAmount, /self-end/);
  assert.match(ticketAmount, /overflow-wrap:anywhere/);
  assert.match(markup, /9,007,199,254,740,991원/);
});

test('desktop rail and every owned action expose unique stable mobile-safe targets', async () => {
  const markup = await renderSection({ layout: 'desktop' });

  assert.match(markup, /data-testid="mate-desktop-action-rail"[^>]*data-layout="desktop"/);
  assert.match(markup, /data-testid="mate-detail-action-apply"/);
  assert.match(markup, /data-testid="mate-detail-desktop-browse"/);
  assert.match(markup, /data-testid="mate-share-to-cheer"/);
  assert.match(markup, /data-testid="mate-detail-desktop-share-friend"/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /active:scale-\[0\.98\]/);
  assert.match(markup, /min-h-11/);
});

test('sheet share target is distinct from the hidden desktop control', async () => {
  const markup = await renderSection({ sheetOpen: true });

  assert.match(markup, /data-testid="mate-detail-sheet-share-to-cheer"/);
  assert.equal((markup.match(/data-testid="mate-share-to-cheer"/g) ?? []).length, 1);
});

test('hosted QR action has contained focus and pressed feedback', async () => {
  const source = await readFile(new URL('./MateDetailReferenceBlocks.tsx', import.meta.url), 'utf8');
  const qrBlock = source.slice(source.indexOf('export function MateDetailQrHint'));

  assert.match(qrBlock, /data-testid="mate-open-qr-panel"/);
  assert.match(qrBlock, /min-h-11/);
  assert.match(qrBlock, /min-w-0/);
  assert.match(qrBlock, /overflow-wrap:anywhere/);
  assert.match(qrBlock, /focus-visible:ring-2/);
  assert.match(qrBlock, /active:scale-\[0\.98\]/);
});
