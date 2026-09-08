import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Party } from '../types/mate';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
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

const {
  MateDetailHostBlock,
  MateDetailHeroBlock,
  MateDetailIntroBlock,
  MateDetailParticipationBlock,
  MateDetailPriceBox,
  MateDetailQrHint,
  MateDetailReferenceCard,
  MateDetailReviewBlock,
  MateDetailSeatViewBlock,
} = await import('./MateDetailReferenceBlocks');

const makeParty = (overrides: Partial<Party> = {}): Party => ({
  id: 2026082801,
  hostId: 7,
  hostHandle: 'qa-host',
  hostName: 'QA 호스트',
  hostBadge: 'VERIFIED',
  hostAverageRating: 4.8,
  hostReviewCount: 12,
  teamId: 'LG',
  cheeringSide: 'HOME',
  gameDate: '2026-09-01',
  gameTime: '18:30',
  stadium: 'QA 테스트 구장',
  homeTeam: 'LG',
  awayTeam: 'DOOSAN',
  section: '1루 내야석',
  seatDetail: '101블록 1열',
  maxParticipants: 4,
  currentParticipants: 2,
  description: '모바일 좌석 블록 검증용 파티입니다.',
  ticketVerified: true,
  status: 'PENDING',
  createdAt: '2026-08-28T09:00:00+09:00',
  ...overrides,
});

const renderSeatView = (
  party: Party,
  visualQaPhotoCountOverride?: number,
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const html = renderToStaticMarkup(createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(MateDetailSeatViewBlock, {
      party,
      onOpenSeatViewGuide: () => undefined,
      visualQaPhotoCountOverride,
    }),
  ));
  queryClient.clear();
  return html;
};

const renderHost = (party: Party) => renderToStaticMarkup(createElement(
  MateDetailHostBlock,
  {
    party,
    onOpenChat: () => undefined,
    onOpenHostProfile: () => undefined,
  },
));

const renderIntro = (party: Party, summaryPolicyText: string) => renderToStaticMarkup(createElement(
  MateDetailIntroBlock,
  { party, summaryPolicyText },
));

const renderReview = (party: Party, withAction = true) => renderToStaticMarkup(createElement(
  MateDetailReviewBlock,
  {
    party,
    onOpenHostReviews: withAction ? () => undefined : undefined,
  },
));

const renderReferenceCard = (children: string) => renderToStaticMarkup(createElement(
  MateDetailReferenceCard,
  null,
  children,
));

const renderHero = (
  party: Party,
  compact = false,
  favorited = false,
) => renderToStaticMarkup(createElement(MateDetailHeroBlock, {
  party,
  compact,
  favorited,
  onToggleFavorite: () => undefined,
}));

const renderParticipation = (party: Party) => renderToStaticMarkup(createElement(
  MateDetailParticipationBlock,
  { party },
));

const renderPriceBox = (party: Party) => renderToStaticMarkup(createElement(
  MateDetailPriceBox,
  { party },
));

const renderQrHint = (canAccessCheckIn: boolean) => renderToStaticMarkup(createElement(
  MateDetailQrHint,
  { canAccessCheckIn, onOpenQrPanel: () => undefined },
));

test('mate seat view contains unbroken section and seat pressure without crushing its header or actions', () => {
  const token = `SECTION-${'X'.repeat(220)}`;
  const html = renderSeatView(makeParty({
    section: token,
    seatDetail: `SEAT-${'Y'.repeat(260)}`,
  }), 0);

  assert.match(html, /data-testid="mate-detail-seat-view-block"/);
  assert.match(html, /data-testid="mate-detail-section-title"/);
  assert.match(html, /flex-wrap/);
  assert.match(html, /overflow-wrap:anywhere/);
  const badgeTag = html.match(/<span[^>]+data-testid="mate-detail-reference-badge"[^>]*>/)?.[0] ?? '';
  assert.match(badgeTag, /max-width:min\(14rem, 45vw\)/);
  assert.match(html, /data-testid="mate-detail-reference-badge-content"[^>]+truncate/);
  assert.match(html, new RegExp(token));
  assert.match(html, /data-testid="mate-open-seat-panel"/);
  assert.match(html, /data-testid="mate-open-official-seat-map"/);
});

test('mate seat view exposes two full-width mobile touch actions and clamps the photo count to the supported nine', () => {
  const html = renderSeatView(makeParty(), 99);

  assert.match(html, /실제 시야 사진 9장/);
  const actionTags = html.match(/<button[^>]+>/g) ?? [];
  assert.equal(actionTags.length, 2);
  actionTags.forEach((tag) => {
    assert.match(tag, /min-h-11/);
    assert.match(tag, /w-full/);
    assert.match(tag, /type="button"/);
  });
  assert.ok(actionTags.some((tag) => tag.includes('data-testid="mate-open-seat-panel"')));
  assert.ok(actionTags.some((tag) => tag.includes('data-testid="mate-open-official-seat-map"')));
});

test('mate host block contains unbroken identity and metric pressure without overflowing its mobile card', () => {
  const hostToken = `HOST-${'Z'.repeat(260)}`;
  const html = renderHost(makeParty({
    hostName: hostToken,
    hostTrustMetrics: {
      averageResponseMinutes: Number.MAX_SAFE_INTEGER,
      completedMateCount: Number.MAX_SAFE_INTEGER,
      recentNoShowCount: Number.MAX_SAFE_INTEGER,
    },
  }));

  assert.match(html, /data-testid="mate-detail-host-block"/);
  assert.match(html, new RegExp(hostToken));
  assert.match(html, /data-testid="mate-detail-host-name"[^>]+overflow-wrap:anywhere/);
  const hostNameTag = html.match(/<span[^>]+data-testid="mate-detail-host-name"[^>]*>/)?.[0] ?? '';
  assert.match(hostNameTag, /line-clamp-3/);
  assert.match(hostNameTag, /title=/);
  assert.match(html, /data-testid="mate-detail-host-metrics"[^>]+overflow-wrap:anywhere/);
  assert.match(html, /data-testid="mate-detail-host-stat"[^>]+overflow-wrap:anywhere/);
});

test('mate host block exposes two full-width mobile touch actions with explicit button semantics', () => {
  const html = renderHost(makeParty());
  const actionTags = html.match(/<button[^>]+>/g) ?? [];

  assert.equal(actionTags.length, 2);
  actionTags.forEach((tag) => {
    assert.match(tag, /min-h-11/);
    assert.match(tag, /w-full/);
    assert.match(tag, /type="button"/);
  });
  assert.ok(actionTags.some((tag) => tag.includes('data-testid="mate-open-host-chat"')));
  assert.ok(actionTags.some((tag) => tag.includes('data-testid="mate-open-host-profile"')));
});

test('mate intro block wraps unbroken intro, policy, list item, and hashtag pressure inside its mobile card', () => {
  const introToken = `INTRO-${'I'.repeat(260)}`;
  const tagToken = `TAG-${'T'.repeat(220)}`;
  const policyToken = `POLICY-${'P'.repeat(240)}`;
  const html = renderIntro(makeParty({
    description: `${introToken} #${tagToken}`,
  }), policyToken);

  assert.match(html, /data-testid="mate-detail-intro-block"/);
  assert.match(html, /data-testid="mate-detail-intro-text"[^>]+overflow-wrap:anywhere/);
  assert.match(html, /data-testid="mate-detail-intro-item"[^>]+overflow-wrap:anywhere/);
  assert.match(html, new RegExp(introToken));
  assert.match(html, new RegExp(tagToken));
  assert.match(html, new RegExp(policyToken));
  assert.match(html, /data-testid="mate-detail-reference-badge-content"[^>]+truncate/);
});

test('mate intro block keeps the optional intro paragraph absent for hashtag-only copy', () => {
  const html = renderIntro(makeParty({ description: '#조용한응원 #통로선호' }), '승인 후 채팅에서 조율');

  assert.match(html, /data-testid="mate-detail-intro-block"/);
  assert.doesNotMatch(html, /data-testid="mate-detail-intro-text"/);
});

test('mate review block constrains unbroken summary, reviewer, comment, and count pressure on mobile', () => {
  const labelToken = `LABEL-${'L'.repeat(220)}`;
  const reviewerToken = `reviewer-${'R'.repeat(220)}`;
  const commentToken = `COMMENT-${'C'.repeat(300)}`;
  const html = renderReview(makeParty({
    hostReviewCount: Number.MAX_SAFE_INTEGER,
    hostTrustMetrics: {
      reviewKeywordSummary: [{ label: labelToken, count: Number.MAX_SAFE_INTEGER }],
      recentHostReviews: [{
        reviewerHandle: reviewerToken,
        rating: 5,
        comment: commentToken,
        createdAt: '2026-08-28T10:00:00+09:00',
      }],
    },
  }));

  assert.match(html, /data-testid="mate-detail-review-block"/);
  assert.match(html, /data-testid="mate-detail-review-summary-label"[^>]+truncate/);
  assert.match(html, /data-testid="mate-detail-reviewer"[^>]+overflow-wrap:anywhere/);
  assert.match(html, /data-testid="mate-detail-review-comment"[^>]+overflow-wrap:anywhere/);
  assert.match(html, /data-testid="mate-detail-review-list"[^>]+max-h-\[60dvh\]/);
  assert.match(html, /data-testid="mate-detail-review-summary"[^>]+max-height:8rem/);
  assert.match(html, /data-testid="mate-detail-review-summary"[^>]+overflow-y-auto/);
  assert.match(html, /9007\.2조/);
  assert.doesNotMatch(html, /전체 9007199254740991/);
  assert.match(html, new RegExp(labelToken));
  assert.match(html, new RegExp(reviewerToken));
  assert.match(html, new RegExp(commentToken));
});

test('mate review block bounds a fifty-row inventory and exposes one mobile touch action only when available', () => {
  const reviews = Array.from({ length: 50 }, (_, index) => ({
    reviewerHandle: `reviewer-${index + 1}`,
    rating: 5,
    comment: `후기 ${index + 1}`,
    createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')}T10:00:00+09:00`,
  }));
  const withAction = renderReview(makeParty({
    hostTrustMetrics: { recentHostReviews: reviews },
  }));
  const withoutAction = renderReview(makeParty({
    hostHandle: undefined,
    hostTrustMetrics: { recentHostReviews: reviews.slice(0, 1) },
  }), false);

  assert.equal((withAction.match(/data-testid="mate-detail-review-row"/g) ?? []).length, 50);
  const actionTag = withAction.match(/<button[^>]+data-testid="mate-open-host-reviews"[^>]*>/)?.[0] ?? '';
  assert.match(actionTag, /min-h-11/);
  assert.match(actionTag, /type="button"/);
  assert.doesNotMatch(withoutAction, /data-testid="mate-open-host-reviews"/);
});

test('mate detail reference card contains unbroken child pressure within its mobile surface', () => {
  const token = `CARD-${'K'.repeat(300)}`;
  const html = renderReferenceCard(token);

  assert.match(html, /data-testid="mate-detail-reference-card"/);
  assert.match(html, /data-testid="mate-detail-reference-card"[^>]+min-w-0/);
  assert.match(html, /data-testid="mate-detail-reference-card"[^>]+overflow-wrap:anywhere/);
  assert.match(html, /data-testid="mate-detail-reference-card"[^>]+text-foreground/);
  assert.match(html, new RegExp(token));
});

test('mate detail hero reserves favorite space and constrains unbroken matchup metadata on mobile', () => {
  const teamToken = `TEAM-${'T'.repeat(220)}`;
  const stadiumToken = `STADIUM-${'S'.repeat(240)}`;
  const html = renderHero(makeParty({
    homeTeam: teamToken,
    awayTeam: `${teamToken}-AWAY`,
    stadium: stadiumToken,
  }), true, true);

  assert.match(html, /data-testid="mate-detail-hero-block"/);
  assert.match(html, /data-testid="mate-detail-hero-meta"[^>]+pr-12/);
  assert.match(html, /data-testid="mate-detail-hero-stadium"[^>]+overflow-wrap:anywhere/);
  assert.equal((html.match(/data-testid="mate-detail-hero-team"/g) ?? []).length, 2);
  assert.match(html, /data-testid="mate-detail-hero-team"[^>]+line-clamp-2/);
  assert.match(html, new RegExp(teamToken));
  assert.match(html, new RegExp(stadiumToken));
  assert.doesNotMatch(html, /\([일월화수목금토]\) \([일월화수목금토]\)/);
});

test('mate detail hero favorite control is an explicit 44px toggle in full and compact layouts', () => {
  [false, true].forEach((compact) => {
    const html = renderHero(makeParty(), compact, false);
    const favoriteTag = html.match(/<button[^>]+data-testid="mate-detail-hero-favorite"[^>]*>/)?.[0] ?? '';

    assert.match(favoriteTag, /h-11/);
    assert.match(favoriteTag, /w-11/);
    assert.match(favoriteTag, /type="button"/);
    assert.match(favoriteTag, /aria-pressed="false"/);
  });
});

test('mate detail hero replaces an invalid game date with a stable pending label', () => {
  const html = renderHero(makeParty({ gameDate: 'not.a.date' }));

  assert.match(html, /경기 예정/);
  assert.match(html, />경기 일정 확인 중 · /);
  assert.doesNotMatch(html, /NaN|undefined|Invalid Date/);
});

test('mate participation handles an unavailable capacity without NaN or an empty unexplained region', () => {
  const html = renderParticipation(makeParty({
    currentParticipants: 0,
    maxParticipants: 0,
    members: [],
  }));

  assert.match(html, /data-testid="mate-detail-participation-block"/);
  assert.match(html, /data-testid="mate-detail-participation-empty"/);
  assert.match(html, /정원 정보 확인 중/);
  assert.match(html, /data-testid="mate-detail-participation-progress"[^>]+width:0%/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('mate participation bounds very large capacity and preserves exact counts accessibly', () => {
  const html = renderParticipation(makeParty({
    currentParticipants: 4_999,
    maxParticipants: 5_000,
    members: undefined,
  }));

  assert.equal((html.match(/data-testid="mate-detail-participation-member"/g) ?? []).length, 50);
  assert.match(html, /data-testid="mate-detail-participation-grid"[^>]+max-height:min\(50dvh, 30rem\)[^>]+overflow-y-auto/);
  assert.match(html, /앞 50자리만 표시/);
  assert.match(html, /title="4,999\/5,000명"/);
});

test('mate participation contains long roster roles inside each mobile member tile', () => {
  const role = `ROLE-${'R'.repeat(220)}`;
  const html = renderParticipation(makeParty({
    currentParticipants: 2,
    maxParticipants: 4,
    members: [
      { initial: 'H', profileImageUrl: null, role, host: true },
      { initial: 'M', profileImageUrl: null, role: '매우 긴 한국어 역할 이름이 좁은 화면에서도 타일을 밀어내지 않아야 합니다', host: false },
    ],
  }));

  assert.match(html, /data-testid="mate-detail-participation-role"[^>]+truncate/);
  assert.match(html, new RegExp(`title="${role}"`));
  assert.doesNotMatch(html, /min-width:\s*auto/);
});

test('mate price box stacks maximum supported amounts on mobile without clipping exact currency', () => {
  const html = renderPriceBox(makeParty({
    status: 'SELLING',
    price: Number.MAX_SAFE_INTEGER,
    reservationDepositAmount: Number.MAX_SAFE_INTEGER,
  }));

  assert.match(html, /data-testid="mate-detail-price-box"/);
  assert.equal((html.match(/data-testid="mate-detail-(?:deposit|ticket)-row"/g) ?? []).length, 2);
  assert.equal((html.match(/9,007,199,254,740,991원/g) ?? []).length, 2);
  assert.match(html, /class="[^"]+flex-col[^"]+sm:flex-row[^"]*"[^>]+data-testid="mate-detail-deposit-row"/);
  assert.match(html, /data-testid="mate-detail-deposit-amount"[^>]+overflow-wrap:anywhere/);
  assert.doesNotMatch(html, /data-testid="mate-detail-(?:deposit|ticket)-amount"[^>]+whitespace-nowrap/);
});

test('mate price box keeps zero, missing, and selling labels deterministic', () => {
  const missingHtml = renderPriceBox(makeParty({
    price: undefined,
    ticketPrice: undefined,
    reservationDepositAmount: null,
  }));
  const sellingHtml = renderPriceBox(makeParty({
    status: 'SELLING',
    price: 125_000,
    ticketPrice: 55_000,
    reservationDepositAmount: 0,
  }));

  assert.equal((missingHtml.match(/data-testid="mate-detail-(?:deposit|ticket)-row"/g) ?? []).length, 1);
  assert.match(missingHtml, /0원/);
  assert.match(sellingHtml, /티켓 판매가/);
  assert.match(sellingHtml, /125,000원/);
  assert.doesNotMatch(sellingHtml, /55,000원/);
});

test('mate QR hint is a contained mobile touch target only when check-in access is available', () => {
  const lockedHtml = renderQrHint(false);
  const availableHtml = renderQrHint(true);
  const lockedButton = lockedHtml.match(/<button[^>]+data-testid="mate-open-qr-panel"[^>]*>/)?.[0] ?? '';
  const availableButton = availableHtml.match(/<button[^>]+data-testid="mate-open-qr-panel"[^>]*>/)?.[0] ?? '';

  assert.match(lockedButton, /type="button"/);
  assert.match(lockedButton, /disabled=""/);
  assert.match(lockedButton, /aria-disabled="true"/);
  assert.match(lockedButton, /min-h-11/);
  assert.match(lockedButton, /w-full/);
  assert.match(lockedButton, /overflow-wrap:anywhere/);
  assert.match(lockedHtml, /참여 확정 후 채팅·예약 상세에서 열려요/);

  assert.doesNotMatch(availableButton, /disabled=""/);
  assert.match(availableButton, /aria-disabled="false"/);
  assert.match(availableButton, /focus-visible:ring-2/);
  assert.match(availableButton, /active:scale-\[0\.98\]/);
  assert.match(availableHtml, /참여 확정 후 바로 열 수 있어요/);
});
