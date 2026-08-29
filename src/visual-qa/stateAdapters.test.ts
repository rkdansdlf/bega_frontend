import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { AdminAiReleaseDecisionVisualQaState } from '../components/admin/AdminAiReleaseDecisionRuntime';
import { FRANCHISE_TEAM_IDS } from '../constants/teams';
import type { AdminCoachAutoBriefOpsHealth } from '../types/admin';
import { MANUAL_BASEBALL_DATA_REQUIRED_CODE } from '../utils/manualBaseballDataContract';
import type { PartyFormData } from '../utils/mateCreateDraft';
import {
  KNOWN_COMPONENT_STATE_ADAPTER_IDS,
  resolveComponentStateAdapter,
} from './stateAdapters';

test('loading state adapters are explicit and unknown adapters fail closed', () => {
  assert.deepEqual(KNOWN_COMPONENT_STATE_ADAPTER_IDS, [
    'achievement.celebration-overlay',
    'admin.ai-operations-panel',
    'admin.ai-operations-runtime',
    'admin.ai-release-decision-runtime',
    'admin.animated-number',
    'admin.badge',
    'admin.client-error-detail',
    'admin.client-error-insights',
    'admin.client-error-panel',
    'admin.client-error-trend-chart',
    'admin.coach-auto-brief-ops-panel',
    'admin.community-runtime',
    'admin.data-runtime',
    'admin.delete-place-dialog',
    'admin.game-status-repair-panel',
    'admin.mates-panel',
    'admin.offseason-movement-content',
    'admin.offseason-movement-panel',
    'admin.page-route',
    'admin.page-shell',
    'admin.place-dialog',
    'admin.posts-panel',
    'admin.report-detail-drawer',
    'admin.reports-panel',
    'admin.role-change-dialog',
    'admin.route',
    'admin.runtime-content',
    'admin.seat-view-detail-drawer',
    'admin.seat-views-panel',
    'admin.stadiums-panel',
    'admin.stadiums-runtime',
    'admin.stat-card',
    'admin.status-badge',
    'admin.users-panel',
    'ads.slot',
    'app.browser-shell',
    'app.layout',
    'app.query-provider',
    'app.routes',
    'app.shell-runtime',
    'auth.account-deletion-recovery',
    'auth.bootstrap-gate',
    'auth.layout',
    'auth.login',
    'auth.oauth-callback',
    'auth.oauth-email-challenge-panel',
    'auth.oauth-email-confirm',
    'auth.password-reset',
    'auth.password-reset-confirm',
    'auth.protected-route',
    'auth.public-only-route',
    'auth.session-boundary',
    'auth.sign-up-status-panel',
    'auth.signup',
    'authenticated-layout.chrome',
    'authenticated-layout.toaster',
    'chatbot.floating-button',
    'cheer-feed.empty',
    'cheer-feed.error',
    'cheer-feed.login-required',
    'cheer.theme-control',
    'common.coach-markdown',
    'common.empty-state',
    'common.end-of-feed',
    'common.error-boundary',
    'common.error-boundary-fallback',
    'common.error-feedback-panel',
    'common.lazy-emoji-picker',
    'common.optimized-image',
    'common.profile-image',
    'common.qr-code',
    'figma.image-with-fallback',
    'landing.app-preview',
    'landing.capability-showcase',
    'landing.cheer-vignette',
    'landing.closing',
    'landing.diary-vignette',
    'landing.feature-card',
    'landing.feature-section',
    'landing.features-runtime',
    'landing.game-data-vignette',
    'landing.hero',
    'landing.laptop-mockup',
    'landing.mate-vignette',
    'landing.offseason',
    'landing.page',
    'landing.phone-preview',
    'landing.prediction-vignette',
    'landing.stadium-chips',
    'landing.stadium-vignette',
    'landing.start-guide',
    'landing.ticker',
    'layout.footer',
    'leaderboard-page',
    'leaderboard-page-runtime',
    'loading.no-props',
    'loading.spinner',
    'login-required.dialog',
    'mate.apply',
    'mate.apply-page',
    'mate.chat',
    'mate.chat-access',
    'mate.chat-approved',
    'mate.chat-composer',
    'mate.chat-conversation',
    'mate.chat-page',
    'mate.chat-view',
    'mate.check-in',
    'mate.check-in-action',
    'mate.check-in-content',
    'mate.check-in-overview',
    'mate.check-in-page',
    'mate.check-in-roster',
    'mate.check-in-status',
    'mate.create',
    'mate.create-confirm-dialog',
    'mate.create-description-step',
    'mate.create-field-label',
    'mate.create-match-step',
    'mate.create-page',
    'mate.create-seat-pricing',
    'mate.create-seat-selection',
    'mate.create-seat-step',
    'mate.create-ticket-step',
    'mate.date-rail-filter',
    'mate.detail-action-dialog',
    'mate.detail-action-section',
    'mate.detail-hero-block',
    'mate.detail-host-block',
    'mate.detail-intro-block',
    'mate.detail-page',
    'mate.detail-participation-block',
    'mate.detail-price-box',
    'mate.detail-qr-hint',
    'mate.detail-reference-card',
    'mate.detail-review-block',
    'mate.detail-reviews-section',
    'mate.detail-seat-view',
    'mate.host-reviews-modal',
    'mate.page',
    'mate.ticket-verification',
    'mate.today-count-badge',
    'mypage.season-empty',
    'navbar.notification-controls',
    'navbar.shell',
    'notice.page',
    'notice.runtime',
    'notification.panel',
    'offseason.empty',
    'offseason.error',
    'offseason.home',
    'offseason.home.highlights',
    'offseason.home.news',
    'offseason.home.page',
    'offseason.home.primary',
    'offseason.list',
    'offseason.list.content',
    'offseason.list.desktop-table',
    'offseason.list.detail',
    'offseason.list.insights',
    'offseason.list.mobile-cards',
    'offseason.list.page',
    'offseason.pill',
    'offseason.section-pill',
    'prediction.loading-view',
    'prediction.matches-error',
    'privacy-policy.page',
    'public-navbar.desktop-auth-controls',
    'public-navbar.dm-unread-badge',
    'public-navbar.menu-panel',
    'public-navbar.shell',
    'ranking.item',
    'ranking.result-panel',
    'retro.animated-crown',
    'retro.combo-animation',
    'retro.dot-matrix-text',
    'retro.flicker-text',
    'retro.glitch-wrapper',
    'retro.leaderboard-decorations',
    'retro.leaderboard-footer-panels',
    'retro.leaderboard-row',
    'retro.leaderboard-rules-overlay',
    'retro.level-badge',
    'retro.news-ticker',
    'retro.pixel-crown',
    'retro.pixel-empty-state',
    'retro.pixel-number',
    'retro.pixel-progress-bar',
    'retro.power-up-inventory',
    'retro.rank-badge',
    'retro.retro-button',
    'retro.retro-card',
    'retro.retro-container',
    'retro.retro-divider',
    'retro.score-display',
    'retro.streak-counter',
    'retro.user-stats-panel',
    'review.dialog',
    'rolling.number',
    'root-entry-route',
    'root-entry-route-auth-aware',
    'route.not-found',
    'sajik.first-visit-guide',
    'sajik.missing-official-seat-map',
    'sajik.path-validation',
    'sajik.seat-map',
    'sajik.seat-map-editor',
    'sajik.seat-map-svg',
    'simple-markdown.content',
    'stadium-seatmap.error',
    'stadium-seatmap.loading',
    'stadium-seatmap.manual-required',
    'stadium.favorite-toggle',
    'team-recommendation.test',
    'team.logo',
    'terms-of-service.page',
    'theme-toggle.button',
    'ticket.upload-modal',
    'ui.alert',
    'ui.alert-description',
    'ui.alert-title',
    'ui.auth-primitive',
    'ui.autosize-textarea',
    'ui.button',
    'ui.calendar',
    'ui.card',
    'ui.card-action',
    'ui.card-content',
    'ui.card-description',
    'ui.card-footer',
    'ui.card-header',
    'ui.card-title',
    'ui.input',
    'ui.page-container',
    'ui.page-cta-group',
    'ui.page-mockup-frame',
    'ui.page-section',
    'ui.page-section-header',
    'ui.page-stack',
    'ui.page-text-block',
    'ui.plain-button',
    'ui.plain-dialog',
    'ui.plain-menu',
    'ui.profile-avatar',
    'ui.skeleton.loading',
    'ui.status-badge',
    'ui.table',
    'ui.table-body',
    'ui.table-caption',
    'ui.table-cell',
    'ui.table-footer',
    'ui.table-head',
    'ui.table-header',
    'ui.table-row',
    'ui.textarea',
    'ui.toaster',
    'ui.ui-kit-preview',
    'verification-required.dialog',
    'viewport-deferred',
    'welcome-guide',
  ]);
  assert.deepEqual(
    resolveComponentStateAdapter('loading.no-props', {
      componentId: 'src/components/LoadingSpinner.tsx#LoadingSpinner',
      states: { data: 'loading' },
      variants: {},
    }),
    { props: {} },
  );
  assert.throws(
    () => resolveComponentStateAdapter('unknown', {
      componentId: 'unknown',
      states: {},
      variants: {},
    }),
    /등록되지 않은 Visual QA state adapter/,
  );
});

test('notice adapters expose route fallback and deterministic permission-aware list states', () => {
  const fallback = resolveComponentStateAdapter('notice.page', {
    componentId: 'src/components/NoticePage.tsx#NoticePage',
    states: { data: 'loading' },
    variants: { theme: 'light', visibility: 'open' },
  });
  assert.deepEqual(fallback.props, {
    visualQaStateOverride: { phase: 'fallback' },
  });
  assert.equal(fallback.captureSelector, '[data-testid="notice-page-fallback"]');
  assert.equal(fallback.expectedPathname, '/notice');

  const paginatedAdmin = resolveComponentStateAdapter('notice.runtime', {
    componentId: 'src/components/NoticePageRuntime.tsx#NoticePageRuntime',
    states: {
      data: 'maximum-supported',
      interactions: 'selected',
      permissions: 'admin',
      system: 'online',
    },
    variants: { theme: 'dark', visibility: 'open' },
    interactionTargetId: 'select-page-3',
  });
  const paginatedOverride = paginatedAdmin.props.visualQaStateOverride as {
    currentPage?: number;
    phase: string;
    posts?: unknown[];
    userRole?: string;
  };
  assert.equal(paginatedOverride.phase, 'resolved');
  assert.equal(paginatedOverride.currentPage, 2);
  assert.equal(paginatedOverride.posts?.length, 31);
  assert.equal(paginatedOverride.userRole, 'ROLE_ADMIN');
  assert.equal(paginatedAdmin.captureSelector, '[data-testid="notice-page-runtime"]');
  assert.equal(paginatedAdmin.theme, 'dark');

  const paginatedPost = resolveComponentStateAdapter('notice.runtime', {
    componentId: 'src/components/NoticePageRuntime.tsx#NoticePageRuntime',
    states: {
      data: 'maximum-supported',
      interactions: 'hover',
      permissions: 'user',
      system: 'online',
    },
    variants: { theme: 'light', visibility: 'open' },
    interactionTargetId: 'post-page-2-first',
  });
  assert.equal(
    (paginatedPost.props.visualQaStateOverride as { currentPage?: number }).currentPage,
    2,
  );

  const pressure = resolveComponentStateAdapter('notice.runtime', {
    componentId: 'src/components/NoticePageRuntime.tsx#NoticePageRuntime',
    states: {
      data: 'unbroken-token',
      interactions: 'hover',
      permissions: 'anonymous',
      system: 'online',
    },
    variants: { theme: 'light' },
    interactionTargetId: 'post-first',
  });
  const pressurePosts = (pressure.props.visualQaStateOverride as { posts?: Array<{ content: string }> }).posts;
  assert.match(pressurePosts?.[0]?.content ?? '', /^NOTICE-UNBROKEN/);

  assert.throws(
    () => resolveComponentStateAdapter('notice.runtime', {
      componentId: 'src/components/NoticePageRuntime.tsx#NoticePageRuntime',
      states: {
        data: 'error-503',
        interactions: 'default',
        permissions: 'user',
        system: 'online',
      },
      variants: { theme: 'light' },
    }),
    /notice system state/,
  );
});

test('offseason page adapters use deterministic non-production fixtures and route-safe states', () => {
  const homePage = resolveComponentStateAdapter('offseason.home.page', {
    componentId: 'src/components/OffSeasonHomePage.tsx#OffSeasonHomePage',
    states: { data: 'loading' },
    variants: { theme: 'dark', visibility: 'open' },
  });
  assert.deepEqual(homePage.props, {
    visualQaStateOverride: { phase: 'fallback' },
  });
  assert.equal(homePage.captureSelector, '[data-testid="offseason-home-page-fallback"]');
  assert.equal(homePage.expectedPathname, '/offseason');
  assert.equal(homePage.theme, 'dark');

  const startedHome = resolveComponentStateAdapter('offseason.home', {
    componentId: 'src/components/OffSeasonHome.tsx#OffSeasonHome',
    states: {
      data: 'single',
      interactions: 'default',
      system: 'online',
    },
    variants: { layout: 'mobile', openingState: 'started', theme: 'light' },
  });
  const homeOverride = startedHome.props.visualQaStateOverride as {
    currentTime?: string;
    data?: { movements: unknown[]; awards: unknown[]; rankings: unknown[] };
    isLargeScreen?: boolean;
    phase: string;
  };
  assert.equal(homeOverride.phase, 'resolved');
  assert.equal(homeOverride.currentTime, '2026-08-27T00:00:00.000Z');
  assert.equal(homeOverride.isLargeScreen, false);
  assert.equal(homeOverride.data?.movements.length, 1);
  assert.equal(homeOverride.data?.awards.length, 1);
  assert.equal(homeOverride.data?.rankings.length, 1);
  assert.equal(startedHome.captureSelector, '[data-testid="offseason-home-runtime"]');

  const listError = resolveComponentStateAdapter('offseason.list', {
    componentId: 'src/components/OffSeasonList.tsx#OffSeasonList',
    states: {
      data: 'error-503',
      interactions: 'default',
      system: 'offline',
    },
    variants: { layout: 'mobile', theme: 'dark' },
  });
  const listOverride = listError.props.visualQaStateOverride as {
    error?: Error;
    isMobile?: boolean;
    phase: string;
  };
  assert.equal(listOverride.phase, 'error');
  assert.equal(listOverride.isMobile, true);
  assert.match(listOverride.error?.message ?? '', /503|사용할 수 없/);
  assert.equal(listError.expectedPathname, '/offseason/list');

  assert.throws(
    () => resolveComponentStateAdapter('offseason.list', {
      componentId: 'src/components/OffSeasonList.tsx#OffSeasonList',
      states: { data: 'loading', interactions: 'default', system: 'online' },
      variants: { layout: 'mobile', theme: 'light' },
    }),
    /offseason list system state/,
  );
});

test('offseason leaf adapters cover copy pressure, layout, sort, and dialog states', () => {
  const news = resolveComponentStateAdapter('offseason.home.news', {
    componentId: 'src/components/OffSeasonHomeNewsRuntime.tsx#OffSeasonHomeNewsRuntime',
    states: { data: 'unbroken-token', interactions: 'hover' },
    variants: { theme: 'light' },
    interactionTargetId: 'list-link',
  });
  assert.match(
    ((news.props.bigEvents as Array<{ player: string }>)[0]?.player ?? ''),
    /^VISUAL-QA-/,
  );
  assert.equal(news.captureSelector, '[data-testid="offseason-home-news-runtime"]');

  const highlights = resolveComponentStateAdapter('offseason.home.highlights', {
    componentId: 'src/components/OffSeasonHomeHighlightsRuntime.tsx#OffSeasonHomeHighlightsRuntime',
    states: { data: 'maximum-supported' },
    variants: { layout: 'mobile', theme: 'dark' },
  });
  assert.equal((highlights.props.awards as unknown[]).length, 4);
  assert.equal((highlights.props.rankings as unknown[]).length, 10);
  assert.equal(highlights.props.isLargeScreen, false);

  const content = resolveComponentStateAdapter('offseason.list.content', {
    componentId: 'src/components/offseason/OffseasonListContentRuntime.tsx#OffseasonListContentRuntime',
    states: { data: 'empty', interactions: 'default', system: 'online' },
    variants: { activeFilters: 'present', layout: 'mobile', theme: 'light' },
  });
  assert.equal(content.props.isMobile, true);
  assert.equal(content.props.hasActiveFilters, true);
  assert.deepEqual(content.props.filteredList, []);

  const cards = resolveComponentStateAdapter('offseason.list.mobile-cards', {
    componentId: 'src/components/offseason/OffseasonMobileCards.tsx#OffseasonMobileCards',
    states: { data: 'long-korean', interactions: 'focus-visible' },
    variants: { theme: 'dark' },
    interactionTargetId: 'movement-first',
  });
  assert.match(
    ((cards.props.movements as Array<{ player: string }>)[0]?.player ?? ''),
    /모바일/,
  );
  assert.equal(cards.theme, 'dark');

  const detail = resolveComponentStateAdapter('offseason.list.detail', {
    componentId: 'src/components/offseason/OffseasonMovementDetailPanel.tsx#OffseasonMovementDetailPanel',
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { details: 'complete', layout: 'mobile', theme: 'light' },
  });
  assert.equal(detail.props.open, true);
  assert.equal(detail.props.isMobile, true);
  assert.match((detail.props.movement as { player: string }).player, /^VISUAL-QA-/);
  assert.equal(detail.captureSelector, '[data-testid="offseason-movement-detail"]');

  const pill = resolveComponentStateAdapter('offseason.pill', {
    componentId: 'src/components/offseason/offseasonUi.tsx#OffseasonPill',
    states: { data: 'unbroken-token' },
    variants: { theme: 'light' },
  });
  assert.match(String(pill.props.children), /^VISUAL-QA-/);

  const sectionPill = resolveComponentStateAdapter('offseason.section-pill', {
    componentId: 'src/components/offseason/offseasonUi.tsx#OffseasonSectionPill',
    states: { data: 'single' },
    variants: { section: 'trade', theme: 'dark' },
  });
  assert.equal(sectionPill.props.section, '트레이드');
});

test('admin offseason movement root adapter is fail-closed and owns static non-production fixtures', () => {
  const componentId = 'src/components/admin/OffseasonMovementAdminPanel.tsx#OffseasonMovementAdminPanel';
  const maximum = resolveComponentStateAdapter('admin.offseason-movement-panel', {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'idle', theme: 'dark' },
  });
  const maximumOverride = maximum.props.visualQaStateOverride as {
    active: boolean;
    movements: Array<{ playerName: string }>;
  };
  assert.equal(maximum.captureSelector, '[data-testid="admin-offseason-movement-panel"]');
  assert.equal(maximumOverride.active, true);
  assert.equal(maximumOverride.movements.length, 50);
  assert.ok(maximumOverride.movements.every(({ playerName }) => playerName.includes('MOCK')));

  const dialog = resolveComponentStateAdapter('admin.offseason-movement-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'delete-submitting', theme: 'dark' },
  });
  assert.equal((dialog.props.visualQaStateOverride as {
    deleteTarget: unknown;
    submitting: boolean;
  }).submitting, true);
  assert.ok((dialog.props.visualQaStateOverride as { deleteTarget: unknown }).deleteTarget);

  const hover = resolveComponentStateAdapter('admin.offseason-movement-panel', {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'idle', theme: 'dark' },
    interactionTargetId: 'refresh',
  });
  assert.equal((hover.props.visualQaStateOverride as { active: boolean }).active, true);

  assert.throws(() => resolveComponentStateAdapter('admin.offseason-movement-panel', {
    componentId,
    states: {
      data: 'empty',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'idle', theme: 'dark' },
    interactionTargetId: 'refresh',
  }), /지원하지 않는 Admin offseason movement state/);
});

test('admin offseason content adapter is fail-closed, controlled, and owns exact static fixtures', () => {
  const componentId = 'src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminPanelContent';
  const maximum = resolveComponentStateAdapter('admin.offseason-movement-content', {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'change',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'idle', theme: 'dark' },
    interactionTargetId: 'team-filter',
  });
  assert.equal(maximum.captureSelector, '[data-testid="admin-offseason-content"]');
  assert.equal(maximum.props.visualQaControlledState, true);
  assert.equal((maximum.props.movements as unknown[]).length, 50);
  assert.ok((maximum.props.movements as Array<{ playerName: string; sourceUrl: string }>).every(
    ({ playerName, sourceUrl }) => playerName.includes('MOCK') && sourceUrl.startsWith('https://example.invalid/'),
  ));

  const dialog = resolveComponentStateAdapter('admin.offseason-movement-content', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'create-dialog', theme: 'dark' },
  });
  assert.equal(dialog.captureSelector, 'body');
  assert.equal(dialog.props.dialogOpen, true);

  assert.throws(() => resolveComponentStateAdapter('admin.offseason-movement-content', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'content-fallback', theme: 'dark' },
  }), /지원하지 않는 Admin offseason content state/);
  assert.throws(() => resolveComponentStateAdapter('admin.offseason-movement-content', {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'change',
      permissions: 'admin',
      system: 'idle',
      extra: 'illegal',
    } as never,
    variants: { preset: 'idle', theme: 'dark' },
    interactionTargetId: 'team-filter',
  }), /지원하지 않는 Admin offseason content state/);
});

test('achievement and not-found adapters cover mobile copy pressure and themes', () => {
  const achievement = resolveComponentStateAdapter('achievement.celebration-overlay', {
    componentId: 'src/components/AchievementCelebrationOverlay.tsx#AchievementCelebrationOverlay',
    states: { data: 'unbroken-token', interactions: 'focus-visible' },
    variants: { theme: 'dark' },
    interactionTargetId: 'confirm',
  });
  const achievementProps = achievement.props.achievement as {
    description: string;
    name: string;
  };
  assert.equal(achievement.theme, 'dark');
  assert.equal(
    achievement.captureSelector,
    '[data-testid="achievement-celebration-overlay"]',
  );
  assert.match(achievementProps.name, /^ACHIEVEMENT-/);
  assert.match(achievementProps.description, /^DESCRIPTION-/);

  const notFound = resolveComponentStateAdapter('route.not-found', {
    componentId: 'src/components/NotFound.tsx#NotFound',
    states: { data: 'single', interactions: 'pressed' },
    variants: { theme: 'light' },
    interactionTargetId: 'back',
  });
  assert.deepEqual(notFound.props, {});
  assert.equal(notFound.theme, 'light');
  assert.match(String(notFound.surfaceClassName), /max-w-\[320px\]/);
});

test('floating chatbot and DM badge adapters preserve bounded mobile surfaces', () => {
  const chatbot = resolveComponentStateAdapter('chatbot.floating-button', {
    componentId: 'src/components/ChatBotFloatingButton.tsx#ChatBotFloatingButton',
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { placement: 'mate-raised', size: 'compact', theme: 'dark' },
  });
  assert.equal(chatbot.props.compactOnMobile, true);
  assert.equal(chatbot.props.testId, 'visual-qa-chatbot-floating-button');
  assert.match(String(chatbot.props.className), /mobile-content-safe-bottom/);
  assert.match(String(chatbot.surfaceClassName), /min-h-\[844px\]/);
  assert.match(String(chatbot.surfaceClassName), /w-\[320px\]/);
  assert.match(String(chatbot.surfaceClassName), /max-w-none/);
  assert.equal(chatbot.theme, 'dark');

  const badge = resolveComponentStateAdapter('public-navbar.dm-unread-badge', {
    componentId: 'src/components/PublicNavbarDmUnreadBadge.tsx#PublicNavbarDmUnreadBadge',
    states: { data: 'overflow', permissions: 'user' },
    variants: { theme: 'light' },
  });
  assert.equal(badge.props.unreadCountOverride, 100);
  assert.match(String(badge.surfaceClassName), /h-11 w-11/);
  assert.equal(badge.theme, 'light');
});

test('public navbar menu panel adapter maps identity, permission, route, auth, and theme states', () => {
  const menu = resolveComponentStateAdapter('public-navbar.menu-panel', {
    componentId: 'src/components/PublicNavbarMenuPanel.tsx#PublicNavbarMenuPanel',
    states: {
      data: 'single',
      interactions: 'focus-visible',
      permissions: 'admin',
    },
    variants: {
      auth: 'settled',
      route: 'prediction',
      theme: 'dark',
    },
    interactionTargetId: 'admin',
  });
  const override = menu.props.visualQaStateOverride as Record<string, unknown>;

  assert.equal(override.isLoggedIn, true);
  assert.equal(override.userRole, 'ROLE_ADMIN');
  assert.equal(menu.props.isAuthBootstrapPending, false);
  assert.equal(menu.initialPathname, '/prediction');
  assert.match(String(menu.surfaceClassName), /w-\[320px\]/);
  assert.equal(menu.theme, 'dark');

  const pressureMenu = resolveComponentStateAdapter('public-navbar.menu-panel', {
    componentId: 'src/components/PublicNavbarMenuPanel.tsx#PublicNavbarMenuPanel',
    states: {
      data: 'unbroken-token',
      interactions: 'default',
      permissions: 'admin',
    },
    variants: { auth: 'settled', route: 'home', theme: 'light' },
  });
  const pressureOverride = pressureMenu.props.visualQaStateOverride as Record<string, unknown>;
  assert.match(String(pressureOverride.userName), /^PUBLIC-MENU-/);

  assert.throws(() => resolveComponentStateAdapter('public-navbar.menu-panel', {
    componentId: 'src/components/PublicNavbarMenuPanel.tsx#PublicNavbarMenuPanel',
    states: {
      data: 'long-korean',
      interactions: 'default',
      permissions: 'anonymous',
    },
    variants: { auth: 'settled', route: 'home', theme: 'light' },
  }), /지원하지 않는 Visual QA public navbar menu panel state/);

  assert.throws(() => resolveComponentStateAdapter('public-navbar.menu-panel', {
    componentId: 'src/components/PublicNavbarMenuPanel.tsx#PublicNavbarMenuPanel',
    states: {
      data: 'single',
      interactions: 'default',
      permissions: 'user',
    },
    variants: { auth: 'bootstrap-pending', route: 'home', theme: 'light' },
  }), /지원하지 않는 Visual QA public navbar menu panel state/);
});

test('favorite, today-count, and cheer-theme adapters preserve mobile interaction bounds', () => {
  const favorite = resolveComponentStateAdapter('stadium.favorite-toggle', {
    componentId: 'src/components/AuthenticatedStadiumFavoriteToggle.tsx#AuthenticatedStadiumFavoriteToggle',
    states: { data: 'single', interactions: 'submitting', permissions: 'user' },
    variants: { theme: 'dark' },
  });
  assert.deepEqual(favorite.props.favoriteIdsOverride, ['visual-qa-stadium']);
  assert.equal(favorite.props.stadiumId, 'visual-qa-stadium');
  assert.equal(typeof favorite.props.onToggleOverride, 'function');
  assert.match(String(favorite.surfaceClassName), /min-h-20/);
  assert.equal(favorite.theme, 'dark');

  const todayBadge = resolveComponentStateAdapter('mate.today-count-badge', {
    componentId: 'src/components/MateTodayCountBadge.tsx#MateTodayCountBadge',
    states: { data: 'overflow' },
    variants: { theme: 'light' },
  });
  assert.equal(todayBadge.props.countOverride, 100);
  assert.match(String(todayBadge.surfaceClassName), /max-w-\[320px\]/);

  const themeControl = resolveComponentStateAdapter('cheer.theme-control', {
    componentId: 'src/components/CheerThemeControl.tsx#CheerThemeControl',
    states: { data: 'single', interactions: 'focus-visible' },
    variants: {
      accent: 'dark',
      density: 'compact',
      preference: 'system',
      'resolved-theme': 'dark',
    },
    interactionTargetId: 'dark',
  });
  assert.deepEqual(themeControl.props.themeStateOverride, {
    resolvedTheme: 'dark',
    systemTheme: 'dark',
    theme: 'system',
  });
  assert.equal(themeControl.props.compact, true);
  assert.equal(themeControl.theme, 'dark');
});

test('notification adapters cover compact badges, deterministic permissions, and long mobile content', () => {
  const controls = resolveComponentStateAdapter('navbar.notification-controls', {
    componentId: 'src/components/NavbarNotificationControls.tsx#NavbarNotificationControls',
    states: { data: 'overflow', interactions: 'focus-visible', permissions: 'user' },
    variants: { disclosure: 'open', panel: 'resolved-long-korean', theme: 'dark' },
    interactionTargetId: 'trigger',
  });
  assert.equal(controls.props.unreadCountOverride, 100);
  assert.equal(controls.props.openOverride, true);
  assert.ok(controls.props.notificationPanelPropsOverride);
  assert.equal(controls.captureSelector, '[data-testid="navbar-notification-popover"]');
  assert.match(String(controls.surfaceClassName), /w-\[320px\]/);
  assert.equal(controls.theme, 'dark');
  assert.doesNotThrow(() => resolveComponentStateAdapter('navbar.notification-controls', {
    componentId: 'src/components/NavbarNotificationControls.tsx#NavbarNotificationControls',
    states: { data: 'single', interactions: 'focus-visible', permissions: 'user' },
    variants: { disclosure: 'closed', panel: 'resolved-empty', theme: 'light' },
  }));

  const panel = resolveComponentStateAdapter('notification.panel', {
    componentId: 'src/components/NotificationPanel.tsx#NotificationPanel',
    states: { data: 'unbroken-token', interactions: 'pressed', permissions: 'user' },
    variants: { 'browser-permission': 'default', tab: 'cheer', theme: 'light' },
    interactionTargetId: 'browser-permission',
  });
  const notifications = panel.props.notificationsOverride as Array<{
    message: string;
    title: string;
  }>;
  assert.match(notifications[0].title, /^NOTIFICATION-TITLE-/);
  assert.match(notifications[0].message, /^NOTIFICATION-MESSAGE-/);
  assert.equal(panel.props.initialActiveTabOverride, 'CHEER');
  assert.equal(panel.props.browserPermissionOverride, 'default');
  assert.equal(panel.props.nowOverride, '2026-08-23T12:00:00+09:00');
  assert.match(String(panel.surfaceClassName), /w-\[320px\]/);
});

test('account deletion recovery adapter covers initial transport states and mutation outcomes', async () => {
  const longError = resolveComponentStateAdapter('auth.account-deletion-recovery', {
    componentId: 'src/components/AccountDeletionRecovery.tsx#AccountDeletionRecovery',
    states: {
      data: 'unbroken-token',
      interactions: 'focus-visible',
      permissions: 'anonymous',
      system: 'online',
    },
    variants: { theme: 'dark' },
    interactionTargetId: 'back',
  });
  const initialState = longError.props.initialStateOverride as { error: string; isLoading: boolean };
  assert.match(initialState.error, /^ACCOUNT-RECOVERY-ERROR-/);
  assert.equal(initialState.isLoading, false);
  assert.equal(longError.captureSelector, '[data-testid="auth-shell"]');
  assert.equal(longError.theme, 'dark');

  const success = resolveComponentStateAdapter('auth.account-deletion-recovery', {
    componentId: 'src/components/AccountDeletionRecovery.tsx#AccountDeletionRecovery',
    states: {
      data: 'single',
      interactions: 'submitting',
      permissions: 'anonymous',
      system: 'online',
    },
    variants: { theme: 'light' },
    interactionTargetId: 'submit-online',
  });
  const runtime = success.props.runtimeOverride as {
    requestRecovery: (token: string) => Promise<void>;
  };
  await assert.doesNotReject(runtime.requestRecovery('visual-qa-token'));
  assert.equal(success.props.tokenOverride, 'visual-qa-token');

  const offline = resolveComponentStateAdapter('auth.account-deletion-recovery', {
    componentId: 'src/components/AccountDeletionRecovery.tsx#AccountDeletionRecovery',
    states: {
      data: 'single',
      interactions: 'submitting',
      permissions: 'anonymous',
      system: 'offline',
    },
    variants: { theme: 'light' },
    interactionTargetId: 'submit-offline',
  });
  const offlineRuntime = offline.props.runtimeOverride as {
    requestRecovery: (token: string) => Promise<void>;
  };
  await assert.rejects(offlineRuntime.requestRecovery('visual-qa-token'), /연결/);
});

test('password reset page adapters map form, pressure, completion, visibility, and theme states', () => {
  const requestError = resolveComponentStateAdapter('auth.password-reset', {
    componentId: 'src/components/PasswordReset.tsx#PasswordReset',
    states: { data: 'long-korean', interactions: 'focus-visible', permissions: 'anonymous' },
    variants: { theme: 'dark' },
    interactionTargetId: 'submit',
  });
  assert.equal(requestError.captureSelector, '[data-testid="auth-shell"]');
  assert.equal(requestError.initialPathname, '/password/reset?redirect=%2Fmate');
  assert.equal(requestError.expectedPathname, '/password/reset');
  assert.equal(requestError.expectedSearch, '?redirect=%2Fmate');
  assert.equal(requestError.theme, 'dark');
  assert.match(String((requestError.props.visualQaStateOverride as { error: string }).error), /모바일/);

  const confirmation = resolveComponentStateAdapter('auth.password-reset-confirm', {
    componentId: 'src/components/PasswordResetConfirm.tsx#PasswordResetConfirm',
    states: { data: 'single', interactions: 'default', permissions: 'anonymous' },
    variants: { theme: 'light', visibility: 'both-visible' },
  });
  assert.equal(confirmation.initialPathname, '/password/reset/confirm?token=visual-qa-token&redirect=%2Fmate');
  assert.equal(confirmation.theme, 'light');
  assert.deepEqual(
    confirmation.props.visualQaStateOverride,
    {
      token: 'visual-qa-token',
      formData: { newPassword: 'VisualQa1!', confirmPassword: 'VisualQa1!' },
      fieldErrors: { newPassword: '', confirmPassword: '' },
      showNewPassword: true,
      showConfirmPassword: true,
      isCompleted: false,
      isLoading: false,
      error: null,
    },
  );

  assert.throws(() => resolveComponentStateAdapter('auth.password-reset-confirm', {
    componentId: 'src/components/PasswordResetConfirm.tsx#PasswordResetConfirm',
    states: { data: 'complete', interactions: 'default', permissions: 'anonymous' },
    variants: { theme: 'dark', visibility: 'new-visible' },
  }), /지원하지 않는 Visual QA password-reset-confirm state/);
});

test('login page adapter maps form pressure, saved-email, visibility, interaction, and theme states', () => {
  const login = resolveComponentStateAdapter('auth.login', {
    componentId: 'src/components/Login.tsx#Login',
    states: { data: 'long-korean', interactions: 'focus-visible', permissions: 'anonymous' },
    variants: { 'remember-email': 'checked', theme: 'dark', visibility: 'visible' },
    interactionTargetId: 'password-visibility',
  });

  assert.equal(login.captureSelector, '[data-testid="auth-shell"]');
  assert.equal(login.initialPathname, '/login?redirect=%2Fmate');
  assert.equal(login.expectedPathname, '/login');
  assert.equal(login.expectedSearch, '?redirect=%2Fmate');
  assert.equal(login.theme, 'dark');
  assert.deepEqual(login.props.visualQaStateOverride, {
    formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
    fieldErrors: { email: '', password: '' },
    showPassword: true,
    isLoading: false,
    error: '모바일 화면에서도 로그인 오류 안내와 입력 영역, 저장 옵션, 비밀번호 보기 버튼, 소셜 로그인 버튼이 서로 겹치지 않고 자연스럽게 줄바꿈되는지 확인하는 매우 긴 한국어 안내입니다. 계정 정보를 확인한 뒤 다시 시도해주세요.',
    rememberEmail: true,
  });

  assert.throws(() => resolveComponentStateAdapter('auth.login', {
    componentId: 'src/components/Login.tsx#Login',
    states: { data: 'loading', interactions: 'hover', permissions: 'anonymous' },
    variants: { 'remember-email': 'unchecked', theme: 'light', visibility: 'hidden' },
    interactionTargetId: 'submit',
  }), /지원하지 않는 Visual QA login interaction/);
});

test('signup page adapter maps availability, validation, warning, visibility, interaction, and theme states', () => {
  const signup = resolveComponentStateAdapter('auth.signup', {
    componentId: 'src/components/SignUp.tsx#SignUp',
    states: { data: 'long-korean', interactions: 'focus-visible', permissions: 'anonymous' },
    variants: { theme: 'dark', visibility: 'both-visible' },
    interactionTargetId: 'confirm-password-visibility',
  });

  assert.equal(signup.captureSelector, '[data-testid="auth-shell"]');
  assert.equal(signup.initialPathname, '/signup?redirect=%2Fmate');
  assert.equal(signup.expectedPathname, '/signup');
  assert.equal(signup.expectedSearch, '?redirect=%2Fmate');
  assert.equal(signup.theme, 'dark');
  const override = signup.props.visualQaStateOverride as {
    error: string;
    formData: { favoriteTeam: string };
    showConfirmPassword: boolean;
    showPassword: boolean;
  };
  assert.match(override.error, /모바일/);
  assert.equal(override.formData.favoriteTeam, 'LG 트윈스');
  assert.equal(override.showPassword, true);
  assert.equal(override.showConfirmPassword, true);

  const noTeam = resolveComponentStateAdapter('auth.signup', {
    componentId: 'src/components/SignUp.tsx#SignUp',
    states: { data: 'no-team', interactions: 'default', permissions: 'anonymous' },
    variants: { theme: 'light', visibility: 'hidden' },
  });
  assert.equal(
    (noTeam.props.visualQaStateOverride as { formData: { favoriteTeam: string } }).formData.favoriteTeam,
    '없음',
  );

  assert.throws(() => resolveComponentStateAdapter('auth.signup', {
    componentId: 'src/components/SignUp.tsx#SignUp',
    states: { data: 'handle-checking', interactions: 'hover', permissions: 'anonymous' },
    variants: { theme: 'light', visibility: 'hidden' },
    interactionTargetId: 'submit',
  }), /지원하지 않는 Visual QA signup submit interaction/);
});

test('oauth callback page adapters map pending, terminal, pressure, interaction, and theme states', () => {
  const callback = resolveComponentStateAdapter('auth.oauth-callback', {
    componentId: 'src/components/OAuthCallback.tsx#OAuthCallback',
    states: {
      data: 'long-korean',
      interactions: 'focus-visible',
      permissions: 'anonymous',
      system: 'online',
    },
    variants: { theme: 'dark' },
    interactionTargetId: 'return-login',
  });
  assert.equal(callback.captureSelector, '[data-testid="auth-shell"]');
  assert.equal(callback.initialPathname, '/oauth/callback?state=visual-qa-state');
  assert.equal(callback.expectedPathname, '/oauth/callback');
  assert.equal(callback.expectedSearch, '?state=visual-qa-state');
  assert.equal(callback.theme, 'dark');
  assert.match(
    String((callback.props.visualQaStateOverride as { title: string }).title),
    /모바일/,
  );

  const confirmation = resolveComponentStateAdapter('auth.oauth-email-confirm', {
    componentId: 'src/components/OAuthEmailChallengeConfirm.tsx#OAuthEmailChallengeConfirm',
    states: {
      data: 'expired',
      interactions: 'pressed',
      permissions: 'anonymous',
      system: 'online',
    },
    variants: { theme: 'light' },
    interactionTargetId: 'return-login',
  });
  assert.equal(confirmation.captureSelector, '[data-testid="auth-shell"]');
  assert.equal(confirmation.initialPathname, '/oauth/email/confirm?token=visual-qa-token');
  assert.deepEqual(confirmation.props.visualQaStateOverride, {
    phase: 'expired',
    error: null,
  });

  assert.throws(() => resolveComponentStateAdapter('auth.oauth-email-confirm', {
    componentId: 'src/components/OAuthEmailChallengeConfirm.tsx#OAuthEmailChallengeConfirm',
    states: {
      data: 'loading',
      interactions: 'hover',
      permissions: 'anonymous',
      system: 'timeout',
    },
    variants: { theme: 'light' },
    interactionTargetId: 'return-login',
  }), /지원하지 않는 Visual QA oauth-email-confirm interaction/);
});

test('admin shell adapters isolate lazy phases, tabs, stats, and pressure copy', () => {
  const page = resolveComponentStateAdapter('admin.page-shell', {
    componentId: 'src/components/AdminPage.tsx#AdminPage',
    states: { data: 'unbroken-token', interactions: 'default', permissions: 'super-admin' },
    variants: { phase: 'resolved' },
  });
  assert.ok(page.props.runtimeContentOverride);
  assert.equal(page.captureSelector, '[data-testid="admin-page-shell"]');

  const route = resolveComponentStateAdapter('admin.page-route', {
    componentId: 'src/components/AdminPagePage.tsx#AdminPagePage',
    states: { data: 'loading', interactions: 'default', permissions: 'admin' },
    variants: {},
  });
  assert.ok(route.props.runtimeOverride);
  assert.equal(route.captureSelector, '[data-testid="admin-page-route-fallback"]');

  const tabs = resolveComponentStateAdapter('admin.runtime-content', {
    componentId: 'src/components/AdminPageRuntimeContent.tsx#AdminPageRuntimeContent',
    states: { data: 'long-korean', interactions: 'focus-visible', permissions: 'admin' },
    variants: { 'active-tab': 'clientErrors' },
    interactionTargetId: 'clientErrors',
  });
  assert.equal(tabs.props.initialActiveTabOverride, 'clientErrors');
  assert.ok(tabs.props.dataRuntimeOverride);
  assert.match(String(tabs.surfaceClassName), /w-\[320px\]/);

  const data = resolveComponentStateAdapter('admin.data-runtime', {
    componentId: 'src/components/AdminPageDataRuntime.tsx#AdminPageDataRuntime',
    states: { data: 'maximum-supported', interactions: 'hover', permissions: 'super-admin' },
    variants: { 'active-tab': 'ai', panel: 'loading' },
    interactionTargetId: 'mates-stat',
  });
  assert.deepEqual(data.props.statsOverride, {
    totalMates: Number.MAX_SAFE_INTEGER,
    totalPosts: Number.MAX_SAFE_INTEGER,
    totalUsers: Number.MAX_SAFE_INTEGER,
  });
  assert.equal(data.props.activeTab, 'ai');
  assert.ok(data.props.panelContentOverride);
  assert.equal(data.captureSelector, '[data-testid="admin-page-data-runtime"]');
});

test('admin badge adapters map content pressure, preset tones, sizes, and fallbacks fail closed', () => {
  const badgeId = 'src/components/admin/AdminPanelPrimitives.tsx#AdminBadge';
  const pressureBadge = resolveComponentStateAdapter('admin.badge', {
    componentId: badgeId,
    states: { data: 'unbroken-token' },
    variants: { theme: 'dark', tone: 'decision-no-go' },
  });
  assert.match(String(pressureBadge.props.children), /^ADMIN-A{260}/);
  assert.match(String(pressureBadge.props.className), /bg-red-500\/20/);
  assert.equal(pressureBadge.props.testId, 'visual-qa-admin-badge');
  assert.equal(pressureBadge.captureSelector, '[data-testid="visual-qa-admin-badge"]');
  assert.equal(pressureBadge.theme, 'dark');

  const statusId = 'src/components/admin/AdminPanelPrimitives.tsx#AdminStatusBadge';
  const statusPressure = resolveComponentStateAdapter('admin.status-badge', {
    componentId: statusId,
    states: { data: 'explicit-unbroken' },
    variants: { size: 'md', theme: 'dark' },
  });
  assert.equal(statusPressure.props.status, 'IN_PROGRESS');
  assert.match(String(statusPressure.props.label), /^STATUS-S{260}/);
  assert.equal(statusPressure.props.size, 'md');
  assert.equal(statusPressure.theme, 'dark');

  assert.throws(
    () => resolveComponentStateAdapter('admin.badge', {
      componentId: badgeId,
      states: { data: 'single' },
      variants: { theme: 'dark', tone: 'unknown' },
    }),
    /지원하지 않는 Visual QA variant: tone=unknown/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('admin.status-badge', {
      componentId: statusId,
      states: { data: 'not-real' },
      variants: { size: 'xs', theme: 'light' },
    }),
    /지원하지 않는 Visual QA state: data=not-real/,
  );
});

test('admin animated number and stat card adapters freeze frames, pressure, colors, and hover fail closed', () => {
  const animatedId = 'src/components/admin/AnimatedNumber.tsx#AnimatedNumber';
  const animatedMidpoint = resolveComponentStateAdapter('admin.animated-number', {
    componentId: animatedId,
    states: { data: 'maximum-supported' },
    variants: { frame: 'midpoint', theme: 'dark' },
  });
  assert.equal(animatedMidpoint.props.value, Number.MAX_SAFE_INTEGER);
  assert.equal(animatedMidpoint.props.visualQaDisplayValueOverride, 8_444_249_301_319_679);
  assert.equal(animatedMidpoint.captureSelector, '[data-testid="visual-qa-admin-animated-number"]');

  const statId = 'src/components/admin/StatCard.tsx#StatCard';
  const statPressure = resolveComponentStateAdapter('admin.stat-card', {
    componentId: statId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { color: 'sky', frame: 'animated-midpoint', theme: 'dark' },
  });
  assert.match(String(statPressure.props.label), /^LABEL-L{260}/);
  assert.equal(statPressure.props.animate, true);
  assert.equal(statPressure.props.visualQaDisplayValueOverride, 937);
  assert.equal(statPressure.captureSelector, '[data-testid="visual-qa-admin-stat-card"]');

  const hover = resolveComponentStateAdapter('admin.stat-card', {
    componentId: statId,
    states: { data: 'single', interactions: 'hover' },
    variants: { color: 'amber', frame: 'static', theme: 'dark' },
    interactionTargetId: 'card',
  });
  assert.equal(hover.props.animate, false);

  assert.throws(
    () => resolveComponentStateAdapter('admin.stat-card', {
      componentId: statId,
      states: { data: 'maximum-supported', interactions: 'hover' },
      variants: { color: 'amber', frame: 'static', theme: 'dark' },
      interactionTargetId: 'card',
    }),
    /지원하지 않는 StatCard state/,
  );
});

test('admin coach auto brief ops adapter maps lifecycle, data pressure, windows, copy states, and interaction targets', () => {
  const componentId = 'src/components/admin/AdminCoachAutoBriefOpsPanel.tsx#AdminCoachAutoBriefOpsPanel';
  const maximum = resolveComponentStateAdapter('admin.coach-auto-brief-ops-panel', {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'default',
      system: 'loading',
    },
    variants: { copy: 'done', theme: 'dark', window: 'custom' },
  });
  const maximumHealth = maximum.props.health as AdminCoachAutoBriefOpsHealth;
  assert.equal(maximum.props.loading, true);
  assert.equal(maximum.props.selectedWindow, 'custom');
  assert.equal(maximum.props.commandCopyState, 'done');
  assert.equal(maximumHealth.summary.unresolved_count, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumHealth.unresolved_targets.length, 50);
  assert.equal(maximum.captureSelector, '[data-testid="admin-coach-auto-brief-ops-panel"]');

  const focusCopy = resolveComponentStateAdapter('admin.coach-auto-brief-ops-panel', {
    componentId,
    states: { data: 'pass', interactions: 'focus-visible', system: 'idle' },
    variants: { copy: 'idle', theme: 'dark', window: 'today' },
    interactionTargetId: 'copy-command',
  });
  const focusCopyHealth = focusCopy.props.health as AdminCoachAutoBriefOpsHealth;
  assert.equal(focusCopyHealth.gate.verdict, 'PASS');

  assert.throws(
    () => resolveComponentStateAdapter('admin.coach-auto-brief-ops-panel', {
      componentId,
      states: { data: 'empty', interactions: 'focus-visible', system: 'idle' },
      variants: { copy: 'idle', theme: 'dark', window: 'today' },
      interactionTargetId: 'copy-command',
    }),
    /지원하지 않는 Coach auto brief ops state/,
  );
});

test('admin AI release decision adapter maps exhaustive content branches, lifecycle feedback, and canonical controls', () => {
  const componentId = 'src/components/admin/AdminAiReleaseDecisionRuntime.tsx#AdminAiReleaseDecisionRuntime';
  const maximum = resolveComponentStateAdapter('admin.ai-release-decision-runtime', {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'default',
      system: 'artifact-json-loading',
    },
    variants: {
      artifacts: 'maximum',
      copy: 'error',
      evaluation: 'fail',
      loaded: 'present',
      theme: 'dark',
    },
  });
  const maximumState = maximum.props.visualQaStateOverride as AdminAiReleaseDecisionVisualQaState;
  assert.equal(maximum.captureSelector, '[data-testid="admin-ai-release-decision-runtime"]');
  assert.equal(maximum.theme, 'dark');
  assert.equal(maximumState.releaseArtifacts.length, 50);
  assert.equal(maximumState.releaseDraftResult?.result.draft.blockers.length, 50);
  assert.equal(maximumState.releaseDraftResult?.result.draft.evidence.length, 50);
  assert.equal(maximumState.releaseEvaluationResult?.evaluation.status, 'FAIL');
  assert.equal(maximumState.releaseCopyState, 'error');
  assert.deepEqual(maximumState.releaseArtifactAction, {
    artifactId: 'MOCK-ARTIFACT-1',
    mode: 'json',
  });

  const focusCopy = resolveComponentStateAdapter('admin.ai-release-decision-runtime', {
    componentId,
    states: { data: 'go', interactions: 'focus-visible', system: 'idle' },
    variants: {
      artifacts: 'single',
      copy: 'idle',
      evaluation: 'pass',
      loaded: 'present',
      theme: 'dark',
    },
    interactionTargetId: 'copy-markdown',
  });
  const focusState = focusCopy.props.visualQaStateOverride as AdminAiReleaseDecisionVisualQaState;
  assert.equal(focusState.releaseDraftResult?.result.draft.decision, 'GO');

  const keyboardScenario = resolveComponentStateAdapter('admin.ai-release-decision-runtime', {
    componentId,
    states: { data: 'go', interactions: 'keyboard-navigation', system: 'idle' },
    variants: {
      artifacts: 'single',
      copy: 'idle',
      evaluation: 'pass',
      loaded: 'present',
      theme: 'dark',
    },
    interactionTargetId: 'scenario',
  });
  const keyboardState = keyboardScenario.props.visualQaStateOverride as AdminAiReleaseDecisionVisualQaState;
  assert.equal(keyboardState.releaseSelectedScenario, 'visual-qa-release');

  const empty = resolveComponentStateAdapter('admin.ai-release-decision-runtime', {
    componentId,
    states: { data: 'empty', interactions: 'default', system: 'save-error' },
    variants: {
      artifacts: 'empty',
      copy: 'idle',
      evaluation: 'absent',
      loaded: 'absent',
      theme: 'dark',
    },
  });
  const emptyState = empty.props.visualQaStateOverride as AdminAiReleaseDecisionVisualQaState;
  assert.equal(emptyState.releaseDraftResult, null);
  assert.match(emptyState.releaseSaveError ?? '', /저장할 초안/);

  const longKorean = resolveComponentStateAdapter('admin.ai-release-decision-runtime', {
    componentId,
    states: { data: 'long-korean', interactions: 'default', system: 'idle' },
    variants: {
      artifacts: 'maximum',
      copy: 'idle',
      evaluation: 'fail',
      loaded: 'present',
      theme: 'dark',
    },
  });
  const longKoreanState = longKorean.props.visualQaStateOverride as AdminAiReleaseDecisionVisualQaState;
  assert.ok(longKoreanState.releaseTaskPrompt.length >= 80);
  assert.ok(longKoreanState.releaseTaskPrompt.length <= 120);

  assert.throws(
    () => resolveComponentStateAdapter('admin.ai-release-decision-runtime', {
      componentId,
      states: { data: 'empty', interactions: 'focus-visible', system: 'idle' },
      variants: {
        artifacts: 'empty',
        copy: 'idle',
        evaluation: 'absent',
        loaded: 'absent',
        theme: 'dark',
      },
      interactionTargetId: 'copy-markdown',
    }),
    /지원하지 않는 Release decision state/,
  );
});

test('admin AI operations adapter isolates both lazy boundaries and rejects invisible pressure states', () => {
  const componentId = 'src/components/admin/AdminAiOperationsPanel.tsx#AdminAiOperationsPanel';
  const bothFallback = resolveComponentStateAdapter('admin.ai-operations-panel', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: {
      'auto-brief-phase': 'fallback',
      'release-phase': 'fallback',
      theme: 'dark',
    },
  });
  assert.deepEqual(bothFallback.props.visualQaStateOverride, {
    autoBriefPhase: 'fallback',
    releaseDecisionPhase: 'fallback',
    copy: '관리자 AI 운영 패널',
  });
  assert.equal(bothFallback.captureSelector, '[data-testid="admin-ai-operations-panel"]');
  assert.match(String(bothFallback.surfaceClassName), /w-\[320px\]/);
  assert.equal(bothFallback.theme, 'dark');

  const resolvedPressure = resolveComponentStateAdapter('admin.ai-operations-panel', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: {
      'auto-brief-phase': 'resolved',
      'release-phase': 'resolved',
      theme: 'dark',
    },
  });
  const resolvedState = resolvedPressure.props.visualQaStateOverride as {
    autoBriefPhase: string;
    releaseDecisionPhase: string;
    copy: string;
  };
  assert.equal(resolvedState.autoBriefPhase, 'resolved');
  assert.equal(resolvedState.releaseDecisionPhase, 'resolved');
  assert.match(resolvedState.copy, /^ADMIN-AI-OPERATIONS-/);

  assert.throws(() => resolveComponentStateAdapter('admin.ai-operations-panel', {
    componentId,
    states: { data: 'long-korean', interactions: 'default' },
    variants: {
      'auto-brief-phase': 'fallback',
      'release-phase': 'fallback',
      theme: 'dark',
    },
  }), /지원하지 않는 Admin AI operations state/);
});

test('admin AI operations runtime adapter reuses owned Auto Brief states behind one outer lazy boundary', () => {
  const componentId = 'src/components/admin/AdminAiOperationsRuntime.tsx#AdminAiOperationsRuntime';
  const fallback = resolveComponentStateAdapter('admin.ai-operations-runtime', {
    componentId,
    states: { data: 'empty', interactions: 'default', system: 'idle' },
    variants: {
      copy: 'idle',
      'panel-phase': 'fallback',
      theme: 'dark',
      window: 'today',
    },
  });
  assert.deepEqual(fallback.props.visualQaStateOverride, {
    panelPhase: 'fallback',
    health: null,
    loading: false,
    error: null,
    selectedWindow: 'today',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    commandCopyState: 'idle',
  });
  assert.equal(typeof fallback.props.visualQaPanelRenderer, 'function');
  assert.equal(fallback.captureSelector, '[data-testid="admin-ai-operations-runtime"]');
  assert.match(String(fallback.surfaceClassName), /w-\[320px\]/);
  assert.equal(fallback.theme, 'dark');

  const resolved = resolveComponentStateAdapter('admin.ai-operations-runtime', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default', system: 'idle' },
    variants: {
      copy: 'idle',
      'panel-phase': 'resolved',
      theme: 'dark',
      window: 'custom',
    },
  });
  const resolvedState = resolved.props.visualQaStateOverride as {
    panelPhase: string;
    health: AdminCoachAutoBriefOpsHealth | null;
    selectedWindow: string;
  };
  assert.equal(resolvedState.panelPhase, 'resolved');
  assert.equal(resolvedState.selectedWindow, 'custom');
  assert.equal(resolvedState.health?.summary.loaded_target_count, Number.MAX_SAFE_INTEGER);

  assert.throws(() => resolveComponentStateAdapter('admin.ai-operations-runtime', {
    componentId,
    states: { data: 'pass', interactions: 'default', system: 'idle' },
    variants: {
      copy: 'idle',
      'panel-phase': 'fallback',
      theme: 'dark',
      window: 'today',
    },
  }), /지원하지 않는 Admin AI operations runtime state/);
});

test('admin community runtime adapter isolates tab and dialog lazy phases while preserving owned data and permissions', () => {
  const componentId = 'src/components/admin/AdminCommunityRuntime.tsx#AdminCommunityRuntime';
  const fallback = resolveComponentStateAdapter('admin.community-runtime', {
    componentId,
    states: { data: 'empty', interactions: 'default', permissions: 'admin' },
    variants: {
      'active-tab': 'users',
      'panel-phase': 'fallback',
      'role-dialog-phase': 'closed',
      theme: 'dark',
    },
  });
  assert.deepEqual(fallback.props.visualQaStateOverride, {
    panelPhase: 'fallback',
    roleDialogPhase: 'closed',
    searchTerm: '',
    users: [],
    posts: [],
    mates: [],
    loading: false,
    currentUserId: 7,
    userRole: 'ROLE_ADMIN',
    pendingRoleChange: null,
    roleChangeReason: '',
  });
  assert.equal(fallback.props.activeTab, 'users');
  assert.equal(typeof (fallback.props.visualQaRenderers as { users?: unknown }).users, 'function');
  assert.equal(fallback.captureSelector, '[data-testid="admin-community-runtime"]');
  assert.match(String(fallback.surfaceClassName), /w-\[320px\]/);
  assert.equal(fallback.theme, 'dark');

  const maximum = resolveComponentStateAdapter('admin.community-runtime', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default', permissions: 'super-admin' },
    variants: {
      'active-tab': 'users',
      'panel-phase': 'resolved',
      'role-dialog-phase': 'closed',
      theme: 'dark',
    },
  });
  const maximumState = maximum.props.visualQaStateOverride as {
    currentUserId: number | null;
    loading: boolean;
    userRole: string | null;
    users: Array<{ id: number }>;
  };
  assert.equal(maximumState.users.length, 50);
  assert.equal(maximumState.users[0]?.id, 1);
  assert.equal(maximumState.users[49]?.id, 50);
  assert.equal(maximumState.loading, false);
  assert.equal(maximumState.currentUserId, 7);
  assert.equal(maximumState.userRole, 'ROLE_SUPER_ADMIN');

  const longPosts = resolveComponentStateAdapter('admin.community-runtime', {
    componentId,
    states: { data: 'long-korean', interactions: 'default', permissions: 'admin' },
    variants: {
      'active-tab': 'posts',
      'panel-phase': 'resolved',
      'role-dialog-phase': 'closed',
      theme: 'dark',
    },
  });
  assert.match(
    String(((longPosts.props.visualQaStateOverride as {
      posts: Array<{ content?: string }>;
    }).posts[0]?.content)),
    /^가장 좁은 관리자 모바일 화면/,
  );

  const openDialog = resolveComponentStateAdapter('admin.community-runtime', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default', permissions: 'super-admin' },
    variants: {
      'active-tab': 'users',
      'panel-phase': 'resolved',
      'role-dialog-phase': 'resolved',
      theme: 'dark',
    },
  });
  const openDialogState = openDialog.props.visualQaStateOverride as {
    pendingRoleChange: { userEmail: string } | null;
    roleChangeReason: string;
  };
  assert.match(openDialogState.pendingRoleChange?.userEmail ?? '', /^visualqa-/);
  assert.match(openDialogState.roleChangeReason, /^ROLE-CHANGE-/);

  assert.throws(() => resolveComponentStateAdapter('admin.community-runtime', {
    componentId,
    states: { data: 'single', interactions: 'default', permissions: 'admin' },
    variants: {
      'active-tab': 'users',
      'panel-phase': 'fallback',
      'role-dialog-phase': 'closed',
      theme: 'dark',
    },
  }), /지원하지 않는 Admin community runtime fallback/);
  assert.throws(() => resolveComponentStateAdapter('admin.community-runtime', {
    componentId,
    states: { data: 'single', interactions: 'default', permissions: 'super-admin' },
    variants: {
      'active-tab': 'posts',
      'panel-phase': 'resolved',
      'role-dialog-phase': 'closed',
      theme: 'dark',
    },
  }), /지원하지 않는 Admin community runtime permission/);
  assert.throws(() => resolveComponentStateAdapter('admin.community-runtime', {
    componentId,
    states: { data: 'single', interactions: 'default', permissions: 'admin' },
    variants: {
      'active-tab': 'users',
      'panel-phase': 'resolved',
      'role-dialog-phase': 'resolved',
      theme: 'dark',
    },
  }), /지원하지 않는 Admin community runtime role dialog/);
  assert.throws(() => resolveComponentStateAdapter('admin.community-runtime', {
    componentId,
    states: { data: 'loading', interactions: 'default', permissions: 'admin' },
    variants: {
      'active-tab': 'parties',
      'panel-phase': 'resolved',
      'role-dialog-phase': 'closed',
      theme: 'dark',
    },
  }), /지원하지 않는 Admin community runtime loading/);
});

test('admin community leaf panel adapters cover exact static inventories and fail closed', () => {
  const matesDataStates = [
    'empty',
    'single',
    'populated',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ] as const;
  const nullableDataStates = [
    'empty',
    'single',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ] as const;
  const matesComponentId = 'src/components/admin/MatesAdminPanel.tsx#MatesAdminPanel';
  const postsComponentId = 'src/components/admin/PostsAdminPanel.tsx#PostsAdminPanel';
  const usersComponentId = 'src/components/admin/UsersAdminPanel.tsx#UsersAdminPanel';

  assert.ok(KNOWN_COMPONENT_STATE_ADAPTER_IDS.includes('admin.mates-panel'));
  assert.ok(KNOWN_COMPONENT_STATE_ADAPTER_IDS.includes('admin.posts-panel'));
  assert.ok(KNOWN_COMPONENT_STATE_ADAPTER_IDS.includes('admin.users-panel'));

  for (const data of matesDataStates) {
    const mates = resolveComponentStateAdapter('admin.mates-panel', {
      componentId: matesComponentId,
      states: { data, interactions: 'default' },
      variants: { theme: 'dark' },
    });
    assert.equal(mates.theme, 'dark');
    assert.match(String(mates.surfaceClassName), /w-\[320px\]/);
    assert.equal(String(mates.captureSelector).startsWith('[data-testid='), true);
  }

  for (const data of nullableDataStates) {
    const posts = resolveComponentStateAdapter('admin.posts-panel', {
      componentId: postsComponentId,
      states: { data, interactions: 'default' },
      variants: { theme: 'dark' },
    });
    assert.equal(posts.theme, 'dark');
    assert.match(String(posts.surfaceClassName), /w-\[320px\]/);
    assert.equal(String(posts.captureSelector).startsWith('[data-testid='), true);
  }

  const populatedMates = resolveComponentStateAdapter('admin.mates-panel', {
    componentId: matesComponentId,
    states: { data: 'populated', interactions: 'default' },
    variants: { theme: 'dark' },
  }).props.mates as Array<{ status: string }>;
  assert.equal(populatedMates.length, 6);
  assert.deepEqual(
    new Set(populatedMates.map(({ status }) => status)),
    new Set(['pending', 'matched', 'selling', 'sold', 'completed', 'unknown-status']),
  );

  const maximumMates = resolveComponentStateAdapter('admin.mates-panel', {
    componentId: matesComponentId,
    states: { data: 'maximum-supported', interactions: 'hover' },
    variants: { theme: 'dark' },
    interactionTargetId: 'delete',
  });
  const maximumPosts = resolveComponentStateAdapter('admin.posts-panel', {
    componentId: postsComponentId,
    states: { data: 'maximum-supported', interactions: 'open' },
    variants: { theme: 'dark' },
    interactionTargetId: 'delete',
  });
  assert.equal((maximumMates.props.mates as unknown[]).length, 50);
  assert.equal((maximumPosts.props.posts as unknown[]).length, 50);
  assert.equal(maximumMates.captureSelector, 'body');
  assert.equal(maximumPosts.captureSelector, 'body');
  assert.equal(typeof maximumMates.props.handleDeleteMate, 'function');
  assert.equal(typeof maximumPosts.props.handleDeletePost, 'function');

  const nullPost = (resolveComponentStateAdapter('admin.posts-panel', {
    componentId: postsComponentId,
    states: { data: 'null-optional', interactions: 'default' },
    variants: { theme: 'dark' },
  }).props.posts as Array<{ content?: string; isHot?: boolean }>)[0];
  assert.equal(nullPost?.content, undefined);
  assert.equal(nullPost?.isHot, undefined);

  for (const permissions of ['admin', 'super-admin'] as const) {
    for (const data of nullableDataStates) {
      const users = resolveComponentStateAdapter('admin.users-panel', {
        componentId: usersComponentId,
        states: { data, interactions: 'default', permissions, system: 'idle' },
        variants: { theme: 'dark' },
      });
      assert.equal(users.props.isSuperAdmin, permissions === 'super-admin');
      assert.equal(users.props.loading, false);
      assert.equal(users.theme, 'dark');
    }
  }

  const loadingUsers = resolveComponentStateAdapter('admin.users-panel', {
    componentId: usersComponentId,
    states: { data: 'empty', interactions: 'default', permissions: 'admin', system: 'loading' },
    variants: { theme: 'dark' },
  });
  assert.equal(loadingUsers.props.loading, true);
  assert.deepEqual(loadingUsers.props.users, []);

  const maximumUsers = resolveComponentStateAdapter('admin.users-panel', {
    componentId: usersComponentId,
    states: {
      data: 'maximum-supported',
      interactions: 'change',
      permissions: 'super-admin',
      system: 'idle',
    },
    variants: { theme: 'dark' },
    interactionTargetId: 'role-select',
  });
  const users = maximumUsers.props.users as Array<{
    favoriteTeam?: string | null;
    id: number;
    role: string;
  }>;
  assert.equal(users.length, 50);
  assert.ok(users.some(({ favoriteTeam }) => favoriteTeam == null));
  assert.ok(users.some(({ role }) => role === 'ROLE_USER'));
  assert.ok(users.some(({ role }) => role === 'ROLE_ADMIN'));
  assert.ok(users.some(({ role }) => role === 'ROLE_SUPER_ADMIN'));
  assert.equal(maximumUsers.props.currentUserId, 4);
  assert.equal(maximumUsers.captureSelector, 'body');
  assert.equal(typeof maximumUsers.props.setPendingRoleChange, 'function');
  assert.equal(typeof maximumUsers.props.setRoleChangeReason, 'function');

  assert.throws(() => resolveComponentStateAdapter('admin.mates-panel', {
    componentId: matesComponentId,
    states: { data: 'single', interactions: 'hover' },
    variants: { theme: 'dark' },
    interactionTargetId: 'delete',
  }), /지원하지 않는 Admin mates panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.posts-panel', {
    componentId: postsComponentId,
    states: { data: 'maximum-supported', interactions: 'hover', permissions: 'admin' },
    variants: { theme: 'dark' },
    interactionTargetId: 'delete',
  }), /지원하지 않는 Admin posts panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.users-panel', {
    componentId: usersComponentId,
    states: {
      data: 'empty',
      interactions: 'default',
      permissions: 'super-admin',
      system: 'loading',
    },
    variants: { theme: 'dark' },
  }), /지원하지 않는 Admin users panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.users-panel', {
    componentId: usersComponentId,
    states: {
      data: 'maximum-supported',
      interactions: 'hover',
      permissions: 'super-admin',
      system: 'idle',
    },
    variants: { extra: 'unsupported', theme: 'dark' },
    interactionTargetId: 'delete',
  }), /지원하지 않는 Admin users panel state/);
});

test('admin delete-place dialog adapter covers the rendered admin surface and every action target', () => {
  const componentId = 'src/components/admin/AdminDeletePlaceDialogContent.tsx#AdminDeletePlaceDialogContent';
  const base = resolveComponentStateAdapter('admin.delete-place-dialog', {
    componentId,
    states: { interactions: 'default', permissions: 'admin' },
    variants: { theme: 'light', visibility: 'open' },
  });

  assert.equal(base.props.open, true);
  assert.equal(typeof base.props.onOpenChange, 'function');
  assert.equal(typeof base.props.onConfirm, 'function');
  assert.equal(base.captureSelector, '[data-testid="admin-delete-place-dialog"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'light');

  const dark = resolveComponentStateAdapter('admin.delete-place-dialog', {
    componentId,
    states: { interactions: 'default', permissions: 'admin' },
    variants: { theme: 'dark', visibility: 'open' },
  });
  assert.equal(dark.theme, 'dark');

  for (const interaction of ['hover', 'focus-visible', 'pressed']) {
    for (const interactionTargetId of ['close', 'cancel', 'confirm']) {
      const result = resolveComponentStateAdapter('admin.delete-place-dialog', {
        componentId,
        states: { interactions: interaction, permissions: 'admin' },
        variants: { theme: 'light', visibility: 'open' },
        interactionTargetId,
      });
      assert.equal(result.props.open, true);
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.delete-place-dialog', {
    componentId,
    states: { interactions: 'hover', permissions: 'admin' },
    variants: { theme: 'light', visibility: 'open' },
    interactionTargetId: 'unknown',
  }), /지원하지 않는 Admin delete-place dialog state/);
  assert.throws(() => resolveComponentStateAdapter('admin.delete-place-dialog', {
    componentId,
    states: { data: 'single', interactions: 'default', permissions: 'admin' },
    variants: { theme: 'light', visibility: 'open' },
  }), /지원하지 않는 Admin delete-place dialog state/);
  assert.throws(() => resolveComponentStateAdapter('admin.delete-place-dialog', {
    componentId,
    states: { interactions: 'default', permissions: 'user' },
    variants: { theme: 'light', visibility: 'open' },
  }), /지원하지 않는 Visual QA state/);
});

test('admin place dialog adapter covers form data, lifecycle, mode, pressure, and every owned control', () => {
  const componentId = 'src/components/admin/AdminPlaceDialogContent.tsx#AdminPlaceDialogContent';
  const dataStates = [
    'empty',
    'boundary-maximum',
    'boundary-minimum',
    'long-korean',
    'maximum-supported',
    'null-optional',
    'populated',
    'unbroken-token',
  ];
  const systemStates = ['error-503', 'idle', 'loading'];
  const base = resolveComponentStateAdapter('admin.place-dialog', {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { mode: 'create', theme: 'dark', visibility: 'open' },
  });

  assert.equal(base.props.open, true);
  assert.equal(base.props.mode, 'create');
  assert.equal(base.props.placeSubmitting, false);
  assert.equal(base.props.stadiumError, null);
  assert.equal(typeof base.props.setPlaceForm, 'function');
  assert.equal(base.captureSelector, '[data-testid="admin-place-dialog"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');

  for (const data of dataStates) {
    for (const system of systemStates) {
      for (const mode of ['create', 'edit']) {
        if (data === 'empty' && system === 'loading') {
          continue;
        }
        const result = resolveComponentStateAdapter('admin.place-dialog', {
          componentId,
          states: { data, interactions: 'default', permissions: 'admin', system },
          variants: { mode, theme: 'dark', visibility: 'open' },
        });
        assert.equal(result.props.mode, mode);
        assert.equal(result.props.placeSubmitting, system === 'loading');
        assert.equal(Boolean(result.props.stadiumError), system === 'error-503');
      }
    }
  }

  const interactionTargets = {
    hover: ['address', 'cancel', 'category', 'close', 'close-time', 'description', 'lat', 'lng', 'name', 'open-time', 'phone', 'rating', 'submit'],
    'focus-visible': ['address', 'cancel', 'category', 'close', 'close-time', 'description', 'lat', 'lng', 'name', 'open-time', 'phone', 'rating', 'submit'],
    pressed: ['cancel', 'close', 'submit'],
    input: ['address', 'close-time', 'description', 'lat', 'lng', 'name', 'open-time', 'phone', 'rating'],
    'keyboard-navigation': ['category'],
  };

  for (const [interactions, targets] of Object.entries(interactionTargets)) {
    for (const interactionTargetId of targets) {
      const result = resolveComponentStateAdapter('admin.place-dialog', {
        componentId,
        states: {
          data: 'maximum-supported',
          interactions,
          permissions: 'admin',
          system: 'idle',
        },
        variants: { mode: 'create', theme: 'dark', visibility: 'open' },
        interactionTargetId,
      });
      assert.equal(result.props.open, true);
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.place-dialog', {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { mode: 'create', theme: 'dark', visibility: 'open' },
    interactionTargetId: 'unknown',
  }), /지원하지 않는 Admin place dialog state/);
  assert.throws(() => resolveComponentStateAdapter('admin.place-dialog', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { mode: 'create', theme: 'dark', visibility: 'open' },
    interactionTargetId: 'submit',
  }), /지원하지 않는 Admin place dialog state/);
  assert.throws(() => resolveComponentStateAdapter('admin.place-dialog', {
    componentId,
    states: {
      data: 'empty',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { mode: 'edit', theme: 'dark', visibility: 'open' },
  }), /지원하지 않는 Admin place dialog state/);
});

test('admin report detail drawer adapter covers data pressure, lifecycle, and every owned control', () => {
  const componentId = 'src/components/admin/AdminReportDetailDrawer.tsx#AdminReportDetailDrawer';
  const dataStates = [
    'empty',
    'populated',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const base = resolveComponentStateAdapter('admin.report-detail-drawer', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { theme: 'dark', visibility: 'open' },
  });

  assert.equal(base.props.selectedReportId, 42);
  assert.equal((base.props.selectedReportDetail as { id: number }).id, 42);
  assert.equal(base.props.reportDetailLoading, false);
  assert.equal(typeof base.props.handleReportAction, 'function');
  assert.equal(base.captureSelector, '[data-testid="admin-report-detail-drawer"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');

  for (const data of dataStates) {
    const result = resolveComponentStateAdapter('admin.report-detail-drawer', {
      componentId,
      states: { data, interactions: 'default', permissions: 'admin', system: 'idle' },
      variants: { theme: 'dark', visibility: 'open' },
    });
    assert.equal(result.props.selectedReportDetail === null, data === 'empty');
    assert.equal(result.props.reportDetailLoading, false);
  }

  const loading = resolveComponentStateAdapter('admin.report-detail-drawer', {
    componentId,
    states: {
      data: 'empty',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { theme: 'dark', visibility: 'open' },
  });
  assert.equal(loading.props.selectedReportDetail, null);
  assert.equal(loading.props.reportDetailLoading, true);

  const interactionTargets = {
    hover: ['close', 'memo', 'take-down', 'dismiss', 'restore', 'require-modification', 'warning'],
    'focus-visible': ['close', 'memo', 'take-down', 'dismiss', 'restore', 'require-modification', 'warning'],
    pressed: ['close', 'take-down', 'dismiss', 'restore', 'require-modification', 'warning'],
    input: ['memo'],
  };

  for (const [interactions, targets] of Object.entries(interactionTargets)) {
    for (const interactionTargetId of targets) {
      const result = resolveComponentStateAdapter('admin.report-detail-drawer', {
        componentId,
        states: {
          data: 'maximum-supported',
          interactions,
          permissions: 'admin',
          system: 'idle',
        },
        variants: { theme: 'dark', visibility: 'open' },
        interactionTargetId,
      });
      assert.equal(result.props.selectedReportId, 2_147_483_647);
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.report-detail-drawer', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { theme: 'dark', visibility: 'open' },
    interactionTargetId: 'close',
  }), /지원하지 않는 Admin report detail drawer state/);
  assert.throws(() => resolveComponentStateAdapter('admin.report-detail-drawer', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { theme: 'dark', visibility: 'open' },
  }), /지원하지 않는 Admin report detail drawer state/);
});

test('admin reports panel adapter covers filters, list pressure, lifecycle, and every owned control', () => {
  const componentId = 'src/components/admin/AdminReportsPanel.tsx#AdminReportsPanel';
  const dataStates = [
    'empty',
    'populated',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const base = resolveComponentStateAdapter('admin.reports-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { filters: 'default', theme: 'dark' },
  });

  assert.equal((base.props.reports as unknown[]).length, 1);
  assert.deepEqual(base.props.reportFilters, {
    status: 'all',
    reason: 'all',
    fromDate: '',
    toDate: '',
  });
  assert.equal(base.props.reportsLoading, false);
  assert.equal(typeof base.props.handleReportAction, 'function');
  assert.equal(base.captureSelector, '[data-testid="admin-reports-panel"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');

  for (const data of dataStates) {
    for (const filters of ['default', 'active']) {
      const result = resolveComponentStateAdapter('admin.reports-panel', {
        componentId,
        states: { data, interactions: 'default', permissions: 'admin', system: 'idle' },
        variants: { filters, theme: 'dark' },
      });
      const reports = result.props.reports as unknown[];
      assert.equal(reports.length, data === 'empty' ? 0 : data === 'maximum-supported' ? 50 : 1);
      assert.equal(
        (result.props.reportFilters as { status: string }).status,
        filters === 'active' ? 'IN_REVIEW' : 'all',
      );
    }
  }

  for (const filters of ['default', 'active']) {
    const loading = resolveComponentStateAdapter('admin.reports-panel', {
      componentId,
      states: {
        data: 'empty',
        interactions: 'default',
        permissions: 'admin',
        system: 'loading',
      },
      variants: { filters, theme: 'dark' },
    });
    assert.equal(loading.props.reportsLoading, true);
    assert.deepEqual(loading.props.reports, []);
  }

  const interactionTargets = {
    hover: ['reset', 'row', 'detail', 'take-down', 'dismiss'],
    'focus-visible': ['status', 'reason', 'from-date', 'to-date', 'reset', 'detail', 'take-down', 'dismiss'],
    pressed: ['reset', 'detail', 'take-down', 'dismiss'],
    input: ['from-date', 'to-date'],
    'keyboard-navigation': ['status', 'reason'],
  };

  for (const [interactions, targets] of Object.entries(interactionTargets)) {
    for (const interactionTargetId of targets) {
      const result = resolveComponentStateAdapter('admin.reports-panel', {
        componentId,
        states: {
          data: 'maximum-supported',
          interactions,
          permissions: 'admin',
          system: 'idle',
        },
        variants: { filters: 'active', theme: 'dark' },
        interactionTargetId,
      });
      assert.equal((result.props.reports as unknown[]).length, 50);
      assert.equal(
        (result.props.visualQaStateOverride as { interactive: boolean }).interactive,
        true,
      );
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.reports-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { filters: 'active', theme: 'dark' },
    interactionTargetId: 'row',
  }), /지원하지 않는 Admin reports panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.reports-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { filters: 'default', theme: 'dark' },
  }), /지원하지 않는 Admin reports panel state/);
});

test('admin role-change dialog adapter covers identity pressure, both directions, themes, and controls', () => {
  const componentId = 'src/components/admin/AdminRoleChangeDialogContent.tsx#AdminRoleChangeDialogContent';
  const dataStates = [
    'empty',
    'populated',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const base = resolveComponentStateAdapter('admin.role-change-dialog', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'super-admin',
    },
    variants: { direction: 'promote', theme: 'light', visibility: 'open' },
  });

  assert.equal(
    (base.props.pendingRoleChange as { targetRole: string }).targetRole,
    'ROLE_ADMIN',
  );
  assert.equal(base.props.open, true);
  assert.equal(base.captureSelector, '[data-testid="admin-role-change-dialog"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'light');

  for (const data of dataStates) {
    for (const direction of ['promote', 'demote']) {
      if (data === 'null-optional' && direction === 'demote') continue;
      for (const theme of ['light', 'dark']) {
        const result = resolveComponentStateAdapter('admin.role-change-dialog', {
          componentId,
          states: { data, interactions: 'default', permissions: 'super-admin' },
          variants: { direction, theme, visibility: 'open' },
        });
        const pending = result.props.pendingRoleChange as null | { targetRole: string };
        assert.equal(pending === null, data === 'null-optional');
        if (pending) {
          assert.equal(pending.targetRole, direction === 'promote' ? 'ROLE_ADMIN' : 'ROLE_USER');
        }
        assert.equal(result.theme, theme);
      }
    }
  }

  const interactionTargets = {
    hover: ['close', 'cancel', 'confirm'],
    'focus-visible': ['close', 'reason', 'cancel', 'confirm'],
    pressed: ['close', 'cancel', 'confirm'],
    input: ['reason'],
  };

  for (const [interactions, targets] of Object.entries(interactionTargets)) {
    for (const direction of ['promote', 'demote']) {
      for (const theme of ['light', 'dark']) {
        for (const interactionTargetId of targets) {
          const result = resolveComponentStateAdapter('admin.role-change-dialog', {
            componentId,
            states: {
              data: 'maximum-supported',
              interactions,
              permissions: 'super-admin',
            },
            variants: { direction, theme, visibility: 'open' },
            interactionTargetId,
          });
          assert.equal(
            (result.props.visualQaStateOverride as { interactive: boolean }).interactive,
            true,
          );
        }
      }
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.role-change-dialog', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'hover',
      permissions: 'super-admin',
    },
    variants: { direction: 'promote', theme: 'dark', visibility: 'open' },
    interactionTargetId: 'confirm',
  }), /지원하지 않는 Admin role-change dialog state/);
  assert.throws(() => resolveComponentStateAdapter('admin.role-change-dialog', {
    componentId,
    states: {
      data: 'null-optional',
      interactions: 'default',
      permissions: 'super-admin',
    },
    variants: { direction: 'demote', theme: 'dark', visibility: 'open' },
  }), /지원하지 않는 Admin role-change dialog state/);
});

test('admin seat-view detail drawer adapter covers detail pressure, lifecycle, and every control', () => {
  const componentId = 'src/components/admin/AdminSeatViewDetailDrawer.tsx#AdminSeatViewDetailDrawer';
  const dataStates = [
    'empty',
    'populated',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const base = resolveComponentStateAdapter('admin.seat-view-detail-drawer', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { theme: 'dark', visibility: 'open' },
  });

  assert.equal((base.props.selectedSeatViewDetail as { id: number }).id, 42);
  assert.equal(base.props.seatViewDetailLoading, false);
  assert.equal(base.captureSelector, '[data-testid="admin-seat-view-detail-drawer"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');

  for (const data of dataStates) {
    const result = resolveComponentStateAdapter('admin.seat-view-detail-drawer', {
      componentId,
      states: { data, interactions: 'default', permissions: 'admin', system: 'idle' },
      variants: { theme: 'dark', visibility: 'open' },
    });
    assert.equal(result.props.selectedSeatViewDetail === null, data === 'empty');
    assert.equal(result.props.seatViewDetailLoading, false);
  }

  const loading = resolveComponentStateAdapter('admin.seat-view-detail-drawer', {
    componentId,
    states: {
      data: 'empty',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { theme: 'dark', visibility: 'open' },
  });
  assert.equal(loading.props.seatViewDetailLoading, true);

  const interactionTargets = {
    hover: ['close', 'memo', 'approve', 'ticket', 'other', 'inappropriate'],
    'focus-visible': ['close', 'memo', 'approve', 'ticket', 'other', 'inappropriate'],
    pressed: ['close', 'approve', 'ticket', 'other', 'inappropriate'],
    input: ['memo'],
  };

  for (const [interactions, targets] of Object.entries(interactionTargets)) {
    for (const interactionTargetId of targets) {
      const result = resolveComponentStateAdapter('admin.seat-view-detail-drawer', {
        componentId,
        states: {
          data: 'maximum-supported',
          interactions,
          permissions: 'admin',
          system: 'idle',
        },
        variants: { theme: 'dark', visibility: 'open' },
        interactionTargetId,
      });
      assert.equal(result.props.selectedSeatViewId, 2_147_483_647);
      assert.equal(
        (result.props.visualQaStateOverride as { interactive: boolean }).interactive,
        true,
      );
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.seat-view-detail-drawer', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { theme: 'dark', visibility: 'open' },
    interactionTargetId: 'approve',
  }), /지원하지 않는 Admin seat-view detail drawer state/);
  assert.throws(() => resolveComponentStateAdapter('admin.seat-view-detail-drawer', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { theme: 'dark', visibility: 'open' },
  }), /지원하지 않는 Admin seat-view detail drawer state/);
});

test('admin seat-views panel adapter covers filters, list pressure, lifecycle, and every owned control', () => {
  const componentId = 'src/components/admin/AdminSeatViewsPanel.tsx#AdminSeatViewsPanel';
  const dataStates = [
    'empty',
    'populated',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const base = resolveComponentStateAdapter('admin.seat-views-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { filters: 'default', theme: 'dark' },
  });

  assert.equal((base.props.seatViews as unknown[]).length, 1);
  assert.deepEqual(base.props.seatViewFilters, {
    moderationStatus: 'all',
    stadium: '',
    aiSuggestedLabel: 'all',
    adminLabel: 'all',
    ticketVerified: 'all',
  });
  assert.equal(base.props.seatViewsLoading, false);
  assert.equal(typeof base.props.handleSeatViewAction, 'function');
  assert.equal(base.captureSelector, '[data-testid="admin-seat-views-panel"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');

  for (const data of dataStates) {
    for (const filters of ['default', 'active']) {
      const result = resolveComponentStateAdapter('admin.seat-views-panel', {
        componentId,
        states: { data, interactions: 'default', permissions: 'admin', system: 'idle' },
        variants: { filters, theme: 'dark' },
      });
      const seatViews = result.props.seatViews as unknown[];
      assert.equal(seatViews.length, data === 'empty' ? 0 : data === 'maximum-supported' ? 50 : 1);
      assert.equal(
        (result.props.seatViewFilters as { moderationStatus: string }).moderationStatus,
        filters === 'active' ? 'PENDING' : 'all',
      );
    }
  }

  for (const filters of ['default', 'active']) {
    const loading = resolveComponentStateAdapter('admin.seat-views-panel', {
      componentId,
      states: {
        data: 'empty',
        interactions: 'default',
        permissions: 'admin',
        system: 'loading',
      },
      variants: { filters, theme: 'dark' },
    });
    assert.equal(loading.props.seatViewsLoading, true);
    assert.deepEqual(loading.props.seatViews, []);
  }

  const interactionTargets = {
    hover: ['reset', 'row', 'detail', 'approve'],
    'focus-visible': ['status', 'stadium', 'ai-label', 'admin-label', 'ticket', 'reset', 'detail', 'approve'],
    pressed: ['reset', 'detail', 'approve'],
    input: ['stadium'],
    'keyboard-navigation': ['status', 'ai-label', 'admin-label', 'ticket'],
  };

  for (const [interactions, targets] of Object.entries(interactionTargets)) {
    for (const interactionTargetId of targets) {
      const result = resolveComponentStateAdapter('admin.seat-views-panel', {
        componentId,
        states: {
          data: 'maximum-supported',
          interactions,
          permissions: 'admin',
          system: 'idle',
        },
        variants: { filters: 'active', theme: 'dark' },
        interactionTargetId,
      });
      assert.equal((result.props.seatViews as unknown[]).length, 50);
      assert.equal(
        (result.props.visualQaStateOverride as { interactive: boolean }).interactive,
        true,
      );
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.seat-views-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { filters: 'active', theme: 'dark' },
    interactionTargetId: 'row',
  }), /지원하지 않는 Admin seat-views panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.seat-views-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { filters: 'default', theme: 'dark' },
  }), /지원하지 않는 Admin seat-views panel state/);
});

test('admin stadiums panel adapter covers selection, lifecycle, place pressure, and every owned control', () => {
  const componentId = 'src/components/admin/AdminStadiumsPanel.tsx#AdminStadiumsPanel';
  const dataStates = [
    'empty',
    'populated',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const base = resolveComponentStateAdapter('admin.stadiums-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { selection: 'selected', theme: 'dark' },
  });

  assert.equal((base.props.stadiums as unknown[]).length, 1);
  assert.equal((base.props.places as unknown[]).length, 1);
  assert.equal(base.props.selectedStadiumId, 'MOCK_STADIUM_1');
  assert.equal(base.props.stadiumsLoading, false);
  assert.equal(base.props.placesLoading, false);
  assert.equal(base.props.stadiumError, null);
  assert.equal(typeof base.props.openCreateDialog, 'function');
  assert.equal(base.captureSelector, '[data-testid="admin-stadiums-panel"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');

  for (const data of dataStates) {
    for (const system of ['idle', 'panel-error']) {
      const result = resolveComponentStateAdapter('admin.stadiums-panel', {
        componentId,
        states: { data, interactions: 'default', permissions: 'admin', system },
        variants: { selection: 'selected', theme: 'dark' },
      });
      const places = result.props.places as unknown[];
      assert.equal(places.length, data === 'empty' ? 0 : data === 'maximum-supported' ? 50 : 1);
      assert.equal(result.props.stadiumError === null, system === 'idle');
    }
  }

  for (const system of ['idle', 'panel-error']) {
    const unselected = resolveComponentStateAdapter('admin.stadiums-panel', {
      componentId,
      states: {
        data: 'empty',
        interactions: 'default',
        permissions: 'admin',
        system,
      },
      variants: { selection: 'none', theme: 'dark' },
    });
    assert.equal(unselected.props.selectedStadiumId, '');
    assert.deepEqual(unselected.props.places, []);
  }

  const stadiumsLoading = resolveComponentStateAdapter('admin.stadiums-panel', {
    componentId,
    states: {
      data: 'empty',
      interactions: 'default',
      permissions: 'admin',
      system: 'initial-loading',
    },
    variants: { selection: 'none', theme: 'dark' },
  });
  assert.equal(stadiumsLoading.props.stadiumsLoading, true);
  assert.equal(stadiumsLoading.props.placesLoading, false);

  const placesLoading = resolveComponentStateAdapter('admin.stadiums-panel', {
    componentId,
    states: {
      data: 'empty',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { selection: 'selected', theme: 'dark' },
  });
  assert.equal(placesLoading.props.stadiumsLoading, false);
  assert.equal(placesLoading.props.placesLoading, true);

  const interactionTargets = {
    hover: ['add', 'row', 'edit', 'delete'],
    'focus-visible': ['select', 'add', 'edit', 'delete'],
    pressed: ['add', 'edit', 'delete'],
    'keyboard-navigation': ['select'],
  };

  for (const [interactions, targets] of Object.entries(interactionTargets)) {
    for (const interactionTargetId of targets) {
      const result = resolveComponentStateAdapter('admin.stadiums-panel', {
        componentId,
        states: {
          data: 'maximum-supported',
          interactions,
          permissions: 'admin',
          system: 'idle',
        },
        variants: { selection: 'selected', theme: 'dark' },
        interactionTargetId,
      });
      assert.equal((result.props.stadiums as unknown[]).length, 50);
      assert.equal((result.props.places as unknown[]).length, 50);
      assert.equal(
        (result.props.visualQaStateOverride as { interactive: boolean }).interactive,
        true,
      );
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.stadiums-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { selection: 'none', theme: 'dark' },
  }), /지원하지 않는 Admin stadiums panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.stadiums-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'loading',
    },
    variants: { selection: 'selected', theme: 'dark' },
  }), /지원하지 않는 Admin stadiums panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.stadiums-panel', {
    componentId,
    states: {
      data: 'populated',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { selection: 'selected', theme: 'dark' },
    interactionTargetId: 'row',
  }), /지원하지 않는 Admin stadiums panel state/);
});

test('admin stadiums runtime adapter covers panel lifecycle and every lazy dialog phase', () => {
  const componentId = 'src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsRuntime';
  const baseContext = {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: {
      'dialog-phase': 'closed',
      'panel-phase': 'resolved',
      selection: 'selected',
      theme: 'dark',
    },
  };
  const base = resolveComponentStateAdapter('admin.stadiums-runtime', baseContext);
  const baseState = base.props.visualQaStateOverride as Record<string, unknown>;

  assert.equal(base.captureSelector, '[data-testid="admin-stadiums-runtime"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');
  assert.equal(baseState.panelPhase, 'resolved');
  assert.equal(baseState.dialogPhase, 'closed');
  assert.equal((baseState.stadiums as unknown[]).length, 1);
  assert.equal((baseState.places as unknown[]).length, 1);
  assert.equal(baseState.selectedStadiumId, 'MOCK_STADIUM_1');
  assert.equal(typeof (base.props.visualQaRenderers as Record<string, unknown>).panel, 'function');

  const panelFallback = resolveComponentStateAdapter('admin.stadiums-runtime', {
    componentId,
    states: {
      data: 'empty',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: {
      'dialog-phase': 'closed',
      'panel-phase': 'fallback',
      selection: 'none',
      theme: 'dark',
    },
  });
  const fallbackState = panelFallback.props.visualQaStateOverride as Record<string, unknown>;
  assert.equal(fallbackState.panelPhase, 'fallback');
  assert.deepEqual(fallbackState.stadiums, []);
  assert.deepEqual(fallbackState.places, []);

  for (const [dialogPhase, expected] of Object.entries({
    'create-fallback': { phase: 'fallback', mode: 'create' },
    'create-resolved': { phase: 'resolved', mode: 'create' },
    'edit-fallback': { phase: 'fallback', mode: 'edit' },
    'edit-resolved': { phase: 'resolved', mode: 'edit' },
    'delete-fallback': { phase: 'fallback', mode: 'delete' },
    'delete-resolved': { phase: 'resolved', mode: 'delete' },
  })) {
    const result = resolveComponentStateAdapter('admin.stadiums-runtime', {
      componentId,
      states: {
        data: 'maximum-supported',
        interactions: 'default',
        permissions: 'admin',
        system: 'idle',
      },
      variants: {
        'dialog-phase': dialogPhase,
        'panel-phase': 'resolved',
        selection: 'selected',
        theme: 'dark',
      },
    });
    const state = result.props.visualQaStateOverride as Record<string, unknown>;
    const placeDialog = state.placeDialog;
    const mode = placeDialog === 'create'
      ? 'create'
      : placeDialog && typeof placeDialog === 'object'
        ? 'edit'
        : state.deletingPlaceId != null
          ? 'delete'
          : 'closed';

    assert.equal(state.dialogPhase, expected.phase);
    assert.equal(mode, expected.mode);
    assert.equal(result.captureSelector, '[role="dialog"]');
    assert.equal((state.stadiums as unknown[]).length, 50);
    assert.equal((state.places as unknown[]).length, 50);
  }

  assert.throws(() => resolveComponentStateAdapter('admin.stadiums-runtime', {
    ...baseContext,
    variants: {
      ...baseContext.variants,
      'panel-phase': 'fallback',
    },
  }), /지원하지 않는 Admin stadiums runtime/);
  assert.throws(() => resolveComponentStateAdapter('admin.stadiums-runtime', {
    ...baseContext,
    variants: {
      ...baseContext.variants,
      'dialog-phase': 'create-resolved',
    },
  }), /지원하지 않는 Admin stadiums runtime/);
});

test('admin client-error detail adapter covers data pressure, badge variants, lifecycle, and controls', () => {
  const componentId = 'src/components/admin/ClientErrorAdminDetailRuntime.tsx#ClientErrorAdminDetailRuntime';
  const baseContext = {
    componentId,
    states: {
      data: 'empty',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: {
      bucket: 'api',
      source: 'api',
      theme: 'dark',
      visibility: 'open',
    },
  };
  const base = resolveComponentStateAdapter('admin.client-error-detail', baseContext);
  const baseDetail = base.props.selectedEvent as {
    event: { bucket: string; source: string };
    feedback: unknown[];
    sameFingerprintRecentEvents: unknown[];
  };

  assert.equal(base.captureSelector, '[data-testid="admin-client-error-detail"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');
  assert.equal(base.props.open, true);
  assert.equal(base.props.detailLoading, false);
  assert.equal(typeof base.props.onClose, 'function');
  assert.equal(typeof base.props.onOpenDetail, 'function');
  assert.equal(baseDetail.event.bucket, 'api');
  assert.equal(baseDetail.event.source, 'api');
  assert.deepEqual(baseDetail.feedback, []);
  assert.deepEqual(baseDetail.sameFingerprintRecentEvents, []);

  const dataStates = [
    'empty',
    'populated',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const buckets = ['api', 'runtime', 'feedback'];
  const sources = ['api', 'runtime', 'unhandled_rejection', 'unknown'];
  for (const data of dataStates) {
    for (const bucket of buckets) {
      for (const source of sources) {
        const result = resolveComponentStateAdapter('admin.client-error-detail', {
          ...baseContext,
          states: { ...baseContext.states, data },
          variants: { ...baseContext.variants, bucket, source },
        });
        const detail = result.props.selectedEvent as {
          event: { bucket: string; eventId: string; source: string };
        };
        assert.equal(detail.event.bucket, bucket);
        assert.equal(detail.event.source, source);
        assert.match(detail.event.eventId, /^MOCK_/);
      }
    }
  }

  const loading = resolveComponentStateAdapter('admin.client-error-detail', {
    ...baseContext,
    states: { ...baseContext.states, system: 'loading' },
  });
  assert.equal(loading.props.detailLoading, true);
  assert.equal(loading.props.selectedEvent, null);

  const missing = resolveComponentStateAdapter('admin.client-error-detail', {
    ...baseContext,
    states: { ...baseContext.states, system: 'missing' },
  });
  assert.equal(missing.props.detailLoading, false);
  assert.equal(missing.props.selectedEvent, null);

  const maximum = resolveComponentStateAdapter('admin.client-error-detail', {
    ...baseContext,
    states: { ...baseContext.states, data: 'maximum-supported' },
  });
  const maximumDetail = maximum.props.selectedEvent as {
    feedback: unknown[];
    sameFingerprintRecentEvents: unknown[];
  };
  assert.equal(maximumDetail.feedback.length, 50);
  assert.equal(maximumDetail.sameFingerprintRecentEvents.length, 50);

  for (const interactions of ['hover', 'focus-visible', 'pressed']) {
    for (const interactionTargetId of ['close', 'recent']) {
      const result = resolveComponentStateAdapter('admin.client-error-detail', {
        ...baseContext,
        states: { ...baseContext.states, data: 'maximum-supported', interactions },
        interactionTargetId,
      });
      assert.equal(result.props.detailLoading, false);
      assert.equal((result.props.selectedEvent as { feedback: unknown[] }).feedback.length, 50);
    }
  }

  assert.throws(() => resolveComponentStateAdapter('admin.client-error-detail', {
    ...baseContext,
    states: { ...baseContext.states, data: 'populated', system: 'loading' },
  }), /지원하지 않는 Admin client-error detail state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-detail', {
    ...baseContext,
    states: { ...baseContext.states, data: 'populated', interactions: 'hover' },
    interactionTargetId: 'close',
  }), /지원하지 않는 Admin client-error detail state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-detail', {
    ...baseContext,
    states: { ...baseContext.states, data: 'maximum-supported', interactions: 'hover' },
    interactionTargetId: 'unknown',
  }), /지원하지 않는 Admin client-error detail state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-detail', {
    ...baseContext,
    variants: { ...baseContext.variants, extra: 'unsupported' },
  }), /지원하지 않는 Admin client-error detail state/);
});

test('admin client-error trend chart adapter covers exactly nine direct states and fails closed', () => {
  const componentId = 'src/components/admin/ClientErrorTrendChart.tsx#ClientErrorTrendChart';
  const dataStates = [
    'empty',
    'single',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
    'zero',
  ] as const;
  const resolveIdle = (data: typeof dataStates[number]) => resolveComponentStateAdapter(
    'admin.client-error-trend-chart',
    {
      componentId,
      states: { data, system: 'idle' },
      variants: { theme: 'dark' },
    },
  );

  assert.ok(KNOWN_COMPONENT_STATE_ADAPTER_IDS.includes('admin.client-error-trend-chart'));
  for (const data of dataStates) {
    const result = resolveIdle(data);
    assert.equal(result.captureSelector, '[data-testid="admin-client-error-trend-chart"]');
    assert.equal(result.theme, 'dark');
    assert.match(String(result.surfaceClassName), /w-full/);
    assert.match(String(result.surfaceClassName), /min-w-0/);
    assert.doesNotMatch(String(result.surfaceClassName), /w-\[320px\]/);
    assert.equal(result.props.loading, false);
    assert.ok(Array.isArray(result.props.chartData));
  }

  const empty = resolveIdle('empty').props.chartData as unknown[];
  const single = resolveIdle('single').props.chartData as unknown[];
  const boundaryMaximum = resolveIdle('boundary-maximum').props.chartData as Array<{
    api: number;
  }>;
  const longKorean = resolveIdle('long-korean').props.chartData as Array<{ label: string }>;
  const unbroken = resolveIdle('unbroken-token').props.chartData as Array<{ label: string }>;
  const maximum = resolveIdle('maximum-supported').props.chartData as unknown[];
  const zero = resolveIdle('zero').props.chartData as Array<{
    api: number;
    feedback: number;
    runtime: number;
  }>;
  assert.equal(empty.length, 0);
  assert.equal(single.length, 1);
  assert.equal(boundaryMaximum[0]?.api, Number.MAX_SAFE_INTEGER);
  assert.match(longKorean[0]?.label ?? '', /가장 좁은 관리자 모바일 화면/);
  assert.match(unbroken[0]?.label ?? '', /^MOCK_CLIENT_ERROR_TREND_UNBROKEN_/);
  assert.equal(maximum.length, 20);
  assert.ok(zero.length > 0);
  assert.ok(zero.every((point) => (
    point.api === 0 && point.runtime === 0 && point.feedback === 0
  )));

  const loading = resolveComponentStateAdapter('admin.client-error-trend-chart', {
    componentId,
    states: { data: 'empty', system: 'loading' },
    variants: { theme: 'dark' },
  });
  assert.equal(loading.props.loading, true);
  assert.deepEqual(loading.props.chartData, []);

  const baseContext = {
    componentId,
    states: { data: 'single', system: 'idle' },
    variants: { theme: 'dark' },
  };
  for (const context of [
    { ...baseContext, states: { ...baseContext.states, data: 'unsupported' } },
    { ...baseContext, states: { ...baseContext.states, system: 'loading' } },
    { ...baseContext, states: { ...baseContext.states, permissions: 'admin' } },
    { ...baseContext, states: { ...baseContext.states, interactions: 'default' } },
    { ...baseContext, variants: { ...baseContext.variants, extra: 'unsupported' } },
    { ...baseContext, variants: {} },
    { ...baseContext, interactionTargetId: 'chart' },
  ]) {
    assert.throws(
      () => resolveComponentStateAdapter('admin.client-error-trend-chart', context),
      /지원하지 않는 Admin client-error trend chart state/,
    );
  }
});

test('admin client-error insights adapter covers exactly 98 owned inventory and badge states', () => {
  const componentId = 'src/components/admin/ClientErrorAdminInsightsRuntime.tsx#ClientErrorAdminInsightsRuntime';
  const baseContext = {
    componentId,
    states: {
      data: 'empty',
      permissions: 'admin',
    },
    variants: {
      bucket: 'api',
      channel: 'telegram',
      delivery: 'sent',
      inventory: 'none',
      theme: 'dark',
    },
  };
  const base = resolveComponentStateAdapter('admin.client-error-insights', baseContext);

  assert.equal(base.captureSelector, '[data-testid="admin-client-error-insights"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');
  assert.equal(base.props.dashboard, null);

  const dataStates = [
    'empty',
    'populated',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const inventories = ['none', 'feedback-only', 'alerts-only', 'both'];
  const buckets = ['api', 'runtime', 'feedback'];
  const channels = ['telegram', 'slack'];
  const deliveries = ['sent', 'failed'];
  let accepted = 0;

  for (const data of dataStates) {
    for (const inventory of inventories) {
      for (const bucket of buckets) {
        for (const channel of channels) {
          for (const delivery of deliveries) {
            const canonicalAlertVariants = bucket === 'api'
              && channel === 'telegram'
              && delivery === 'sent';
            const supported = data === 'empty'
              ? inventory === 'none' && canonicalAlertVariants
              : data === 'populated'
                ? (inventory === 'feedback-only' && canonicalAlertVariants)
                  || inventory === 'alerts-only'
                  || inventory === 'both'
                : inventory === 'both';
            const resolve = () => resolveComponentStateAdapter('admin.client-error-insights', {
              ...baseContext,
              states: { ...baseContext.states, data },
              variants: {
                ...baseContext.variants,
                bucket,
                channel,
                delivery,
                inventory,
              },
            });

            if (!supported) {
              assert.throws(resolve, /지원하지 않는 Admin client-error insights state/);
              continue;
            }

            const result = resolve();
            const dashboard = result.props.dashboard as {
              recentAlerts: Array<{
                bucket: string;
                channel: string;
                deliveryStatus: string;
              }>;
              recentFeedback: unknown[];
            } | null;
            accepted += 1;
            assert.ok(dashboard || data === 'empty');
            if (dashboard?.recentAlerts.length) {
              assert.ok(dashboard.recentAlerts.every((alert) => (
                alert.bucket === bucket
                  && alert.channel === channel
                  && alert.deliveryStatus === delivery.toUpperCase()
              )));
            }
          }
        }
      }
    }
  }
  assert.equal(accepted, 98);

  const feedbackOnly = resolveComponentStateAdapter('admin.client-error-insights', {
    ...baseContext,
    states: { ...baseContext.states, data: 'populated' },
    variants: { ...baseContext.variants, inventory: 'feedback-only' },
  }).props.dashboard as { recentAlerts: unknown[]; recentFeedback: unknown[] };
  assert.equal(feedbackOnly.recentFeedback.length, 1);
  assert.equal(feedbackOnly.recentAlerts.length, 0);

  const nullable = resolveComponentStateAdapter('admin.client-error-insights', {
    ...baseContext,
    states: { ...baseContext.states, data: 'null-optional' },
    variants: { ...baseContext.variants, inventory: 'both' },
  }).props.dashboard as {
    recentAlerts: Array<{
      failureReason: string | null;
      latestEventId: string | null;
      latestMessage: string | null;
      latestOccurredAt: string | null;
    }>;
  };
  assert.equal(nullable.recentAlerts[0]?.failureReason, null);
  assert.equal(nullable.recentAlerts[0]?.latestEventId, null);
  assert.equal(nullable.recentAlerts[0]?.latestMessage, null);
  assert.equal(nullable.recentAlerts[0]?.latestOccurredAt, null);

  const maximum = resolveComponentStateAdapter('admin.client-error-insights', {
    ...baseContext,
    states: { ...baseContext.states, data: 'maximum-supported' },
    variants: { ...baseContext.variants, inventory: 'both' },
  }).props.dashboard as { recentAlerts: unknown[]; recentFeedback: unknown[] };
  assert.equal(maximum.recentFeedback.length, 50);
  assert.equal(maximum.recentAlerts.length, 50);

  assert.throws(() => resolveComponentStateAdapter('admin.client-error-insights', {
    ...baseContext,
    states: { ...baseContext.states, interactions: 'default' },
  }), /지원하지 않는 Admin client-error insights state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-insights', {
    ...baseContext,
    variants: { ...baseContext.variants, extra: 'unsupported' },
  }), /지원하지 않는 Admin client-error insights state/);
});

test('admin client-error panel adapter covers exactly 52 presets and 30 legal interaction targets', () => {
  const componentId = 'src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorAdminPanel';
  const dataPresets = [
    'none-empty',
    'dashboard-only-empty', 'dashboard-only-populated',
    'dashboard-only-null-optional', 'dashboard-only-boundary-minimum',
    'dashboard-only-boundary-maximum', 'dashboard-only-long-korean',
    'dashboard-only-unbroken-token', 'dashboard-only-maximum-supported',
    'events-only-populated', 'events-only-null-optional',
    'events-only-boundary-minimum', 'events-only-boundary-maximum',
    'events-only-long-korean', 'events-only-unbroken-token',
    'events-only-maximum-supported',
    'both-populated', 'both-null-optional', 'both-boundary-minimum',
    'both-boundary-maximum', 'both-long-korean',
    'both-unbroken-token', 'both-maximum-supported',
  ] as const;
  const lifecyclePresets = [
    'inactive', 'dashboard-loading', 'events-loading', 'refresh-loading',
    'panel-error', 'detail-error',
  ] as const;
  const lazyPresets = [
    'chart-fallback', 'insights-deferred-fallback',
    'insights-suspense-fallback', 'detail-suspense-fallback',
    'detail-resolved-loading', 'detail-resolved-populated',
  ] as const;
  const valuePresets = [
    'window-1h', 'window-7d', 'page-middle', 'page-last',
    'filter-bucket-api', 'filter-bucket-runtime', 'filter-source-api',
    'filter-source-runtime', 'filter-source-unhandled-rejection',
    'filter-status-5xx', 'filter-status-4xx', 'filter-status-none',
    'filter-route', 'filter-fingerprint', 'filter-search',
    'filter-long-korean', 'filter-unbroken-token',
  ] as const;
  const defaultPresets = [
    ...dataPresets,
    ...lifecyclePresets,
    ...lazyPresets,
    ...valuePresets,
  ];

  assert.equal(dataPresets.length, 23);
  assert.equal(lifecyclePresets.length, 6);
  assert.equal(lazyPresets.length, 6);
  assert.equal(valuePresets.length, 17);
  assert.equal(defaultPresets.length, 52);
  assert.equal(new Set(defaultPresets).size, 52);
  assert.ok(KNOWN_COMPONENT_STATE_ADAPTER_IDS.includes('admin.client-error-panel'));

  const dataForPreset = (preset: string) => {
    if (preset === 'none-empty' || preset === 'inactive') return 'empty';
    if (preset === 'panel-error') return 'long-korean';
    if (lazyPresets.includes(preset as typeof lazyPresets[number])) return 'maximum-supported';
    if (preset.startsWith('dashboard-only-')) return preset.slice('dashboard-only-'.length);
    if (preset.startsWith('events-only-')) return preset.slice('events-only-'.length);
    if (preset.startsWith('both-')) return preset.slice('both-'.length);
    return 'populated';
  };
  const systemForPreset = (preset: string) => (
    lifecyclePresets.includes(preset as typeof lifecyclePresets[number])
      ? preset
      : 'idle'
  );
  const resolvePreset = (preset: string) => resolveComponentStateAdapter(
    'admin.client-error-panel',
    {
      componentId,
      states: {
        data: dataForPreset(preset),
        interactions: 'default',
        permissions: 'admin',
        system: systemForPreset(preset),
      },
      variants: { preset, theme: 'dark' },
    },
  );

  for (const preset of defaultPresets) {
    const result = resolvePreset(preset);
    const state = result.props.visualQaStateOverride as {
      active: boolean;
      chartPhase: string;
      currentPage: number;
      dashboard: { recentAlerts: unknown[]; recentFeedback: unknown[] } | null;
      detailLoading: boolean;
      detailOpen: boolean;
      detailPhase: string;
      eventsPage: { content: unknown[]; last: boolean; number: number; totalPages: number };
      filters: {
        bucket: string;
        fingerprint: string;
        route: string;
        search: string;
        source: string;
        statusGroup: string;
      };
      insightsPhase: string;
      loadingDashboard: boolean;
      loadingEvents: boolean;
      panelError: string | null;
      selectedEvent: unknown;
      windowKey: string;
    };
    const renderers = result.props.visualQaRenderers as Record<string, unknown>;
    const hasDashboard = preset.startsWith('dashboard-only-')
      || preset.startsWith('both-')
      || lifecyclePresets.includes(preset as typeof lifecyclePresets[number]) && preset !== 'inactive'
      || lazyPresets.includes(preset as typeof lazyPresets[number])
      || valuePresets.includes(preset as typeof valuePresets[number]);
    const hasEvents = preset.startsWith('events-only-')
      || preset.startsWith('both-')
      || lifecyclePresets.includes(preset as typeof lifecyclePresets[number]) && preset !== 'inactive'
      || lazyPresets.includes(preset as typeof lazyPresets[number])
      || valuePresets.includes(preset as typeof valuePresets[number]);

    assert.equal(result.theme, 'dark', preset);
    assert.equal(result.surfaceClassName, 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none', preset);
    assert.equal(state.active, preset !== 'inactive', preset);
    assert.equal(Boolean(state.dashboard), hasDashboard, preset);
    assert.equal(state.eventsPage.content.length > 0, hasEvents, preset);
    assert.equal(typeof renderers.chart, 'function', preset);
    assert.equal(typeof renderers.detail, 'function', preset);
    assert.equal(typeof renderers.insights, 'function', preset);
    assert.equal(result.captureSelector, state.detailPhase === 'closed'
      ? '[data-testid="admin-client-error-panel"]'
      : '[role="dialog"]', preset);

    if (dataForPreset(preset) === 'maximum-supported' && hasEvents) {
      assert.equal(state.eventsPage.content.length, 20, preset);
    }
    if (dataForPreset(preset) === 'maximum-supported' && hasDashboard) {
      assert.equal(state.dashboard?.recentFeedback.length, 50, preset);
      assert.equal(state.dashboard?.recentAlerts.length, 50, preset);
    }
  }

  const expectedPresetState: Record<string, Partial<{
    chartPhase: string;
    currentPage: number;
    detailLoading: boolean;
    detailOpen: boolean;
    detailPhase: string;
    insightsPhase: string;
    loadingDashboard: boolean;
    loadingEvents: boolean;
    panelError: RegExp;
    selectedEvent: 'null' | 'present';
    windowKey: string;
  }>> = {
    inactive: { loadingDashboard: false, loadingEvents: false },
    'dashboard-loading': { loadingDashboard: true, loadingEvents: false },
    'events-loading': { loadingDashboard: false, loadingEvents: true },
    'refresh-loading': { loadingDashboard: true, loadingEvents: true },
    'panel-error': { panelError: /관리자 모바일 화면/ },
    'detail-error': { detailOpen: true, detailLoading: false, detailPhase: 'resolved', selectedEvent: 'null' },
    'chart-fallback': { chartPhase: 'fallback' },
    'insights-deferred-fallback': { insightsPhase: 'deferred-fallback' },
    'insights-suspense-fallback': { insightsPhase: 'suspense-fallback' },
    'detail-suspense-fallback': { detailOpen: true, detailPhase: 'suspense-fallback' },
    'detail-resolved-loading': { detailOpen: true, detailLoading: true, detailPhase: 'resolved', selectedEvent: 'null' },
    'detail-resolved-populated': { detailOpen: true, detailLoading: false, detailPhase: 'resolved', selectedEvent: 'present' },
    'window-1h': { windowKey: '1h' },
    'window-7d': { windowKey: '7d' },
    'page-middle': { currentPage: 1 },
    'page-last': { currentPage: 2 },
  };
  for (const [preset, expected] of Object.entries(expectedPresetState)) {
    const state = resolvePreset(preset).props.visualQaStateOverride as Record<string, unknown>;
    for (const [key, value] of Object.entries(expected)) {
      if (key === 'panelError') assert.match(String(state.panelError), value as RegExp, preset);
      else if (key === 'selectedEvent') assert.equal(state.selectedEvent === null ? 'null' : 'present', value, preset);
      else assert.equal(state[key], value, `${preset}:${key}`);
    }
  }

  const expectedFilters: Record<string, Partial<{
    bucket: string;
    fingerprint: string;
    route: string;
    search: string;
    source: string;
    statusGroup: string;
  }>> = {
    'filter-bucket-api': { bucket: 'api' },
    'filter-bucket-runtime': { bucket: 'runtime' },
    'filter-source-api': { source: 'api' },
    'filter-source-runtime': { source: 'runtime' },
    'filter-source-unhandled-rejection': { source: 'unhandled_rejection' },
    'filter-status-5xx': { statusGroup: '5xx' },
    'filter-status-4xx': { statusGroup: '4xx' },
    'filter-status-none': { statusGroup: 'none' },
    'filter-route': { route: '/MOCK/client-error/route' },
    'filter-fingerprint': { fingerprint: 'MOCK_FILTER_FINGERPRINT' },
    'filter-search': { search: 'MOCK client error search' },
  };
  const emptyFilters = {
    bucket: 'all',
    fingerprint: '',
    route: '',
    search: '',
    source: 'all',
    statusGroup: 'all',
  };
  for (const preset of valuePresets) {
    const state = resolvePreset(preset).props.visualQaStateOverride as {
      currentPage: number;
      eventsPage: { last: boolean; number: number; totalPages: number };
      filters: typeof emptyFilters;
      windowKey: string;
    };
    const expected = expectedFilters[preset];
    if (expected) assert.deepEqual(state.filters, { ...emptyFilters, ...expected }, preset);
    if (preset === 'filter-long-korean') assert.match(state.filters.search, /가장 좁은 관리자 모바일 화면/, preset);
    if (preset === 'filter-unbroken-token') assert.match(state.filters.search, /^MOCK_CLIENT_ERROR_FILTER_UNBROKEN/, preset);
    if (!preset.startsWith('window-')) assert.equal(state.windowKey, '24h', preset);
    if (!preset.startsWith('page-')) assert.equal(state.currentPage, 0, preset);
    if (preset === 'page-middle') {
      assert.deepEqual(
        { number: state.eventsPage.number, totalPages: state.eventsPage.totalPages, last: state.eventsPage.last },
        { number: 1, totalPages: 3, last: false },
      );
    }
    if (preset === 'page-last') {
      assert.deepEqual(
        { number: state.eventsPage.number, totalPages: state.eventsPage.totalPages, last: state.eventsPage.last },
        { number: 2, totalPages: 3, last: true },
      );
    }
  }

  const actionTargets = new Set(['refresh', 'fingerprint', 'detail', 'previous', 'next']);
  const selectTargets = new Set(['window', 'bucket', 'source', 'status']);
  const inputTargets = new Set(['route', 'fingerprint-input', 'search']);
  const allTargets = new Set([...actionTargets, ...selectTargets, ...inputTargets]);
  const interactions: Array<[string, Set<string>]> = [
    ['hover', actionTargets],
    ['pressed', actionTargets],
    ['focus-visible', allTargets],
    ['input', inputTargets],
    ['change', selectTargets],
    ['keyboard-navigation', new Set(['filter-tab-path'])],
  ];
  let acceptedInteractions = 0;
  for (const [interaction, targets] of interactions) {
    for (const interactionTargetId of targets) {
      const result = resolveComponentStateAdapter('admin.client-error-panel', {
        componentId,
        states: {
          data: 'maximum-supported',
          interactions: interaction,
          permissions: 'admin',
          system: 'idle',
        },
        variants: { preset: 'both-maximum-supported', theme: 'dark' },
        interactionTargetId,
      });
      const state = result.props.visualQaStateOverride as { eventsPage: { content: unknown[] } };
      acceptedInteractions += 1;
      assert.equal(state.eventsPage.content.length, 20);
    }
  }
  assert.equal(acceptedInteractions, 30);

  const baseContext = {
    componentId,
    states: {
      data: 'maximum-supported',
      interactions: 'hover',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'both-maximum-supported', theme: 'dark' },
    interactionTargetId: 'refresh',
  };
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-panel', {
    ...baseContext,
    states: { ...baseContext.states, permissions: 'user' },
  }), /지원하지 않는 Admin client-error panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-panel', {
    ...baseContext,
    variants: { ...baseContext.variants, extra: 'unsupported' },
  }), /지원하지 않는 Admin client-error panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-panel', {
    ...baseContext,
    states: { ...baseContext.states, data: 'populated' },
  }), /지원하지 않는 Admin client-error panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-panel', {
    ...baseContext,
    states: { ...baseContext.states, system: 'dashboard-loading' },
  }), /지원하지 않는 Admin client-error panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-panel', {
    ...baseContext,
    interactionTargetId: 'window',
  }), /지원하지 않는 Admin client-error panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-panel', {
    ...baseContext,
    states: { ...baseContext.states, interactions: 'input' },
    interactionTargetId: 'bucket',
  }), /지원하지 않는 Admin client-error panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-panel', {
    ...baseContext,
    states: { ...baseContext.states, interactions: 'default' },
  }), /지원하지 않는 Admin client-error panel state/);
  assert.throws(() => resolveComponentStateAdapter('admin.client-error-panel', {
    ...baseContext,
    states: { ...baseContext.states, interactions: 'default' },
    variants: { preset: 'both-populated', theme: 'dark' },
    interactionTargetId: undefined,
  }), /지원하지 않는 Admin client-error panel state/);
});

test('admin game-status repair adapter covers owned data, lifecycle, pressure, and interaction states', () => {
  const componentId = 'src/components/admin/AdminGameStatusRepairPanel.tsx#AdminGameStatusRepairPanel';
  const baseContext = {
    componentId,
    states: {
      data: 'mixed',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { active: 'active', theme: 'dark' },
  };
  const base = resolveComponentStateAdapter('admin.game-status-repair-panel', baseContext);
  const baseState = base.props.visualQaStateOverride as Record<string, unknown>;

  assert.equal(base.props.active, true);
  assert.equal(base.captureSelector, '[data-testid="admin-game-status-panel"]');
  assert.match(String(base.surfaceClassName), /w-\[320px\]/);
  assert.equal(base.theme, 'dark');
  assert.equal((baseState.mismatchResult as { mismatchCount: number }).mismatchCount, 1);
  assert.equal((baseState.mismatchResult as { nonCanonicalCount: number }).nonCanonicalCount, 1);

  const maximum = resolveComponentStateAdapter('admin.game-status-repair-panel', {
    ...baseContext,
    states: { ...baseContext.states, data: 'maximum-supported' },
  }).props.visualQaStateOverride as {
    cleanupTrackers: unknown[];
    mismatchResult: { mismatches: unknown[]; nonCanonicalGames: unknown[] };
    recentRecommendations: unknown[];
    repairResult: { repairedGames: unknown[] };
  };
  assert.equal(maximum.mismatchResult.mismatches.length, 50);
  assert.equal(maximum.mismatchResult.nonCanonicalGames.length, 50);
  assert.equal(maximum.repairResult.repairedGames.length, 50);
  assert.equal(maximum.cleanupTrackers.length, 50);
  assert.equal(maximum.recentRecommendations.length, 14);

  for (const system of [
    'idle',
    'initial-loading',
    'diagnosis-loading',
    'repair-loading',
    'suggestions-loading',
    'suggestions-error',
    'tracker-loading',
    'tracker-saving',
    'panel-error',
    'tracker-message',
    'action-success',
    'copy-done',
    'copy-error',
    'manual-required',
  ]) {
    const result = resolveComponentStateAdapter('admin.game-status-repair-panel', {
      ...baseContext,
      states: { ...baseContext.states, system },
    });
    assert.ok(result.props.visualQaStateOverride);
  }

  const manualRequired = resolveComponentStateAdapter('admin.game-status-repair-panel', {
    ...baseContext,
    states: { ...baseContext.states, system: 'manual-required' },
  }).props.visualQaStateOverride as { panelError: string };
  assert.equal(manualRequired.panelError, MANUAL_BASEBALL_DATA_REQUIRED_CODE);

  for (const [interaction, interactionTargetId] of [
    ['hover', 'diagnose'],
    ['focus-visible', 'ticket-note'],
    ['pressed', 'save'],
    ['input', 'ticket-note'],
    ['keyboard-navigation', 'ticket-status'],
  ]) {
    assert.doesNotThrow(() => resolveComponentStateAdapter('admin.game-status-repair-panel', {
      ...baseContext,
      states: {
        ...baseContext.states,
        data: 'maximum-supported',
        interactions: interaction,
      },
      interactionTargetId,
    }));
  }

  assert.throws(() => resolveComponentStateAdapter('admin.game-status-repair-panel', {
    ...baseContext,
    states: { ...baseContext.states, data: 'unknown' },
  }), /지원하지 않는 Admin game-status repair state/);
  assert.throws(() => resolveComponentStateAdapter('admin.game-status-repair-panel', {
    ...baseContext,
    states: { ...baseContext.states, permissions: 'user' },
  }), /지원하지 않는 Visual QA state/);
  assert.throws(() => resolveComponentStateAdapter('admin.game-status-repair-panel', {
    ...baseContext,
    interactionTargetId: 'unknown',
    states: {
      ...baseContext.states,
      data: 'maximum-supported',
      interactions: 'hover',
    },
  }), /지원하지 않는 Admin game-status repair state/);
});

test('admin route adapter covers anonymous, user, admin, and super-admin outcomes', () => {
  const anonymous = resolveComponentStateAdapter('admin.route', {
    componentId: 'src/components/AdminRoute.tsx#AdminRoute',
    states: { permissions: 'anonymous' },
    variants: {},
  });
  assert.deepEqual(anonymous.props.accessOverride, { isLoggedIn: false });
  assert.equal(anonymous.initialPathname, '/admin?tab=ai#release');
  assert.equal(anonymous.expectedPathname, '/login');
  assert.equal(anonymous.expectedSearch, '?redirect=%2Fadmin%3Ftab%3Dai%23release');
  assert.equal(anonymous.expectedHash, '');
  assert.equal(anonymous.captureSelector, '[data-testid="admin-route-redirect-outcome"]');
  assert.equal(anonymous.semanticHost, 'admin-route');

  const user = resolveComponentStateAdapter('admin.route', {
    componentId: 'src/components/AdminRoute.tsx#AdminRoute',
    states: { permissions: 'user' },
    variants: {},
  });
  assert.deepEqual(user.props.accessOverride, { isLoggedIn: true, userRole: 'ROLE_USER' });
  assert.equal(user.expectedPathname, '/');
  assert.equal(user.expectedSearch, '');
  assert.equal(user.expectedHash, '');

  for (const [permission, role] of [
    ['admin', 'ROLE_ADMIN'],
    ['super-admin', 'ROLE_SUPER_ADMIN'],
  ] as const) {
    const allowed = resolveComponentStateAdapter('admin.route', {
      componentId: 'src/components/AdminRoute.tsx#AdminRoute',
      states: { permissions: permission },
      variants: {},
    });
    assert.deepEqual(allowed.props.accessOverride, { isLoggedIn: true, userRole: role });
    assert.ok(allowed.props.outletOverride);
    assert.equal(allowed.expectedPathname, '/admin');
    assert.equal(allowed.expectedSearch, '?tab=ai');
    assert.equal(allowed.expectedHash, '#release');
    assert.equal(allowed.captureSelector, '[data-testid="admin-route-outlet"]');
  }
});

test('route guard adapters cover every declared auth and redirect outcome', () => {
  const protectedLoading = resolveComponentStateAdapter('auth.protected-route', {
    componentId: 'src/components/ProtectedRoute.tsx#ProtectedRoute',
    states: { permissions: 'anonymous' },
    variants: { 'auth-state': 'auth-loading' },
  });
  assert.deepEqual(protectedLoading.props.stateOverride, {
    isAuthLoading: true,
    isLoggedIn: false,
    shouldAttemptBootstrap: false,
  });
  assert.equal(protectedLoading.captureSelector, '[role="status"]');
  assert.equal(protectedLoading.initialPathname, '/messages/@bega?from=protected#thread');
  assert.equal(protectedLoading.expectedPathname, '/messages/@bega');
  assert.equal(protectedLoading.expectedSearch, '?from=protected');
  assert.equal(protectedLoading.expectedHash, '#thread');
  assert.equal(protectedLoading.semanticHost, 'protected-route');

  const protectedAnonymous = resolveComponentStateAdapter('auth.protected-route', {
    componentId: 'src/components/ProtectedRoute.tsx#ProtectedRoute',
    states: { permissions: 'anonymous' },
    variants: { 'auth-state': 'ready' },
  });
  assert.equal(
    protectedAnonymous.captureSelector,
    '[data-testid="protected-route-login-required"]',
  );

  const protectedUserLoading = resolveComponentStateAdapter('auth.protected-route', {
    componentId: 'src/components/ProtectedRoute.tsx#ProtectedRoute',
    states: { permissions: 'user' },
    variants: { 'auth-state': 'auth-loading' },
  });
  assert.deepEqual(protectedUserLoading.props.stateOverride, {
    isAuthLoading: true,
    isLoggedIn: true,
    shouldAttemptBootstrap: false,
  });
  assert.ok(protectedUserLoading.props.outletOverride);
  assert.equal(protectedUserLoading.captureSelector, '[data-testid="protected-route-outlet"]');

  const publicAnonymous = resolveComponentStateAdapter('auth.public-only-route', {
    componentId: 'src/components/PublicOnlyAuthRoute.tsx#PublicOnlyAuthRoute',
    states: { permissions: 'anonymous' },
    variants: { 'auth-state': 'ready' },
  });
  assert.ok(publicAnonymous.props.outletOverride);
  assert.equal(publicAnonymous.captureSelector, '[data-testid="public-only-route-outlet"]');
  assert.equal(publicAnonymous.semanticHost, 'public-only-auth-route');

  const publicErrorBypass = resolveComponentStateAdapter('auth.public-only-route', {
    componentId: 'src/components/PublicOnlyAuthRoute.tsx#PublicOnlyAuthRoute',
    states: { permissions: 'user' },
    variants: { 'auth-state': 'login-error' },
  });
  assert.equal(publicErrorBypass.initialPathname, '/login?error=oauth2_auth_failed');
  assert.equal(publicErrorBypass.expectedPathname, '/login');
  assert.equal(publicErrorBypass.expectedSearch, '?error=oauth2_auth_failed');
  assert.ok(publicErrorBypass.props.outletOverride);

  const publicQueryRedirect = resolveComponentStateAdapter('auth.public-only-route', {
    componentId: 'src/components/PublicOnlyAuthRoute.tsx#PublicOnlyAuthRoute',
    states: { permissions: 'user' },
    variants: { 'auth-state': 'redirect-query' },
  });
  assert.equal(
    publicQueryRedirect.initialPathname,
    '/login?redirect=%2Fmessages%2F%40bega%3Ffrom%3Dlogin%23thread',
  );
  assert.equal(publicQueryRedirect.expectedPathname, '/messages/@bega');
  assert.equal(publicQueryRedirect.expectedSearch, '?from=login');
  assert.equal(publicQueryRedirect.expectedHash, '#thread');
  assert.equal(publicQueryRedirect.captureSelector, '[data-testid="public-only-route-redirect-outcome"]');

  const publicPendingRedirect = resolveComponentStateAdapter('auth.public-only-route', {
    componentId: 'src/components/PublicOnlyAuthRoute.tsx#PublicOnlyAuthRoute',
    states: { permissions: 'user' },
    variants: { 'auth-state': 'redirect-pending' },
  });
  assert.equal(
    (publicPendingRedirect.props.authStateOverride as { pendingLoginRedirect?: string })
      .pendingLoginRedirect,
    '/mypage?tab=security#sessions',
  );
  assert.equal(publicPendingRedirect.expectedPathname, '/mypage');
  assert.equal(publicPendingRedirect.expectedSearch, '?tab=security');
  assert.equal(publicPendingRedirect.expectedHash, '#sessions');

  const publicFallbackRedirect = resolveComponentStateAdapter('auth.public-only-route', {
    componentId: 'src/components/PublicOnlyAuthRoute.tsx#PublicOnlyAuthRoute',
    states: { permissions: 'user' },
    variants: { 'auth-state': 'redirect-fallback' },
  });
  assert.equal(publicFallbackRedirect.expectedPathname, '/home');
  assert.equal(publicFallbackRedirect.expectedSearch, '');
  assert.equal(publicFallbackRedirect.expectedHash, '');
});

test('app shell boundary adapters isolate providers, lazy phases, session dialog, and bootstrap states', () => {
  for (const theme of ['light', 'dark'] as const) {
    const browserShell = resolveComponentStateAdapter('app.browser-shell', {
      componentId: 'src/components/AppBrowserShell.tsx#AppBrowserShell',
      states: { data: 'single' },
      variants: { theme },
    });
    assert.equal(browserShell.theme, theme);
    assert.equal(typeof browserShell.props.routerOverride, 'function');
    assert.ok(browserShell.props.runtimeOverride);
    assert.equal(browserShell.captureSelector, '[data-testid="app-browser-shell-runtime"]');
  }

  const appFallback = resolveComponentStateAdapter('app.shell-runtime', {
    componentId: 'src/components/AppShellRuntime.tsx#AppShellRuntime',
    states: { data: 'single' },
    variants: { phase: 'fallback', theme: 'light' },
  });
  assert.deepEqual(appFallback.props, { phaseOverride: 'fallback' });
  assert.equal(appFallback.captureSelector, '[data-vqa-harness-surface] main');

  const appResolved = resolveComponentStateAdapter('app.shell-runtime', {
    componentId: 'src/components/AppShellRuntime.tsx#AppShellRuntime',
    states: { data: 'unbroken-token' },
    variants: { phase: 'resolved', theme: 'dark' },
  });
  assert.equal(appResolved.props.phaseOverride, 'resolved');
  assert.ok(appResolved.props.runtimeOverride);
  assert.equal(appResolved.theme, 'dark');
  assert.equal(appResolved.captureSelector, '[data-testid="app-shell-resolved"]');

  const sessionClosed = resolveComponentStateAdapter('auth.session-boundary', {
    componentId: 'src/components/AuthSessionBoundary.tsx#AuthSessionBoundary',
    states: { data: 'long-korean', permissions: 'user' },
    variants: { dialog: 'closed' },
  });
  assert.deepEqual(sessionClosed.props.stateOverride, {
    pendingLoginRedirect: null,
    showLoginRequiredDialog: false,
  });
  assert.equal(sessionClosed.captureSelector, '[data-testid="auth-session-boundary-child"]');

  const sessionOpen = resolveComponentStateAdapter('auth.session-boundary', {
    componentId: 'src/components/AuthSessionBoundary.tsx#AuthSessionBoundary',
    states: { data: 'single', permissions: 'anonymous' },
    variants: { dialog: 'open' },
  });
  assert.deepEqual(sessionOpen.props.stateOverride, {
    pendingLoginRedirect: '/messages/@bega?from=session#thread',
    showLoginRequiredDialog: true,
  });
  assert.equal(
    sessionOpen.captureSelector,
    '[data-testid="prediction-login-required-dialog"]',
  );

  for (const [bootstrapState, shouldMount, pathname] of [
    ['skip-public', false, '/home'],
    ['skip-backoff', false, '/messages/@bega'],
    ['defer-persisted', true, '/home'],
    ['immediate-protected', true, '/messages/@bega'],
    ['injected-profile', true, '/home'],
  ] as const) {
    const bootstrap = resolveComponentStateAdapter('auth.bootstrap-gate', {
      componentId: 'src/components/AuthBootstrapGate.tsx#AuthBootstrapGate',
      states: { permissions: 'anonymous' },
      variants: { 'bootstrap-state': bootstrapState },
    });
    assert.equal(bootstrap.props.shouldMountOverride, shouldMount);
    assert.ok(bootstrap.props.runtimeOverride);
    assert.equal(bootstrap.initialPathname, pathname);
    assert.equal(bootstrap.expectedPathname, pathname);
    assert.equal(bootstrap.captureSelector, '[data-testid="auth-bootstrap-gate-outcome"]');
  }

  assert.throws(() => resolveComponentStateAdapter('app.shell-runtime', {
    componentId: 'src/components/AppShellRuntime.tsx#AppShellRuntime',
    states: { data: 'long-korean' },
    variants: { phase: 'fallback', theme: 'light' },
  }), /지원하지 않는 Visual QA app-shell state/);
  assert.throws(() => resolveComponentStateAdapter('auth.session-boundary', {
    componentId: 'src/components/AuthSessionBoundary.tsx#AuthSessionBoundary',
    states: { data: 'single', permissions: 'user' },
    variants: { dialog: 'open' },
  }), /지원하지 않는 Visual QA auth-session state/);
});

test('app provider and authenticated chrome adapters isolate outlet and global runtime branches', () => {
  const provided = resolveComponentStateAdapter('app.query-provider', {
    componentId: 'src/components/AppQueryProvider.tsx#AppQueryProvider',
    states: { data: 'long-korean' },
    variants: { content: 'provided' },
  });
  assert.ok(provided.props.children);
  assert.equal(provided.captureSelector, '[data-testid="app-query-provider-content"]');
  assert.equal(provided.semanticHost, undefined);

  const outlet = resolveComponentStateAdapter('app.query-provider', {
    componentId: 'src/components/AppQueryProvider.tsx#AppQueryProvider',
    states: { data: 'single' },
    variants: { content: 'outlet' },
  });
  assert.equal(outlet.props.children, undefined);
  assert.equal(outlet.semanticHost, 'outlet-route');
  assert.equal(outlet.captureSelector, '[data-testid="app-query-provider-outlet"]');

  const anonymousLauncher = resolveComponentStateAdapter('authenticated-layout.chrome', {
    componentId: 'src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome',
    states: { permissions: 'anonymous' },
    variants: { chatbot: 'launcher', route: 'regular' },
  });
  assert.equal(anonymousLauncher.props.enableAuthenticatedServices, false);
  assert.equal(anonymousLauncher.props.isChatBotRequestedOverride, false);
  assert.ok(anonymousLauncher.props.runtimeOverrides);
  assert.equal(anonymousLauncher.initialPathname, '/home');
  assert.equal(
    anonymousLauncher.captureSelector,
    '[data-testid="authenticated-layout-chrome-state"]',
  );

  const userMateLauncher = resolveComponentStateAdapter('authenticated-layout.chrome', {
    componentId: 'src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome',
    states: { permissions: 'user' },
    variants: { chatbot: 'launcher', route: 'mate-action' },
  });
  assert.equal(userMateLauncher.props.enableAuthenticatedServices, true);
  assert.equal(userMateLauncher.initialPathname, '/mate/visual-qa/apply');

  const openChat = resolveComponentStateAdapter('authenticated-layout.chrome', {
    componentId: 'src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome',
    states: { permissions: 'user' },
    variants: { chatbot: 'open', route: 'regular' },
  });
  assert.equal(openChat.props.isChatBotRequestedOverride, true);
  assert.equal(
    openChat.captureSelector,
    '[data-testid="authenticated-layout-chatbot-stub"]',
  );

  for (const theme of ['light', 'dark'] as const) {
    const toaster = resolveComponentStateAdapter('authenticated-layout.toaster', {
      componentId: 'src/components/AuthenticatedLayoutToaster.tsx#AuthenticatedLayoutToaster',
      states: { data: 'single' },
      variants: { theme },
    });
    assert.equal(toaster.captureSelector, '.toaster');
    assert.ok(toaster.companion);
    assert.equal(toaster.theme, theme);
  }

  assert.throws(() => resolveComponentStateAdapter('app.query-provider', {
    componentId: 'src/components/AppQueryProvider.tsx#AppQueryProvider',
    states: { data: 'unbroken-token' },
    variants: { content: 'outlet' },
  }), /지원하지 않는 Visual QA app-query-provider state/);
  assert.throws(() => resolveComponentStateAdapter('authenticated-layout.chrome', {
    componentId: 'src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome',
    states: { permissions: 'user' },
    variants: { chatbot: 'open', route: 'mate-action' },
  }), /지원하지 않는 Visual QA authenticated-layout state/);
});

test('layout shell adapter maps every independent mobile shell boundary', () => {
  const publicHomeInitial = resolveComponentStateAdapter('app.layout', {
    componentId: 'src/components/Layout.tsx#Layout',
    states: { data: 'long-korean', permissions: 'anonymous' },
    variants: {
      'chat-chrome': 'absent',
      'chrome-stage': 'initial',
      footer: 'hidden',
      navbar: 'fallback',
      route: 'public-home',
      theme: 'dark',
    },
  });
  assert.equal(publicHomeInitial.props.authenticated, false);
  assert.deepEqual(publicHomeInitial.props.visualQaStateOverride, {
    isFooterRequested: false,
    publicHomeChromeReadyStage: 0,
  });
  assert.deepEqual(publicHomeInitial.props.visualQaRuntimePhases, {
    authenticatedLayoutChrome: 'resolved',
    footer: 'resolved',
    navbar: 'loading',
    publicNavbar: 'loading',
  });
  assert.ok(publicHomeInitial.props.visualQaRuntimeOverrides);
  assert.ok(publicHomeInitial.props.visualQaOutletOverride);
  assert.equal(publicHomeInitial.initialPathname, '/home');
  assert.equal(publicHomeInitial.theme, 'dark');

  const authenticatedMateLoading = resolveComponentStateAdapter('app.layout', {
    componentId: 'src/components/Layout.tsx#Layout',
    states: { data: 'unbroken-token', permissions: 'user' },
    variants: {
      'chat-chrome': 'loading',
      'chrome-stage': 'complete',
      footer: 'loading',
      navbar: 'resolved',
      route: 'authenticated-mate',
      theme: 'light',
    },
  });
  assert.equal(authenticatedMateLoading.props.authenticated, true);
  assert.deepEqual(authenticatedMateLoading.props.visualQaStateOverride, {
    isFooterRequested: true,
    publicHomeChromeReadyStage: 2,
  });
  assert.deepEqual(authenticatedMateLoading.props.visualQaRuntimePhases, {
    authenticatedLayoutChrome: 'loading',
    footer: 'loading',
    navbar: 'resolved',
    publicNavbar: 'resolved',
  });
  assert.equal(authenticatedMateLoading.initialPathname, '/mate/visual-qa/apply');
  assert.equal(authenticatedMateLoading.theme, 'light');

  assert.throws(() => resolveComponentStateAdapter('app.layout', {
    componentId: 'src/components/Layout.tsx#Layout',
    states: { data: 'single', permissions: 'anonymous' },
    variants: {
      'chat-chrome': 'resolved',
      'chrome-stage': 'complete',
      footer: 'resolved',
      navbar: 'resolved',
      route: 'authenticated-regular',
      theme: 'light',
    },
  }), /지원하지 않는 Visual QA layout state/);
});

test('app routes adapter renders the wildcard route inside the lazy route boundary', () => {
  const wildcard = resolveComponentStateAdapter('app.routes', {
    componentId: 'src/components/AppRoutes.tsx#AppRoutes',
    states: { data: 'single' },
    variants: { route: 'not-found', theme: 'dark' },
  });

  assert.deepEqual(wildcard.props, {});
  assert.equal(wildcard.captureSelector, '[data-testid="not-found-page"]');
  assert.equal(wildcard.expectedHash, '');
  assert.equal(wildcard.expectedPathname, '/__visual-qa__/missing-route');
  assert.equal(wildcard.expectedSearch, '');
  assert.equal(wildcard.initialPathname, '/__visual-qa__/missing-route');
  assert.equal(wildcard.semanticHost, 'suspense');
  assert.equal(wildcard.theme, 'dark');

  assert.throws(() => resolveComponentStateAdapter('app.routes', {
    componentId: 'src/components/AppRoutes.tsx#AppRoutes',
    states: { data: 'long-korean' },
    variants: { route: 'not-found', theme: 'light' },
  }), /지원하지 않는 Visual QA state/);
});

test('navbar shell adapter maps permission, menu, route, badge, scroll, and theme branches', () => {
  const closedUser = resolveComponentStateAdapter('navbar.shell', {
    componentId: 'src/components/Navbar.tsx#Navbar',
    states: { data: 'single', interactions: 'default', permissions: 'user' },
    variants: {
      'chat-unread': 'overflow',
      'dm-unread': 'boundary-maximum',
      menu: 'closed',
      route: 'mate',
      scroll: 'top',
      shell: 'authenticated',
      theme: 'dark',
    },
  });
  assert.equal(closedUser.props.authenticatedShell, true);
  const closedUserState = closedUser.props.visualQaStateOverride as Record<string, unknown>;
  assert.deepEqual(closedUserState, {
    chatUnreadCount: 100,
    compactProgress: 0,
    dmUnreadCount: 99,
    fastCompactProgress: 0,
    isDesktop: false,
    isLoggedIn: true,
    isMenuOpen: false,
    isMobileMenuMounted: false,
    isMobileMenuVisible: false,
    notificationUnreadCount: 100,
    shrinkProgress: 0,
    userName: '비주얼 QA',
    userProfileImageUrl: closedUserState.userProfileImageUrl,
    userRole: 'ROLE_USER',
    viewportFitProgress: 1,
  });
  assert.match(String(closedUserState.userProfileImageUrl), /^data:image\/svg\+xml/);
  assert.equal(closedUser.initialPathname, '/mate');
  assert.equal(closedUser.theme, 'dark');
  assert.match(closedUser.surfaceClassName ?? '', /fixed inset-0/);

  const openAdmin = resolveComponentStateAdapter('navbar.shell', {
    componentId: 'src/components/Navbar.tsx#Navbar',
    states: { data: 'unbroken-token', interactions: 'default', permissions: 'admin' },
    variants: {
      'chat-unread': 'zero',
      'dm-unread': 'zero',
      menu: 'open',
      route: 'prediction',
      scroll: 'scrolled',
      shell: 'public',
      theme: 'light',
    },
  });
  const openAdminState = openAdmin.props.visualQaStateOverride as Record<string, unknown>;
  assert.equal(openAdmin.props.authenticatedShell, false);
  assert.equal(openAdminState.isLoggedIn, true);
  assert.equal(openAdminState.isMenuOpen, true);
  assert.equal(openAdminState.isMobileMenuMounted, true);
  assert.equal(openAdminState.isMobileMenuVisible, true);
  assert.equal(openAdminState.userRole, 'ROLE_ADMIN');
  assert.match(String(openAdminState.userName), /^NAVBAR-/);
  assert.equal(openAdmin.initialPathname, '/prediction');
  assert.equal(openAdmin.theme, 'light');

  const brokenImage = resolveComponentStateAdapter('navbar.shell', {
    componentId: 'src/components/Navbar.tsx#Navbar',
    states: { data: 'broken-image', interactions: 'default', permissions: 'user' },
    variants: {
      'chat-unread': 'zero',
      'dm-unread': 'zero',
      menu: 'open',
      route: 'regular',
      scroll: 'top',
      shell: 'authenticated',
      theme: 'light',
    },
  });
  assert.equal(
    (brokenImage.props.visualQaStateOverride as Record<string, unknown>).userProfileImageUrl,
    '/__visual-qa__/missing-navbar-profile.png',
  );

  assert.throws(() => resolveComponentStateAdapter('navbar.shell', {
    componentId: 'src/components/Navbar.tsx#Navbar',
    states: { data: 'long-korean', interactions: 'default', permissions: 'anonymous' },
    variants: {
      'chat-unread': 'single',
      'dm-unread': 'single',
      menu: 'closed',
      route: 'regular',
      scroll: 'top',
      shell: 'public',
      theme: 'light',
    },
  }), /지원하지 않는 Visual QA navbar state/);
});

test('public navbar shell adapter maps auth, menu, route, badge, scroll, and theme branches', () => {
  const closedUser = resolveComponentStateAdapter('public-navbar.shell', {
    componentId: 'src/components/PublicNavbar.tsx#PublicNavbar',
    states: { data: 'single', interactions: 'default', permissions: 'user' },
    variants: {
      auth: 'settled',
      'dm-unread': 'boundary-maximum',
      menu: 'closed',
      'notification-unread': 'overflow',
      route: 'home',
      scroll: 'top',
      theme: 'dark',
    },
  });
  const closedUserState = closedUser.props.visualQaStateOverride as Record<string, unknown>;
  assert.deepEqual(closedUserState, {
    compactProgress: 0,
    dmUnreadCount: 99,
    fastCompactProgress: 0,
    isAuthBootstrapPending: false,
    isDesktop: false,
    isLoggedIn: true,
    isMenuOpen: false,
    isMobileMenuMounted: false,
    isMobileMenuVisible: false,
    notificationUnreadCount: 100,
    shrinkProgress: 0,
    userName: '비주얼 QA',
    userProfileImageUrl: closedUserState.userProfileImageUrl,
    userRole: 'ROLE_USER',
    viewportFitProgress: 1,
  });
  assert.match(String(closedUserState.userProfileImageUrl), /^data:image\/svg\+xml/);
  assert.equal(closedUser.initialPathname, '/home');
  assert.equal(closedUser.theme, 'dark');
  assert.match(closedUser.surfaceClassName ?? '', /fixed inset-0/);

  const openAdmin = resolveComponentStateAdapter('public-navbar.shell', {
    componentId: 'src/components/PublicNavbar.tsx#PublicNavbar',
    states: { data: 'unbroken-token', interactions: 'default', permissions: 'admin' },
    variants: {
      auth: 'settled',
      'dm-unread': 'zero',
      menu: 'open',
      'notification-unread': 'zero',
      route: 'prediction',
      scroll: 'top',
      theme: 'light',
    },
  });
  const openAdminState = openAdmin.props.visualQaStateOverride as Record<string, unknown>;
  assert.equal(openAdminState.isLoggedIn, true);
  assert.equal(openAdminState.isMenuOpen, true);
  assert.equal(openAdminState.isMobileMenuMounted, true);
  assert.equal(openAdminState.isMobileMenuVisible, true);
  assert.equal(openAdminState.userRole, 'ROLE_ADMIN');
  assert.match(String(openAdminState.userName), /^PUBLIC-NAVBAR-/);
  assert.equal(openAdmin.captureSelector, '.mobile-menu-layer');
  assert.equal(openAdmin.initialPathname, '/prediction');
  assert.equal(openAdmin.theme, 'light');

  const bootstrapPending = resolveComponentStateAdapter('public-navbar.shell', {
    componentId: 'src/components/PublicNavbar.tsx#PublicNavbar',
    states: { data: 'single', interactions: 'default', permissions: 'anonymous' },
    variants: {
      auth: 'bootstrap-pending',
      'dm-unread': 'zero',
      menu: 'open',
      'notification-unread': 'zero',
      route: 'public-standard',
      scroll: 'top',
      theme: 'light',
    },
  });
  const bootstrapState = bootstrapPending.props.visualQaStateOverride as Record<string, unknown>;
  assert.equal(bootstrapState.isAuthBootstrapPending, true);
  assert.equal(bootstrapState.isLoggedIn, false);
  assert.equal(bootstrapPending.initialPathname, '/terms');

  assert.throws(() => resolveComponentStateAdapter('public-navbar.shell', {
    componentId: 'src/components/PublicNavbar.tsx#PublicNavbar',
    states: { data: 'long-korean', interactions: 'default', permissions: 'anonymous' },
    variants: {
      auth: 'settled',
      'dm-unread': 'single',
      menu: 'closed',
      'notification-unread': 'single',
      route: 'home',
      scroll: 'top',
      theme: 'light',
    },
  }), /지원하지 않는 Visual QA public navbar state/);
});

test('public desktop auth controls adapter maps identity, auth, compact frames, and theme', () => {
  const admin = resolveComponentStateAdapter('public-navbar.desktop-auth-controls', {
    componentId: 'src/components/PublicNavbarDesktopAuthControls.tsx#PublicNavbarDesktopAuthControls',
    states: { data: 'long-korean', interactions: 'default', permissions: 'admin' },
    variants: {
      auth: 'settled',
      compact: 'compact',
      theme: 'dark',
    },
  });
  assert.deepEqual(admin.props, {
    compactProgress: 1,
    isAuthBootstrapPending: false,
    visualQaStateOverride: {
      isLoggedIn: true,
      userName: '공개 데스크톱 인증 컨트롤에서 말줄임되어야 하는 매우 긴 한국어 사용자 이름',
      userProfileImageUrl: admin.props.visualQaStateOverride
        && (admin.props.visualQaStateOverride as Record<string, unknown>).userProfileImageUrl,
      userRole: 'ROLE_ADMIN',
    },
  });
  assert.match(
    String((admin.props.visualQaStateOverride as Record<string, unknown>).userProfileImageUrl),
    /^data:image\/svg\+xml/,
  );
  assert.equal(admin.theme, 'dark');
  assert.match(admin.surfaceClassName ?? '', /flex-wrap/);

  const bootstrap = resolveComponentStateAdapter('public-navbar.desktop-auth-controls', {
    componentId: 'src/components/PublicNavbarDesktopAuthControls.tsx#PublicNavbarDesktopAuthControls',
    states: { data: 'single', interactions: 'default', permissions: 'anonymous' },
    variants: {
      auth: 'bootstrap-pending',
      compact: 'compact',
      theme: 'light',
    },
  });
  assert.deepEqual(bootstrap.props, {
    compactProgress: 1,
    isAuthBootstrapPending: true,
    visualQaStateOverride: {
      isLoggedIn: false,
      userName: undefined,
      userProfileImageUrl: undefined,
      userRole: undefined,
    },
  });

  assert.throws(() => resolveComponentStateAdapter('public-navbar.desktop-auth-controls', {
    componentId: 'src/components/PublicNavbarDesktopAuthControls.tsx#PublicNavbarDesktopAuthControls',
    states: { data: 'unbroken-token', interactions: 'default', permissions: 'anonymous' },
    variants: {
      auth: 'settled',
      compact: 'expanded',
      theme: 'light',
    },
  }), /지원하지 않는 Visual QA public desktop auth controls state/);
});

test('ad slot adapter renders the owned shell without loading an external ad provider', async () => {
  const result = resolveComponentStateAdapter('ads.slot', {
    componentId: 'src/components/ads/AdSlot.tsx#AdSlot',
    states: { data: 'unbroken-token' },
    variants: { creative: 'native-card', height: 'string' },
  });
  const runtime = result.props.runtime as {
    adClient: string;
    adSlotUnit: string;
    enabled: boolean;
    loadScript: () => Promise<unknown>;
  };
  assert.equal(result.captureSelector, '[data-ad-variant][data-ad-slot]');
  assert.match(String(result.props.slotId), /AD-SLOT-/);
  assert.equal(result.props.creativeType, 'native_card');
  assert.equal(result.props.minHeight, '12rem');
  assert.equal(runtime.enabled, true);
  assert.equal(runtime.adClient, 'ca-pub-visual-qa');
  assert.equal(runtime.adSlotUnit, 'visual-qa-unit');
  let settled = false;
  void runtime.loadScript().finally(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
});

test('ticket upload modal adapter covers mobile result pressure and deterministic transport states', async () => {
  const result = resolveComponentStateAdapter('ticket.upload-modal', {
    componentId: 'src/components/ticket/TicketUploadModal.tsx#TicketUploadModal',
    states: { data: 'unbroken-token', interactions: 'input', system: 'online' },
    variants: { gameMatch: 'present' },
  });
  const initialState = result.props.initialState as {
    ticketData: { gameId: number | null; stadium: string | null };
    previewUrl: string;
  };
  assert.equal(result.captureSelector, '[data-testid="ticket-upload-dialog"]');
  assert.equal(result.props.open, true);
  assert.equal(result.props.trigger, null);
  assert.equal(initialState.ticketData.gameId, 2026082301);
  assert.match(String(initialState.ticketData.stadium), /^STADIUM-/);
  assert.match(initialState.previewUrl, /^data:image\/svg\+xml/);

  const offline = resolveComponentStateAdapter('ticket.upload-modal', {
    componentId: 'src/components/ticket/TicketUploadModal.tsx#TicketUploadModal',
    states: { data: 'error-503', interactions: 'default', system: 'offline' },
    variants: { gameMatch: 'missing' },
  });
  assert.match(
    String((offline.props.initialState as { analysisError: string }).analysisError),
    /사용할 수 없습니다/,
  );
  await assert.rejects(
    () => (offline.props.analyzeTicketFile as (file: File) => Promise<unknown>)({} as File),
    /네트워크 연결/,
  );

  const timeout = resolveComponentStateAdapter('ticket.upload-modal', {
    componentId: 'src/components/ticket/TicketUploadModal.tsx#TicketUploadModal',
    states: { data: 'loading', interactions: 'default', system: 'timeout' },
    variants: { gameMatch: 'missing' },
  });
  assert.equal((timeout.props.initialState as { isLoading: boolean }).isLoading, true);
});

test('theme toggle adapter reproduces every production placement and resolved theme', () => {
  const privateNavbar = resolveComponentStateAdapter('theme-toggle.button', {
    componentId: 'src/components/ThemeToggleButton.tsx#ThemeToggleButton',
    states: { interactions: 'hover' },
    variants: { theme: 'dark', usage: 'private-navbar' },
    interactionTargetId: 'toggle',
  });
  assert.equal(privateNavbar.theme, 'dark');
  assert.equal(privateNavbar.captureSelector, 'button[aria-label]');
  assert.equal(privateNavbar.props.iconClassName, 'h-5 w-5');
  assert.match(String(privateNavbar.props.className), /motion-safe:hover:-translate-y-0\.5/);
  assert.match(String(privateNavbar.surfaceClassName), /bg-white dark:bg-slate-950/);

  const menu = resolveComponentStateAdapter('theme-toggle.button', {
    componentId: 'src/components/ThemeToggleButton.tsx#ThemeToggleButton',
    states: { interactions: 'selected' },
    variants: { theme: 'light', usage: 'menu-panel' },
    interactionTargetId: 'to-dark',
  });
  assert.equal(menu.theme, 'light');
  assert.equal(menu.props.iconClassName, 'h-6 w-6');
  assert.match(String(menu.props.className), /h-11 w-11/);

  assert.throws(() => resolveComponentStateAdapter('theme-toggle.button', {
    componentId: 'src/components/ThemeToggleButton.tsx#ThemeToggleButton',
    states: { interactions: 'selected' },
    variants: { theme: 'light', usage: 'default' },
    interactionTargetId: 'to-light',
  }), /지원하지 않는 Visual QA theme toggle transition/);
});

test('terms of service adapter captures the complete static document in both themes', () => {
  const result = resolveComponentStateAdapter('terms-of-service.page', {
    componentId: 'src/components/TermsOfService.tsx#TermsOfService',
    states: { data: 'single' },
    variants: { theme: 'dark' },
  });
  assert.deepEqual(result.props, {});
  assert.equal(result.theme, 'dark');
  assert.match(String(result.surfaceClassName), /max-w-none/);
  assert.match(String(result.surfaceClassName), /p-0/);
});

test('privacy policy adapter captures the complete static document in both themes', () => {
  const result = resolveComponentStateAdapter('privacy-policy.page', {
    componentId: 'src/components/PrivacyPolicy.tsx#PrivacyPolicy',
    states: { data: 'single' },
    variants: { theme: 'light' },
  });
  assert.deepEqual(result.props, {});
  assert.equal(result.theme, 'light');
  assert.match(String(result.surfaceClassName), /max-w-none/);
  assert.match(String(result.surfaceClassName), /p-0/);
});

test('simple markdown adapter covers structural content, heading omission, and theme', () => {
  const result = resolveComponentStateAdapter('simple-markdown.content', {
    componentId: 'src/components/SimpleMarkdownContent.tsx#SimpleMarkdownContent',
    states: { data: 'maximum-supported', interactions: 'focus-visible' },
    variants: { heading: 'omit-first', theme: 'dark' },
  });

  assert.equal(result.props.omitFirstHeading, true);
  assert.match(String(result.props.content), /```typescript/);
  assert.match(String(result.props.content), /\| 구단 \| 상태 \|/);
  assert.equal(result.theme, 'dark');
  assert.match(String(result.surfaceClassName), /max-w-\[320px\]/);
});

test('end-of-feed adapter pins the public empty terminus in both themes', () => {
  const result = resolveComponentStateAdapter('common.end-of-feed', {
    componentId: 'src/components/EndOfFeed.tsx#EndOfFeed',
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { theme: 'dark' },
  });

  assert.deepEqual(result.props, {});
  assert.equal(result.theme, 'dark');
  assert.match(String(result.surfaceClassName), /max-w-\[320px\]/);
});

test('landing feature card adapter resolves content, icon, image, and controlled presentation branches', () => {
  const result = resolveComponentStateAdapter('landing.feature-card', {
    componentId: 'src/components/FeatureCard.tsx#FeatureCard',
    states: { data: 'unbroken-token', interactions: 'focus-visible' },
    variants: {
      icon: 'stadium',
      image: 'mobile-fallback',
      presentation: 'active-expanded',
      theme: 'dark',
    },
  });
  const feature = result.props.feature as {
    description: string;
    guide: string[];
    iconKey: string;
    image: string;
    mobileImage?: string;
  };

  assert.equal(feature.iconKey, 'map');
  assert.match(feature.description, /X{120}/);
  assert.match(feature.guide[0], /X{120}/);
  assert.match(String(feature.image), /^data:image\/svg\+xml/);
  assert.equal(feature.mobileImage, 'data:image/png;base64,bm90LXZhbGlk');
  assert.equal(result.props.isActive, true);
  assert.equal(result.props.isExpanded, true);
  assert.equal(result.theme, 'dark');
  assert.match(String(result.surfaceClassName), /max-w-\[320px\]/);
});

test('footer adapter captures both link treatments in each theme', () => {
  const result = resolveComponentStateAdapter('layout.footer', {
    componentId: 'src/components/Footer.tsx#Footer',
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { theme: 'dark' },
    interactionTargetId: 'email',
  });

  assert.deepEqual(result.props, {});
  assert.equal(result.theme, 'dark');
  assert.match(String(result.surfaceClassName), /max-w-\[320px\]/);
});

test('laptop mockup adapter covers content pressure and image fallback inputs', () => {
  const result = resolveComponentStateAdapter('landing.laptop-mockup', {
    componentId: 'src/components/LaptopMockup.tsx#LaptopMockup',
    states: { data: 'unbroken-token' },
    variants: { feature: 'stadium', image: 'mobile-fallback', theme: 'light' },
  });
  const feature = (result.props.features as Array<{
    description: string;
    image: string;
    mobileImage?: string;
    title: string;
  }>)[0];

  assert.equal(result.props.activeFeature, 0);
  assert.match(feature.title, /X{120}/);
  assert.match(feature.description, /X{120}/);
  assert.match(feature.image, /^data:image\/svg\+xml/);
  assert.equal(feature.mobileImage, 'data:image/png;base64,bm90LXZhbGlk');
  assert.equal(result.theme, 'light');
});

test('team logo adapter covers every franchise, fallback pressure, and public size', () => {
  const logo = resolveComponentStateAdapter('team.logo', {
    componentId: 'src/components/TeamLogo.tsx#TeamLogo',
    states: { data: 'populated' },
    variants: { size: 'full-prediction', team: 'team-id-precedence', theme: 'dark' },
  });
  assert.equal(logo.props.team, 'HH');
  assert.equal(logo.props.teamId, 'LG');
  assert.equal(logo.props.size, 'full');
  assert.match(String(logo.props.className), /h-6 w-6/);
  assert.equal(logo.theme, 'dark');

  const largeFallback = resolveComponentStateAdapter('team.logo', {
    componentId: 'src/components/TeamLogo.tsx#TeamLogo',
    states: { data: 'unbroken-token' },
    variants: { size: 'custom-large', team: 'hanwha', theme: 'light' },
  });
  assert.equal(largeFallback.props.size, 320);
  assert.equal(String(largeFallback.props.team), `UNKNOWN-${'X'.repeat(180)}`);
  assert.throws(() => resolveComponentStateAdapter('team.logo', {
    componentId: 'src/components/TeamLogo.tsx#TeamLogo',
    states: { data: 'empty' },
    variants: { size: 'sm', team: 'kiwoom', theme: 'light' },
  }), /지원하지 않는 TeamLogo 비정상 데이터 조합/);
});

test('team recommendation adapter resolves question, selected, and result screens deterministically', () => {
  const question = resolveComponentStateAdapter('team-recommendation.test', {
    componentId: 'src/components/TeamRecommendationTest.tsx#TeamRecommendationTest',
    states: { data: 'single', interactions: 'selected' },
    variants: { presentation: 'question-7', theme: 'dark' },
    interactionTargetId: 'answer',
  });
  assert.equal(question.props.isOpen, true);
  assert.equal((question.props.initialState as { currentQuestion: number }).currentQuestion, 6);
  assert.equal((question.props.initialState as { selectedAnswer: number }).selectedAnswer, 0);
  assert.equal(question.theme, 'dark');
  assert.equal(question.captureSelector, '[role="dialog"]');

  const result = resolveComponentStateAdapter('team-recommendation.test', {
    componentId: 'src/components/TeamRecommendationTest.tsx#TeamRecommendationTest',
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: { presentation: 'result-kt', theme: 'light' },
  });
  const initialState = result.props.initialState as {
    questionTeamScores: Array<Record<string, number> | null>;
    recommendedTeam: string;
    showResult: boolean;
  };
  assert.equal(initialState.recommendedTeam, 'KT');
  assert.equal(initialState.showResult, true);
  assert.equal(Object.keys(initialState.questionTeamScores[0] ?? {}).length, 10);
});

test('login-required-dialog uses an explicit portal capture surface', () => {
  const result = resolveComponentStateAdapter('login-required.dialog', {
    componentId: 'src/components/LoginRequiredDialog.tsx#LoginRequiredDialog',
    states: { permissions: 'anonymous' },
    variants: {},
  });
  assert.equal(result.props.open, true);
  assert.equal(typeof result.props.onOpenChange, 'function');
  assert.equal(result.captureSelector, '[data-testid="prediction-login-required-dialog"]');
  assert.throws(
    () => resolveComponentStateAdapter('login-required.dialog', {
      componentId: 'src/components/LoginRequiredDialog.tsx#LoginRequiredDialog',
      states: { permissions: 'user' },
      variants: {},
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('verification-required-dialog covers portal, permission, mode, and copy presets', () => {
  const security = resolveComponentStateAdapter('verification-required.dialog', {
    componentId: 'src/components/VerificationRequiredDialog.tsx#VerificationRequiredDialog',
    states: { data: 'single', permissions: 'user' },
    variants: { copyPreset: 'advanced-security', mode: 'security' },
  });
  assert.equal(security.props.isOpen, true);
  assert.equal(security.props.mode, 'security');
  assert.equal(security.props.title, '고급 설정 진입');
  assert.match(JSON.stringify(security.props.description), /탈퇴 예약/);
  assert.equal(security.props.confirmLabel, '고급 설정 진입');
  assert.equal(typeof security.props.onClose, 'function');
  assert.equal(typeof security.props.onConfirm, 'function');
  assert.equal(security.captureSelector, '[data-testid="verification-required-dialog"]');

  const unbroken = resolveComponentStateAdapter('verification-required.dialog', {
    componentId: 'src/components/VerificationRequiredDialog.tsx#VerificationRequiredDialog',
    states: { data: 'unbroken-token', permissions: 'user-unverified' },
    variants: { copyPreset: 'none', mode: 'normal' },
  });
  assert.equal(unbroken.props.title, 'T'.repeat(120));
  assert.equal(unbroken.props.description, 'D'.repeat(220));
  assert.equal(unbroken.props.confirmLabel, 'C'.repeat(96));

  const defaults = resolveComponentStateAdapter('verification-required.dialog', {
    componentId: 'src/components/VerificationRequiredDialog.tsx#VerificationRequiredDialog',
    states: { data: 'null-optional', permissions: 'user-unverified' },
    variants: { copyPreset: 'none', mode: 'normal' },
  });
  assert.equal(defaults.props.title, undefined);
  assert.equal(defaults.props.description, undefined);
  assert.equal(defaults.props.confirmLabel, undefined);

  assert.throws(
    () => resolveComponentStateAdapter('verification-required.dialog', {
      componentId: 'src/components/VerificationRequiredDialog.tsx#VerificationRequiredDialog',
      states: { data: 'null-optional', permissions: 'anonymous' },
      variants: { copyPreset: 'none', mode: 'normal' },
    }),
    /지원하지 않는 Visual QA state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('verification-required.dialog', {
      componentId: 'src/components/VerificationRequiredDialog.tsx#VerificationRequiredDialog',
      states: { data: 'empty', permissions: 'user-unverified' },
      variants: { copyPreset: 'none', mode: 'normal' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('viewport-deferred covers fallback and entered content with stress copy', () => {
  const fallback = resolveComponentStateAdapter('viewport-deferred', {
    componentId: 'src/components/ViewportDeferred.tsx#ViewportDeferred',
    states: { data: 'unbroken-token' },
    variants: { phase: 'fallback' },
  });
  assert.equal(fallback.props.containerTestId, 'visual-qa-viewport-deferred');
  assert.equal(
    fallback.captureSelector,
    '[data-testid="visual-qa-viewport-deferred"] [data-vqa-deferred-slot="fallback"]',
  );
  assert.equal((fallback.props.fallback as { type: unknown }).type, 'div');
  assert.equal((fallback.props.children as { type: unknown }).type, 'div');
  assert.match(JSON.stringify(fallback.props.fallback), /F{80}/);
  assert.match(JSON.stringify(fallback.props.children), /C{80}/);

  const entered = resolveComponentStateAdapter('viewport-deferred', {
    componentId: 'src/components/ViewportDeferred.tsx#ViewportDeferred',
    states: { data: 'long-korean' },
    variants: { phase: 'content' },
  });
  assert.match(JSON.stringify(entered.props.children), /지연된 실제 콘텐츠/);
  assert.match(String(entered.props.className), /min-w-0/);
  assert.equal(
    entered.captureSelector,
    '[data-testid="visual-qa-viewport-deferred"] [data-vqa-deferred-slot="content"]',
  );

  assert.throws(
    () => resolveComponentStateAdapter('viewport-deferred', {
      componentId: 'src/components/ViewportDeferred.tsx#ViewportDeferred',
      states: { data: 'empty' },
      variants: { phase: 'content' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('welcome-guide covers the loaded and broken logo branches', () => {
  const loaded = resolveComponentStateAdapter('welcome-guide', {
    componentId: 'src/components/WelcomeGuide.tsx#WelcomeGuide',
    states: { data: 'populated' },
    variants: {},
  });
  assert.equal(loaded.props.logoSrc, undefined);
  assert.equal(loaded.captureSelector, '[data-testid="home-onboarding-inline"]');
  assert.match(loaded.surfaceClassName ?? '', /\bp-0\b/);

  const broken = resolveComponentStateAdapter('welcome-guide', {
    componentId: 'src/components/WelcomeGuide.tsx#WelcomeGuide',
    states: { data: 'broken-image' },
    variants: {},
  });
  assert.match(String(broken.props.logoSrc), /^data:image\/png;base64,/);

  assert.throws(
    () => resolveComponentStateAdapter('welcome-guide', {
      componentId: 'src/components/WelcomeGuide.tsx#WelcomeGuide',
      states: { data: 'empty' },
      variants: {},
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('leaderboard-page keeps the code-split fallback and resolved runtime distinct', () => {
  const fallback = resolveComponentStateAdapter('leaderboard-page', {
    componentId: 'src/pages/LeaderboardPage.tsx#LeaderboardPage',
    states: {},
    variants: { phase: 'fallback' },
  });
  assert.equal(typeof fallback.props.runtimeLoader, 'function');
  assert.equal(fallback.captureSelector, '[data-testid="leaderboard-page-loading-fallback"]');

  const resolved = resolveComponentStateAdapter('leaderboard-page', {
    componentId: 'src/pages/LeaderboardPage.tsx#LeaderboardPage',
    states: {},
    variants: { phase: 'resolved' },
  });
  assert.equal(resolved.props.runtimeLoader, undefined);
  assert.equal(resolved.captureSelector, '[data-vqa-harness-surface]');
  assert.match(resolved.surfaceClassName ?? '', /\bp-0\b/);

  assert.throws(
    () => resolveComponentStateAdapter('leaderboard-page', {
      componentId: 'src/pages/LeaderboardPage.tsx#LeaderboardPage',
      states: {},
      variants: { phase: 'error' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
});

test('root-entry-route keeps cold-start and persisted-auth lazy boundaries deterministic', () => {
  const coldFallback = resolveComponentStateAdapter('root-entry-route', {
    componentId: 'src/components/RootEntryRoute.tsx#RootEntryRoute',
    states: {},
    variants: { routeMode: 'cold-start', phase: 'fallback' },
  });
  assert.equal(coldFallback.props.shouldUseAuthAwareRouteOverride, false);
  assert.equal(typeof coldFallback.props.landingLoader, 'function');
  assert.equal(coldFallback.props.authAwareRouteLoader, undefined);
  assert.equal(coldFallback.captureSelector, '[data-testid="root-entry-route-loading-fallback"]');

  const coldResolved = resolveComponentStateAdapter('root-entry-route', {
    componentId: 'src/components/RootEntryRoute.tsx#RootEntryRoute',
    states: {},
    variants: { routeMode: 'cold-start', phase: 'resolved' },
  });
  assert.equal(coldResolved.props.shouldUseAuthAwareRouteOverride, false);
  assert.equal(coldResolved.props.landingLoader, undefined);
  assert.equal(coldResolved.captureSelector, '[data-testid="landing-page"]');

  const persistedFallback = resolveComponentStateAdapter('root-entry-route', {
    componentId: 'src/components/RootEntryRoute.tsx#RootEntryRoute',
    states: {},
    variants: { routeMode: 'persisted-auth', phase: 'fallback' },
  });
  assert.equal(persistedFallback.props.shouldUseAuthAwareRouteOverride, true);
  assert.equal(typeof persistedFallback.props.authAwareRouteLoader, 'function');

  const persistedResolved = resolveComponentStateAdapter('root-entry-route', {
    componentId: 'src/components/RootEntryRoute.tsx#RootEntryRoute',
    states: {},
    variants: { routeMode: 'persisted-auth', phase: 'resolved' },
  });
  assert.equal(persistedResolved.props.shouldUseAuthAwareRouteOverride, true);
  assert.deepEqual(persistedResolved.props.authAwareStateOverride, {
    isAuthBootstrapPending: true,
    isAuthLoading: false,
    isLoggedIn: false,
  });
  assert.equal(persistedResolved.props.spinnerMinDurationMs, 0);
  assert.equal(persistedResolved.captureSelector, '[data-testid="root-entry-auth-loading"]');

  assert.throws(
    () => resolveComponentStateAdapter('root-entry-route', {
      componentId: 'src/components/RootEntryRoute.tsx#RootEntryRoute',
      states: {},
      variants: { routeMode: 'unknown', phase: 'resolved' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
});

test('root-entry-route-auth-aware covers bootstrap, landing, and redirect outcomes', () => {
  const bootstrap = resolveComponentStateAdapter('root-entry-route-auth-aware', {
    componentId: 'src/components/RootEntryRouteAuthAware.tsx#RootEntryRouteAuthAware',
    states: { permissions: 'anonymous' },
    variants: { authState: 'bootstrap-pending', phase: 'resolved' },
  });
  assert.deepEqual(bootstrap.props.authStateOverride, {
    isAuthBootstrapPending: true,
    isAuthLoading: false,
    isLoggedIn: false,
  });
  assert.equal(bootstrap.props.spinnerMinDurationMs, 0);
  assert.equal(bootstrap.captureSelector, '[data-testid="root-entry-auth-loading"]');

  const authLoading = resolveComponentStateAdapter('root-entry-route-auth-aware', {
    componentId: 'src/components/RootEntryRouteAuthAware.tsx#RootEntryRouteAuthAware',
    states: { permissions: 'anonymous' },
    variants: { authState: 'auth-loading', phase: 'resolved' },
  });
  assert.deepEqual(authLoading.props.authStateOverride, {
    isAuthBootstrapPending: false,
    isAuthLoading: true,
    isLoggedIn: false,
  });

  const landingFallback = resolveComponentStateAdapter('root-entry-route-auth-aware', {
    componentId: 'src/components/RootEntryRouteAuthAware.tsx#RootEntryRouteAuthAware',
    states: { permissions: 'anonymous' },
    variants: { authState: 'ready', phase: 'fallback' },
  });
  assert.equal(typeof landingFallback.props.landingLoader, 'function');
  assert.equal(landingFallback.captureSelector, '[data-testid="root-entry-landing-loading"]');

  const landingResolved = resolveComponentStateAdapter('root-entry-route-auth-aware', {
    componentId: 'src/components/RootEntryRouteAuthAware.tsx#RootEntryRouteAuthAware',
    states: { permissions: 'anonymous' },
    variants: { authState: 'ready', phase: 'resolved' },
  });
  assert.equal(landingResolved.props.landingLoader, undefined);
  assert.equal(landingResolved.captureSelector, '[data-testid="landing-page"]');

  const redirect = resolveComponentStateAdapter('root-entry-route-auth-aware', {
    componentId: 'src/components/RootEntryRouteAuthAware.tsx#RootEntryRouteAuthAware',
    states: { permissions: 'user' },
    variants: { authState: 'ready', phase: 'resolved' },
  });
  assert.deepEqual(redirect.props.authStateOverride, {
    isAuthBootstrapPending: false,
    isAuthLoading: false,
    isLoggedIn: true,
  });
  assert.equal(redirect.captureSelector, '[data-vqa-harness-surface]');
  assert.equal(redirect.expectedPathname, '/home');
  assert.match(redirect.surfaceClassName ?? '', /\bmin-h-48\b/);

  assert.throws(
    () => resolveComponentStateAdapter('root-entry-route-auth-aware', {
      componentId: 'src/components/RootEntryRouteAuthAware.tsx#RootEntryRouteAuthAware',
      states: { permissions: 'user' },
      variants: { authState: 'bootstrap-pending', phase: 'resolved' },
    }),
    /지원하지 않는 Visual QA state\/variant 조합/,
  );
});

test('leaderboard-page-runtime resolves public data and authenticated lazy phases deterministically', () => {
  const anonymous = resolveComponentStateAdapter('leaderboard-page-runtime', {
    componentId: 'src/pages/LeaderboardPageRuntime.tsx#LeaderboardPageRuntime',
    states: { data: 'populated', permissions: 'anonymous' },
    variants: { authPhase: 'public' },
  });
  assert.deepEqual(anonymous.props.authStateOverride, {
    currentUserHandle: undefined,
    isAuthLoading: false,
    isLoggedIn: false,
  });
  assert.equal((anonymous.props.leaderboardStateOverride as { leaderboard: unknown[] }).leaderboard.length, 3);
  assert.equal(anonymous.props.deferFooter, false);
  assert.equal(anonymous.props.authenticatedRuntimeLoader, undefined);
  assert.equal(anonymous.captureSelector, '[data-testid="leaderboard-page-runtime"]');

  const fallback = resolveComponentStateAdapter('leaderboard-page-runtime', {
    componentId: 'src/pages/LeaderboardPageRuntime.tsx#LeaderboardPageRuntime',
    states: { data: 'maximum-supported', permissions: 'user' },
    variants: { authPhase: 'authenticated-fallback' },
  });
  assert.equal(typeof fallback.props.authenticatedRuntimeLoader, 'function');
  assert.equal(
    (fallback.props.leaderboardStateOverride as { leaderboard: unknown[] }).leaderboard.length,
    10,
  );

  const resolved = resolveComponentStateAdapter('leaderboard-page-runtime', {
    componentId: 'src/pages/LeaderboardPageRuntime.tsx#LeaderboardPageRuntime',
    states: { data: 'broken-image', permissions: 'user' },
    variants: { authPhase: 'authenticated-resolved' },
  });
  assert.equal(resolved.props.authenticatedRuntimeLoader, undefined);
  assert.equal(
    (resolved.props.authenticatedStateOverride as { powerups: { MAGIC_BAT: number } })
      .powerups.MAGIC_BAT,
    2,
  );
  assert.match(
    String((resolved.props.leaderboardStateOverride as {
      leaderboard: Array<{ profileImageUrl: string }>;
    }).leaderboard[0]?.profileImageUrl),
    /^data:image\/png;base64,/,
  );

  assert.throws(
    () => resolveComponentStateAdapter('leaderboard-page-runtime', {
      componentId: 'src/pages/LeaderboardPageRuntime.tsx#LeaderboardPageRuntime',
      states: { data: 'empty', permissions: 'anonymous' },
      variants: { authPhase: 'authenticated-resolved' },
    }),
    /지원하지 않는 Visual QA state\/variant 조합/,
  );
});

test('retro leaderboard rules overlay exposes an isolated capture surface', () => {
  const result = resolveComponentStateAdapter('retro.leaderboard-rules-overlay', {
    componentId: 'src/components/retro/RetroLeaderboardRulesOverlay.tsx#RetroLeaderboardRulesOverlay',
    states: {},
    variants: {},
  });
  assert.equal(typeof result.props.onClose, 'function');
  assert.equal(result.captureSelector, '[data-testid="retro-leaderboard-rules-overlay"]');
  assert.match(result.surfaceClassName ?? '', /\brelative\b/);
  assert.match(result.surfaceClassName ?? '', /h-\[620px\]/);
});

test('retro leaderboard primitive adapters resolve bounded visual equivalence classes', () => {
  const decorations = resolveComponentStateAdapter('retro.leaderboard-decorations', {
    componentId: 'src/components/retro/RetroLeaderboardDecorations.tsx#RetroLeaderboardDecorations',
    states: {},
    variants: {},
  });
  assert.deepEqual(decorations.props, {});
  assert.equal(
    decorations.captureSelector,
    '[data-testid="retro-leaderboard-decorations"]',
  );

  const compactHall = resolveComponentStateAdapter('retro.level-badge', {
    componentId: 'src/components/retro/LevelBadge.tsx#LevelBadge',
    states: { data: 'boundary-maximum' },
    variants: { compact: 'true', showTitle: 'false', tier: 'hall' },
  });
  assert.deepEqual(compactHall.props, {
    className: undefined,
    compact: true,
    containerTestId: 'retro-level-badge',
    level: 999,
    showTitle: false,
  });
  assert.equal(compactHall.captureSelector, '[data-testid="retro-level-badge"]');

  const overflowBar = resolveComponentStateAdapter('retro.pixel-progress-bar', {
    componentId: 'src/components/retro/PixelProgressBar.tsx#PixelProgressBar',
    states: { data: 'overflow' },
    variants: { color: 'custom', label: 'unbroken-token', size: 'sm' },
  });
  assert.equal(overflowBar.props.value, 160);
  assert.equal(overflowBar.props.max, 100);
  assert.equal(overflowBar.props.color, '#ff00ff');
  assert.equal(overflowBar.props.showLabel, true);
  assert.match(String(overflowBar.props.label), /^PROGRESS-/);
  assert.equal(overflowBar.props.size, 'sm');
  assert.equal(overflowBar.captureSelector, '[data-testid="retro-pixel-progress-bar"]');
});

test('retro leaderboard row adapter resolves every independent visual axis', () => {
  const maximum = resolveComponentStateAdapter('retro.leaderboard-row', {
    componentId: 'src/components/retro/LeaderboardRow.tsx#LeaderboardRow',
    states: { data: 'maximum-supported', interactions: 'hover' },
    variants: { currentUser: 'true', rankChange: 'up', rankTier: 'first' },
  });
  const maximumEntry = maximum.props.entry as { rankChange?: number; score: number };
  assert.equal(maximum.props.rank, 1);
  assert.equal(maximumEntry.score, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumEntry.rankChange, 3);
  assert.equal(maximum.props.isCurrentUser, true);
  assert.equal(maximum.props.containerTestId, 'retro-leaderboard-row');
  assert.equal(maximum.captureSelector, '[data-testid="retro-leaderboard-row"]');

  const brokenImage = resolveComponentStateAdapter('retro.leaderboard-row', {
    componentId: 'src/components/retro/LeaderboardRow.tsx#LeaderboardRow',
    states: { data: 'broken-image', interactions: 'default' },
    variants: { currentUser: 'false', rankChange: 'steady', rankTier: 'other' },
  });
  const brokenImageEntry = brokenImage.props.entry as { profileImageUrl?: string };
  assert.match(String(brokenImageEntry.profileImageUrl), /^data:image\/png;base64/);
});

test('retro combo animation adapter freezes time and particles across numeric boundaries', () => {
  const result = resolveComponentStateAdapter('retro.combo-animation', {
    componentId: 'src/components/retro/ComboAnimation.tsx#ComboAnimation',
    states: { data: 'maximum-supported' },
    variants: { score: 'maximum', streakTier: 'legendary' },
  });
  assert.equal(result.props.streak, Number.MAX_SAFE_INTEGER);
  assert.equal(result.props.score, Number.MAX_SAFE_INTEGER);
  assert.equal(result.props.show, true);
  assert.equal(result.props.autoHideMs, null);
  assert.equal(result.props.containerTestId, 'retro-combo-animation');
  assert.equal((result.props.particleRandom as () => number)(), 0.25);
  assert.equal(result.captureSelector, '[data-testid="retro-combo-animation"]');
});

test('retro rank badge adapter separates rank styling from stress copy', () => {
  const result = resolveComponentStateAdapter('retro.rank-badge', {
    componentId: 'src/components/retro/RetroTheme.tsx#RankBadge',
    states: { data: 'unbroken-token' },
    variants: { rankTier: 'other' },
  });
  assert.equal(result.props.$rank, 4);
  assert.equal(result.props['data-testid'], 'retro-rank-badge');
  assert.match(String(result.props.children), /^RANK-/);
  assert.equal(result.captureSelector, '[data-testid="retro-rank-badge"]');
});

test('retro numeric primitive adapters preserve visual branches and stress values', () => {
  const pixelNumber = resolveComponentStateAdapter('retro.pixel-number', {
    componentId: 'src/components/retro/RetroTheme.tsx#PixelNumber',
    states: { data: 'maximum-supported' },
    variants: { color: 'custom' },
  });
  assert.equal(pixelNumber.props.$color, '#00ffff');
  assert.equal(pixelNumber.props.children, String(Number.MAX_SAFE_INTEGER));
  assert.equal(pixelNumber.props['data-testid'], 'retro-pixel-number');
  assert.equal(pixelNumber.captureSelector, '[data-testid="retro-pixel-number"]');

  const scoreDisplay = resolveComponentStateAdapter('retro.score-display', {
    componentId: 'src/components/retro/RetroTheme.tsx#ScoreDisplay',
    states: { data: 'unbroken-token' },
    variants: { animate: 'true' },
  });
  assert.equal(scoreDisplay.props.$animate, true);
  assert.match(String(scoreDisplay.props.children), /^SCORE-/);
  assert.equal(scoreDisplay.props['data-testid'], 'retro-score-display');
  assert.equal(scoreDisplay.captureSelector, '[data-testid="retro-score-display"]');
});

test('retro streak counter adapter crosses every style threshold independently of copy', () => {
  const result = resolveComponentStateAdapter('retro.streak-counter', {
    componentId: 'src/components/retro/RetroTheme.tsx#StreakCounter',
    states: { data: 'maximum-supported' },
    variants: { label: 'long-korean', streakTier: 'fire' },
  });
  assert.equal(result.props.$streak, Number.MAX_SAFE_INTEGER);
  assert.match(String(result.props.children), /연승 기록/);
  assert.equal(result.props['data-testid'], 'retro-streak-counter');
  assert.equal(result.captureSelector, '[data-testid="retro-streak-counter"]');
});

test('retro text effect adapters freeze animation without reducing text pressure states', () => {
  const flicker = resolveComponentStateAdapter('retro.flicker-text', {
    componentId: 'src/components/retro/RetroTheme.tsx#FlickerText',
    states: { data: 'unbroken-token' },
    variants: { active: 'true' },
  });
  assert.equal(flicker.props.$active, true);
  assert.match(String(flicker.props.children), /^FLICKER-/);
  assert.deepEqual(flicker.props.style, { animationPlayState: 'paused' });
  assert.equal(flicker.captureSelector, '[data-testid="retro-flicker-text"]');

  const glitch = resolveComponentStateAdapter('retro.glitch-wrapper', {
    componentId: 'src/components/retro/RetroTheme.tsx#GlitchWrapper',
    states: { data: 'long-korean' },
    variants: { active: 'false' },
  });
  assert.equal(glitch.props.$active, false);
  assert.match(String(glitch.props.children), /모바일/);
  assert.equal(glitch.props['data-testid'], 'retro-glitch-wrapper');
  assert.equal(glitch.captureSelector, '[data-testid="retro-glitch-wrapper"]');

  const dotMatrix = resolveComponentStateAdapter('retro.dot-matrix-text', {
    componentId: 'src/components/retro/RetroTheme.tsx#DotMatrixText',
    states: { data: 'single' },
    variants: {},
  });
  assert.equal(dotMatrix.props.children, '도트 매트릭스');
  assert.deepEqual(dotMatrix.props.style, { animationPlayState: 'paused' });
  assert.equal(dotMatrix.captureSelector, '[data-testid="retro-dot-matrix-text"]');
});

test('remaining retro theme primitive adapters preserve content pressure and visual branches', () => {
  const animatedCrown = resolveComponentStateAdapter('retro.animated-crown', {
    componentId: 'src/components/retro/RetroTheme.tsx#AnimatedCrown',
    states: { data: 'unbroken-token' },
    variants: {},
  });
  assert.match(String(animatedCrown.props.children), /^CROWN-/);
  assert.deepEqual(animatedCrown.props.style, { animationPlayState: 'paused' });
  assert.equal(animatedCrown.captureSelector, '[data-testid="retro-animated-crown"]');

  const pixelCrown = resolveComponentStateAdapter('retro.pixel-crown', {
    componentId: 'src/components/retro/RetroTheme.tsx#PixelCrown',
    states: { data: 'single' },
    variants: {},
  });
  assert.equal(pixelCrown.props.children, '♛');
  assert.deepEqual(pixelCrown.props.style, { animationPlayState: 'paused' });

  const emptyState = resolveComponentStateAdapter('retro.pixel-empty-state', {
    componentId: 'src/components/retro/RetroTheme.tsx#PixelEmptyState',
    states: { data: 'long-korean' },
    variants: {},
  });
  assert.match(String(emptyState.props.children), /모바일/);
  assert.equal(emptyState.captureSelector, '[data-testid="retro-pixel-empty-state"]');

  const button = resolveComponentStateAdapter('retro.retro-button', {
    componentId: 'src/components/retro/RetroTheme.tsx#RetroButton',
    states: { data: 'long-korean', interactions: 'focus-visible' },
    variants: { disabled: 'false', tone: 'danger' },
  });
  assert.equal(button.props.$variant, 'danger');
  assert.equal(button.props.disabled, false);
  assert.match(String(button.props.children), /모바일/);
  assert.equal(button.captureSelector, undefined);

  const card = resolveComponentStateAdapter('retro.retro-card', {
    componentId: 'src/components/retro/RetroTheme.tsx#RetroCard',
    states: { data: 'unbroken-token' },
    variants: { glow: 'custom' },
  });
  assert.equal(card.props.$glow, true);
  assert.equal(card.props.$glowColor, '#ff66ff');
  assert.match(String(card.props.children), /^CARD-/);
  assert.deepEqual(card.props.style, { animationPlayState: 'paused' });

  const container = resolveComponentStateAdapter('retro.retro-container', {
    componentId: 'src/components/retro/RetroTheme.tsx#RetroContainer',
    states: { data: 'single' },
    variants: {},
  });
  assert.equal(container.props.children, '레트로 컨테이너');
  assert.equal(container.captureSelector, '[data-testid="retro-container"]');

  const divider = resolveComponentStateAdapter('retro.retro-divider', {
    componentId: 'src/components/retro/RetroTheme.tsx#RetroDivider',
    states: {},
    variants: {},
  });
  assert.equal(divider.props['data-testid'], 'retro-divider');
  assert.equal(divider.captureSelector, '[data-testid="retro-divider"]');
});

test('retro ticker and footer adapters cover motion, content pressure, and child inventory states', () => {
  const ticker = resolveComponentStateAdapter('retro.news-ticker', {
    componentId: 'src/components/retro/NewsTicker.tsx#NewsTicker',
    states: { data: 'unbroken-token', interactions: 'hover' },
    variants: { speed: 'fast', type: 'perfect' },
  });
  assert.equal(ticker.props.speed, 200);
  assert.equal(ticker.props.containerTestId, 'retro-news-ticker');
  assert.equal((ticker.props.messages as Array<{ type: string }>)[0]?.type, 'perfect');
  assert.match(
    String((ticker.props.messages as Array<{ text: string }>)[0]?.text),
    /^TICKER-/,
  );
  assert.equal(ticker.captureSelector, '[data-testid="retro-news-ticker"]');

  const footer = resolveComponentStateAdapter('retro.leaderboard-footer-panels', {
    componentId: 'src/components/retro/RetroLeaderboardFooterPanels.tsx#RetroLeaderboardFooterPanels',
    states: { data: 'maximum-supported' },
    variants: { handler: 'present', inventory: 'active' },
  });
  assert.equal(footer.props.containerTestId, 'retro-leaderboard-footer-panels');
  assert.equal(typeof footer.props.onUsePowerup, 'function');
  assert.equal((footer.props.hotStreaks as Array<{ streak: number }>)[0]?.streak, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(footer.props.activePowerups, ['MAGIC_BAT']);
  assert.equal(footer.captureSelector, '[data-testid="retro-leaderboard-footer-panels"]');
});

test('retro power-up inventory adapter maps exhaustive inventory inputs and interaction outcomes', async () => {
  const errorResult = resolveComponentStateAdapter('retro.power-up-inventory', {
    componentId: 'src/components/retro/PowerUpInventory.tsx#PowerUpInventory',
    states: { interactions: 'selected' },
    variants: {
      activeSet: 'magic-bat-scouter',
      disabled: 'true',
      goldenGloveCount: '1',
      handler: 'error',
      magicBatCount: 'max',
      scouterCount: '0',
    },
    interactionTargetId: 'golden-glove-error',
  });
  assert.deepEqual(errorResult.props.powerups, {
    MAGIC_BAT: Number.MAX_SAFE_INTEGER,
    GOLDEN_GLOVE: 1,
    SCOUTER: 0,
  });
  assert.deepEqual(errorResult.props.activePowerups, ['MAGIC_BAT', 'SCOUTER']);
  assert.equal(errorResult.props.disabled, true);
  assert.equal(errorResult.props.containerTestId, 'retro-powerup-inventory');
  assert.equal(errorResult.captureSelector, '[data-testid="retro-powerup-modal-content"]');
  await assert.rejects(
    (errorResult.props.onUsePowerup as (type: string) => Promise<void>)('GOLDEN_GLOVE'),
    /Visual QA power-up use failed/,
  );

  const missing = resolveComponentStateAdapter('retro.power-up-inventory', {
    componentId: 'src/components/retro/PowerUpInventory.tsx#PowerUpInventory',
    states: { interactions: 'default' },
    variants: {
      activeSet: 'none',
      disabled: 'false',
      goldenGloveCount: '0',
      handler: 'missing',
      magicBatCount: '0',
      scouterCount: '0',
    },
  });
  assert.equal(missing.props.onUsePowerup, undefined);
  assert.equal(missing.captureSelector, '[data-testid="retro-powerup-inventory"]');

  const success = resolveComponentStateAdapter('retro.power-up-inventory', {
    componentId: 'src/components/retro/PowerUpInventory.tsx#PowerUpInventory',
    states: { interactions: 'selected' },
    variants: {
      activeSet: 'none',
      disabled: 'false',
      goldenGloveCount: '1',
      handler: 'success',
      magicBatCount: '1',
      scouterCount: '1',
    },
    interactionTargetId: 'magic-bat-success',
  });
  await (success.props.onUsePowerup as (type: string) => Promise<void>)('MAGIC_BAT');
  assert.equal(success.captureSelector, '[data-testid="retro-powerup-inventory"]');

  assert.throws(
    () => resolveComponentStateAdapter('retro.power-up-inventory', {
      componentId: 'src/components/retro/PowerUpInventory.tsx#PowerUpInventory',
      states: { interactions: 'open' },
      variants: {
        activeSet: 'none',
        disabled: 'false',
        goldenGloveCount: '0',
        handler: 'idle',
        magicBatCount: 'not-declared',
        scouterCount: '0',
      },
      interactionTargetId: 'magic-bat-open',
    }),
    /지원하지 않는 Visual QA variant: magicBatCount=not-declared/,
  );
});

test('retro user stats panel adapter maps every composite visual slot independently', () => {
  const maximum = resolveComponentStateAdapter('retro.user-stats-panel', {
    componentId: 'src/components/retro/UserStatsPanel.tsx#UserStatsPanel',
    states: { data: 'populated' },
    variants: {
      identity: 'unbroken-token-broken-image',
      metrics: 'maximum-supported',
      rank: 'maximum-supported',
      streak: 'maximum-supported',
      xp: 'maximum-supported',
    },
  });
  const maximumStats = maximum.props.stats as Record<string, unknown>;
  assert.match(String(maximumStats.userName), /^USER-/);
  assert.match(String(maximumStats.profileImageUrl), /^data:image\/png;base64,/);
  assert.equal(maximumStats.rank, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumStats.currentStreak, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumStats.maxStreak, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumStats.seasonScore, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumStats.totalScore, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumStats.level, 999);
  assert.equal(maximumStats.experiencePoints, Number.MAX_SAFE_INTEGER);
  assert.equal(maximum.props.containerTestId, 'retro-user-stats-panel');
  assert.equal(maximum.captureSelector, '[data-testid="retro-user-stats-panel"]');

  const nullOptional = resolveComponentStateAdapter('retro.user-stats-panel', {
    componentId: 'src/components/retro/UserStatsPanel.tsx#UserStatsPanel',
    states: { data: 'populated' },
    variants: {
      identity: 'missing-image',
      metrics: 'zero-null',
      rank: 'first',
      streak: 'none',
      xp: 'rookie-start',
    },
  });
  const nullStats = nullOptional.props.stats as Record<string, unknown>;
  assert.equal(nullStats.profileImageUrl, undefined);
  assert.equal(nullStats.accuracy, undefined);
  assert.equal(nullStats.currentStreak, 0);
  assert.equal(nullStats.level, 1);
  assert.equal(nullStats.experiencePoints, 0);

  assert.throws(
    () => resolveComponentStateAdapter('retro.user-stats-panel', {
      componentId: 'src/components/retro/UserStatsPanel.tsx#UserStatsPanel',
      states: { data: 'populated' },
      variants: {
        identity: 'not-declared',
        metrics: 'normal',
        rank: 'regular',
        streak: 'low',
        xp: 'minor-partial',
      },
    }),
    /지원하지 않는 Visual QA variant: identity=not-declared/,
  );
});

test('review dialog adapter validates identity, comment, permission, and pending submission states', () => {
  const pending = resolveComponentStateAdapter('review.dialog', {
    componentId: 'src/components/ReviewDialog.tsx#ReviewDialog',
    states: {
      data: 'single',
      permissions: 'user',
      interactions: 'submitting',
    },
    variants: {
      reviewee: 'unbroken-token',
      comment: 'unbroken-200',
    },
  });
  assert.equal(pending.props.isOpen, true);
  assert.match(String((pending.props.reviewee as { name: string }).name), /^REVIEWEE-X{100}/);
  assert.equal(typeof pending.props.submitReview, 'function');
  assert.equal(pending.captureSelector, '[data-testid="review-dialog"]');

  const idle = resolveComponentStateAdapter('review.dialog', {
    componentId: 'src/components/ReviewDialog.tsx#ReviewDialog',
    states: {
      data: 'single',
      permissions: 'user',
      interactions: 'default',
    },
    variants: {
      reviewee: 'normal',
      comment: 'empty',
    },
  });
  assert.equal(idle.props.submitReview, undefined);
  assert.equal((idle.props.reviewee as { name: string }).name, '비주얼 QA');

  assert.throws(
    () => resolveComponentStateAdapter('review.dialog', {
      componentId: 'src/components/ReviewDialog.tsx#ReviewDialog',
      states: {
        data: 'single',
        permissions: 'anonymous',
        interactions: 'default',
      },
      variants: {
        reviewee: 'normal',
        comment: 'empty',
      },
    }),
    /지원하지 않는 Visual QA state: permissions=anonymous/,
  );
});

test('rolling number adapter maps numeric boundaries and deterministic transition frames', () => {
  const increase = resolveComponentStateAdapter('rolling.number', {
    componentId: 'src/components/RollingNumber.tsx#RollingNumber',
    states: { data: 'boundary-maximum' },
    variants: { phase: 'increase' },
  });
  assert.equal(increase.props.value, 100);
  assert.deepEqual(increase.props.transitionPreview, { from: 99, progress: 0.5 });
  assert.equal(increase.captureSelector, '[data-testid="rolling-number"]');
  assert.match(increase.surfaceClassName ?? '', /max-w-\[320px\]/);

  const decrease = resolveComponentStateAdapter('rolling.number', {
    componentId: 'src/components/RollingNumber.tsx#RollingNumber',
    states: { data: 'boundary-minimum' },
    variants: { phase: 'decrease' },
  });
  assert.equal(decrease.props.value, 99);
  assert.deepEqual(decrease.props.transitionPreview, { from: 100, progress: 0.5 });

  const stable = resolveComponentStateAdapter('rolling.number', {
    componentId: 'src/components/RollingNumber.tsx#RollingNumber',
    states: { data: 'maximum-supported' },
    variants: { phase: 'stable' },
  });
  assert.equal(stable.props.value, Number.MAX_SAFE_INTEGER);
  assert.equal(stable.props.transitionPreview, undefined);

  assert.throws(
    () => resolveComponentStateAdapter('rolling.number', {
      componentId: 'src/components/RollingNumber.tsx#RollingNumber',
      states: { data: 'maximum-supported' },
      variants: { phase: 'decrease' },
    }),
    /지원하지 않는 Visual QA state\/variant 조합/,
  );
});

test('ui-alert-scenarios cover copy, composition, icon, and tone branches', () => {
  const alert = resolveComponentStateAdapter('ui.alert', {
    componentId: 'src/components/ui/alert.tsx#Alert',
    states: { data: 'long-korean' },
    variants: { content: 'both', leadingIcon: 'present', tone: 'destructive' },
  });
  assert.equal(alert.props.variant, 'destructive');
  const children = alert.props.children as Array<{ type: unknown; props: Record<string, unknown> }>;
  assert.equal(children.length, 3);
  assert.equal(children[0]?.type, 'svg');
  assert.match(String(children[1]?.props.children), /모바일 화면/);
  assert.match(String(children[2]?.props.children), /가로 스크롤/);

  const title = resolveComponentStateAdapter('ui.alert-title', {
    componentId: 'src/components/ui/alert.tsx#AlertTitle',
    states: { data: 'unbroken-token' },
    variants: {},
  });
  assert.equal(title.props.children, 'T'.repeat(120));

  const description = resolveComponentStateAdapter('ui.alert-description', {
    componentId: 'src/components/ui/alert.tsx#AlertDescription',
    states: { data: 'single' },
    variants: { structure: 'paragraph' },
  });
  assert.equal((description.props.children as { type: unknown }).type, 'p');
  assert.throws(
    () => resolveComponentStateAdapter('ui.alert', {
      componentId: 'src/components/ui/alert.tsx#Alert',
      states: { data: 'empty' },
      variants: { content: 'both', leadingIcon: 'present', tone: 'default' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('ui-card-scenarios cover content pressure, composition, action, and divider branches', () => {
  const card = resolveComponentStateAdapter('ui.card', {
    componentId: 'src/components/ui/card.tsx#Card',
    states: { data: 'long-korean' },
    variants: { composition: 'with-action' },
  });
  const cardChildren = card.props.children as Array<{
    props: { children?: Array<{ props?: Record<string, unknown> }> };
  }>;
  assert.equal(cardChildren.length, 3);
  assert.equal(cardChildren[0]?.props.children?.length, 3);
  assert.match(card.surfaceClassName ?? '', /max-w-\[320px\]/);

  const header = resolveComponentStateAdapter('ui.card-header', {
    componentId: 'src/components/ui/card.tsx#CardHeader',
    states: { data: 'unbroken-token' },
    variants: { action: 'present', divider: 'present' },
  });
  assert.equal(header.props.className, 'border-b');
  assert.equal((header.props.children as unknown[]).length, 3);

  const footer = resolveComponentStateAdapter('ui.card-footer', {
    componentId: 'src/components/ui/card.tsx#CardFooter',
    states: { data: 'single' },
    variants: { divider: 'present' },
  });
  assert.equal(footer.props.className, 'border-t');
  assert.equal((footer.props.children as unknown[]).length, 2);

  for (const adapterId of [
    'ui.card-action',
    'ui.card-content',
    'ui.card-description',
    'ui.card-title',
  ]) {
    const primitive = resolveComponentStateAdapter(adapterId, {
      componentId: `src/components/ui/card.tsx#${adapterId}`,
      states: { data: 'unbroken-token' },
      variants: {},
    });
    assert.match(String(primitive.props.children), /^CARD-/);
  }

  assert.throws(
    () => resolveComponentStateAdapter('ui.card', {
      componentId: 'src/components/ui/card.tsx#Card',
      states: { data: 'single' },
      variants: { composition: 'unknown' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
});

test('ui-page-primitive-scenarios cover copy, alignment, measure, gap, and optional description', () => {
  const header = resolveComponentStateAdapter('ui.page-section-header', {
    componentId: 'src/components/ui/page-primitives.tsx#SectionHeader',
    states: { data: 'unbroken-token' },
    variants: {
      align: 'center',
      description: 'present',
      measure: 'narrow',
    },
  });
  assert.equal(header.props.align, 'center');
  assert.equal(header.props.measure, 'narrow');
  assert.match(String(header.props.title), /^PAGE-TITLE-/);
  assert.match(String(header.props.description), /^PAGE-DESCRIPTION-/);

  const cta = resolveComponentStateAdapter('ui.page-cta-group', {
    componentId: 'src/components/ui/page-primitives.tsx#CTAGroup',
    states: { data: 'long-korean' },
    variants: { align: 'start' },
  });
  assert.equal(cta.props.align, 'start');
  assert.equal((cta.props.children as unknown[]).length, 2);

  const stack = resolveComponentStateAdapter('ui.page-stack', {
    componentId: 'src/components/ui/page-primitives.tsx#Stack',
    states: { data: 'single' },
    variants: { gap: 'xl' },
  });
  assert.equal(stack.props.gap, 'xl');
  assert.equal((stack.props.children as unknown[]).length, 3);

  const textBlock = resolveComponentStateAdapter('ui.page-text-block', {
    componentId: 'src/components/ui/page-primitives.tsx#TextBlock',
    states: { data: 'single' },
    variants: { align: 'start', measure: 'default' },
  });
  assert.equal(textBlock.props.align, 'start');
  assert.equal(textBlock.props.measure, 'default');

  for (const adapterId of [
    'ui.page-container',
    'ui.page-mockup-frame',
    'ui.page-section',
  ]) {
    const primitive = resolveComponentStateAdapter(adapterId, {
      componentId: adapterId,
      states: { data: 'unbroken-token' },
      variants: {},
    });
    assert.equal((primitive.props.children as unknown[]).length, 2);
    assert.match(primitive.surfaceClassName ?? '', /max-w-\[320px\]/);
  }
});

test('ui-table-scenarios declare semantic hosts and cover content, composition, and row states', () => {
  const table = resolveComponentStateAdapter('ui.table', {
    componentId: 'src/components/ui/table.tsx#Table',
    states: { data: 'long-korean' },
    variants: { caption: 'present', columns: 'wide', rows: 'maximum' },
  });
  assert.equal((table.props.children as unknown[]).length, 3);
  assert.equal(table.captureSelector, '[data-slot="table-container"]');

  const head = resolveComponentStateAdapter('ui.table-head', {
    componentId: 'src/components/ui/table.tsx#TableHead',
    states: { data: 'unbroken-token' },
    variants: { content: 'checkbox' },
  });
  assert.equal(head.semanticHost, 'table-header-row');
  assert.equal(head.captureSelector, '[data-slot="table-head"]');

  const cell = resolveComponentStateAdapter('ui.table-cell', {
    componentId: 'src/components/ui/table.tsx#TableCell',
    states: { data: 'single' },
    variants: { content: 'text' },
  });
  assert.equal(cell.semanticHost, 'table-body-row');

  const row = resolveComponentStateAdapter('ui.table-row', {
    componentId: 'src/components/ui/table.tsx#TableRow',
    interactionTargetId: 'row',
    states: { data: 'single', interactions: 'hover' },
    variants: { columns: 'compact', selected: 'true' },
  });
  assert.equal(row.semanticHost, 'table-body');
  assert.equal(row.props['data-state'], 'selected');
  assert.equal(row.props['data-testid'], 'visual-qa-table-row');

  assert.throws(
    () => resolveComponentStateAdapter('ui.table', {
      componentId: 'src/components/ui/table.tsx#Table',
      states: { data: 'single' },
      variants: { caption: 'missing', columns: 'unsupported', rows: 'one' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
});

test('ui-status-badge-scenarios cover copy pressure, appearance, live mode, and hover scope', () => {
  const hover = resolveComponentStateAdapter('ui.status-badge', {
    componentId: 'src/components/ui/status-badge.tsx#StatusBadge',
    interactionTargetId: 'hover-scope',
    states: { data: 'unbroken-token', interactions: 'hover' },
    variants: {
      customColors: 'default',
      live: 'hover',
      marker: 'diamond',
      size: 'xs',
      tone: 'danger',
      visualVariant: 'quiet',
    },
  });
  assert.match(String(hover.props.label), /^STATUS-BADGE-/);
  assert.equal(hover.props.live, true);
  assert.equal(hover.props.liveMode, 'hover');
  assert.equal(hover.props.marker, 'diamond');
  assert.equal(hover.props.size, 'xs');
  assert.equal(hover.props.tone, 'danger');
  assert.equal(hover.props.variant, 'quiet');
  assert.equal(hover.props['data-testid'], 'visual-qa-status-badge');
  assert.equal(hover.captureSelector, '[data-testid="visual-qa-status-badge"]');
  assert.match(hover.surfaceClassName ?? '', /status-badge-hover-scope/);
  assert.match(hover.surfaceClassName ?? '', /max-w-\[320px\]/);

  const filled = resolveComponentStateAdapter('ui.status-badge', {
    componentId: 'src/components/ui/status-badge.tsx#StatusBadge',
    states: { data: 'null-optional', interactions: 'default' },
    variants: {
      customColors: 'custom',
      live: 'always',
      marker: 'dot',
      size: 'md',
      tone: 'neutral',
      visualVariant: 'filled',
    },
  });
  assert.equal(filled.props.label, undefined);
  assert.equal(filled.props.dotColor, '#facc15');
  assert.equal(filled.props.filledTextColor, '#f8fafc');
  assert.equal(filled.props.variant, 'filled');

  assert.throws(
    () => resolveComponentStateAdapter('ui.status-badge', {
      componentId: 'src/components/ui/status-badge.tsx#StatusBadge',
      interactionTargetId: 'hover-scope',
      states: { data: 'single', interactions: 'hover' },
      variants: {
        customColors: 'default',
        live: 'off',
        marker: 'dot',
        size: 'sm',
        tone: 'neutral',
        visualVariant: 'quiet',
      },
    }),
    /지원하지 않는 Visual QA interaction state/,
  );
});

test('ui-input-scenarios cover native types, copy pressure, validation, and focus', () => {
  const number = resolveComponentStateAdapter('ui.input', {
    componentId: 'src/components/ui/input.tsx#Input',
    interactionTargetId: 'field',
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { availability: 'enabled', invalid: 'true', type: 'number' },
  });
  assert.equal(number.props.type, 'number');
  assert.equal(number.props.defaultValue, 42);
  assert.equal(number.props['aria-invalid'], true);
  assert.equal(number.props.disabled, false);
  assert.equal(number.props['data-testid'], 'visual-qa-input');
  assert.equal(number.captureSelector, '[data-testid="visual-qa-input"]');

  const file = resolveComponentStateAdapter('ui.input', {
    componentId: 'src/components/ui/input.tsx#Input',
    states: { data: 'empty', interactions: 'default' },
    variants: { availability: 'disabled', invalid: 'false', type: 'file' },
  });
  assert.equal(file.props.type, 'file');
  assert.equal(file.props.defaultValue, undefined);
  assert.equal(file.props.disabled, true);

  assert.throws(
    () => resolveComponentStateAdapter('ui.input', {
      componentId: 'src/components/ui/input.tsx#Input',
      interactionTargetId: 'field',
      states: { data: 'single', interactions: 'focus-visible' },
      variants: { availability: 'disabled', invalid: 'false', type: 'text' },
    }),
    /지원하지 않는 Visual QA interaction state/,
  );
});

test('ui-textarea-scenarios cover placeholder, input, validation, and autosize usage bounds', () => {
  const textarea = resolveComponentStateAdapter('ui.textarea', {
    componentId: 'src/components/ui/textarea.tsx#Textarea',
    interactionTargetId: 'field',
    states: { data: 'empty', interactions: 'input' },
    variants: { availability: 'enabled', invalid: 'true', placeholder: 'missing' },
  });
  assert.equal(textarea.props.defaultValue, '');
  assert.equal(textarea.props.placeholder, undefined);
  assert.equal(textarea.props['aria-invalid'], true);
  assert.equal(textarea.props['data-testid'], 'visual-qa-textarea');
  assert.equal(textarea.captureSelector, '[data-testid="visual-qa-textarea"]');

  const autosize = resolveComponentStateAdapter('ui.autosize-textarea', {
    componentId: 'src/components/ui/autosize-textarea.tsx#AutosizeTextarea',
    states: { data: 'long-korean', interactions: 'default' },
    variants: { availability: 'enabled', usage: 'write-modal' },
  });
  assert.equal(autosize.props.minRows, 8);
  assert.equal(autosize.props.maxRows, 15);
  assert.match(String(autosize.props.className), /min-h-\[150px\]/);
  assert.match(String(autosize.props.defaultValue), /모바일/);
  assert.equal(autosize.captureSelector, '[data-testid="visual-qa-autosize-textarea"]');

  assert.throws(
    () => resolveComponentStateAdapter('ui.autosize-textarea', {
      componentId: 'src/components/ui/autosize-textarea.tsx#AutosizeTextarea',
      interactionTargetId: 'field',
      states: { data: 'single', interactions: 'input' },
      variants: { availability: 'enabled', usage: 'composer' },
    }),
    /지원하지 않는 Visual QA interaction state/,
  );
});

test('ui-button-scenarios cover content pressure, native and as-child elements, and interactions', () => {
  const longButton = resolveComponentStateAdapter('ui.button', {
    componentId: 'src/components/ui/button.tsx#Button',
    interactionTargetId: 'control',
    states: { data: 'unbroken-token', interactions: 'focus-visible' },
    variants: {
      availability: 'enabled',
      content: 'trailing-icon',
      element: 'button',
      invalid: 'true',
      size: 'touchLg',
      variant: 'brandOutline',
    },
  });
  assert.equal(longButton.props.asChild, false);
  assert.equal(longButton.props.disabled, false);
  assert.equal(longButton.props['aria-invalid'], true);
  assert.equal(longButton.props.size, 'touchLg');
  assert.equal(longButton.props.variant, 'brandOutline');
  assert.ok(Array.isArray(longButton.props.children));
  assert.equal(longButton.captureSelector, '[data-testid="visual-qa-button"]');

  const plainLink = resolveComponentStateAdapter('ui.plain-button', {
    componentId: 'src/components/ui/plain-button.tsx#Button',
    interactionTargetId: 'control',
    states: { data: 'single', interactions: 'hover' },
    variants: {
      availability: 'enabled',
      content: 'icon-only',
      element: 'as-child-link',
      size: 'iconTouch',
      variant: 'ghost',
    },
  });
  assert.equal(plainLink.props.asChild, true);
  assert.equal(plainLink.props.disabled, undefined);
  assert.equal(plainLink.props['aria-label'], '다음 화면으로 이동');
  assert.equal(plainLink.props.size, 'iconTouch');
  assert.equal(plainLink.captureSelector, '[data-testid="visual-qa-plain-button"]');

  assert.throws(
    () => resolveComponentStateAdapter('ui.button', {
      componentId: 'src/components/ui/button.tsx#Button',
      states: { data: 'single', interactions: 'default' },
      variants: {
        availability: 'enabled',
        content: 'label-only',
        element: 'button',
        invalid: 'false',
        size: 'icon',
        variant: 'default',
      },
    }),
    /content\/size 조합/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('ui.plain-button', {
      componentId: 'src/components/ui/plain-button.tsx#Button',
      states: { data: 'single', interactions: 'default' },
      variants: {
        availability: 'disabled',
        content: 'label-only',
        element: 'as-child-link',
        size: 'default',
        variant: 'default',
      },
    }),
    /do not support disabled/,
  );
});

test('ui-profile-avatar-scenarios cover image fallbacks, public sizes, and ring branches', () => {
  const fixedImage = resolveComponentStateAdapter('ui.profile-avatar', {
    componentId: 'src/components/ui/ProfileAvatar.tsx#ProfileAvatar',
    states: { data: 'single' },
    variants: { dimensions: 'square-96', ring: 'cheerFeed' },
  });
  assert.equal(fixedImage.props.width, 96);
  assert.equal(fixedImage.props.height, 96);
  assert.equal(fixedImage.props.showRing, true);
  assert.equal(fixedImage.props.ringVariant, 'cheerFeed');
  assert.match(String(fixedImage.props.src), /^data:image\/svg\+xml/);
  assert.equal(
    fixedImage.captureSelector,
    '[data-testid="profile-avatar-frame"]',
  );

  const widthOnlyFallback = resolveComponentStateAdapter('ui.profile-avatar', {
    componentId: 'src/components/ui/ProfileAvatar.tsx#ProfileAvatar',
    states: { data: 'unbroken-token' },
    variants: { dimensions: 'width-only-40', ring: 'none' },
  });
  assert.equal(widthOnlyFallback.props.width, 40);
  assert.equal(widthOnlyFallback.props.height, undefined);
  assert.equal(widthOnlyFallback.props.showRing, false);
  assert.equal(widthOnlyFallback.props.src, null);
  assert.match(String(widthOnlyFallback.props.fallbackName), /^AVATAR-X{180}$/);
  assert.equal(
    widthOnlyFallback.captureSelector,
    '[data-testid="profile-avatar-image"], [data-testid="profile-avatar-fallback"]',
  );

  const customDecorative = resolveComponentStateAdapter('ui.profile-avatar', {
    componentId: 'src/components/ui/ProfileAvatar.tsx#ProfileAvatar',
    states: { data: 'null-optional' },
    variants: { dimensions: 'responsive-sm', ring: 'custom' },
  });
  assert.equal(customDecorative.props.alt, '');
  assert.equal(customDecorative.props.size, 'sm');
  assert.equal(customDecorative.props.showRing, true);
  assert.match(String(customDecorative.props.ringClassName), /bg-amber-300/);

  assert.throws(
    () => resolveComponentStateAdapter('ui.profile-avatar', {
      componentId: 'src/components/ui/ProfileAvatar.tsx#ProfileAvatar',
      states: { data: 'single' },
      variants: { dimensions: 'square-100', ring: 'none' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
});

test('ui-plain-dialog-scenarios cover placement, content pressure, header, footer, and close interactions', () => {
  const bottom = resolveComponentStateAdapter('ui.plain-dialog', {
    componentId: 'src/components/ui/plain-dialog.tsx#PlainDialog',
    interactionTargetId: 'close',
    states: { data: 'long-korean', interactions: 'focus-visible' },
    variants: {
      close: 'visible',
      footer: 'actions',
      header: 'full',
      placement: 'bottom',
    },
  });
  assert.equal(bottom.props.open, true);
  assert.equal(bottom.props.placement, 'bottom');
  assert.equal(bottom.props.hideHeader, false);
  assert.equal(bottom.props.hideCloseButton, false);
  assert.match(String(bottom.props.title), /모바일 화면/);
  assert.ok(Array.isArray(bottom.props.footer));
  assert.equal(bottom.captureSelector, '[data-testid="visual-qa-plain-dialog"]');

  const hidden = resolveComponentStateAdapter('ui.plain-dialog', {
    componentId: 'src/components/ui/plain-dialog.tsx#PlainDialog',
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: {
      close: 'hidden',
      footer: 'none',
      header: 'hidden',
      placement: 'right',
    },
  });
  assert.equal(hidden.props.placement, 'right');
  assert.equal(hidden.props.hideHeader, true);
  assert.equal(hidden.props.hideCloseButton, true);
  assert.equal(hidden.props.footer, undefined);

  assert.throws(
    () => resolveComponentStateAdapter('ui.plain-dialog', {
      componentId: 'src/components/ui/plain-dialog.tsx#PlainDialog',
      interactionTargetId: 'close',
      states: { data: 'single', interactions: 'hover' },
      variants: {
        close: 'hidden',
        footer: 'none',
        header: 'full',
        placement: 'center',
      },
    }),
    /plain dialog interaction/,
  );
});

test('ui-plain-menu-scenarios cover open state, alignment, density, semantics, and trigger interactions', () => {
  const openDialog = resolveComponentStateAdapter('ui.plain-menu', {
    componentId: 'src/components/ui/plain-menu.tsx#PlainMenu',
    interactionTargetId: 'trigger',
    states: { data: 'unbroken-token', interactions: 'pressed' },
    variants: {
      align: 'end',
      density: 'maximum',
      open: 'open',
      role: 'dialog',
    },
  });
  assert.equal(openDialog.props.open, true);
  assert.equal(openDialog.props.align, 'end');
  assert.equal(openDialog.props.role, 'dialog');
  assert.equal(openDialog.props.ariaLabel, 'Visual QA 메뉴 대화상자');
  assert.equal(openDialog.captureSelector, '[data-vqa-harness-surface]');
  assert.match(openDialog.surfaceClassName ?? '', /justify-end/);
  assert.match(openDialog.surfaceClassName ?? '', /min-h-\[620px\]/);

  const closed = resolveComponentStateAdapter('ui.plain-menu', {
    componentId: 'src/components/ui/plain-menu.tsx#PlainMenu',
    states: { data: 'single', interactions: 'default' },
    variants: {
      align: 'start',
      density: 'one',
      open: 'closed',
      role: 'menu',
    },
  });
  assert.equal(closed.props.open, false);
  assert.equal(closed.captureSelector, '[data-testid="visual-qa-plain-menu-trigger"]');
  assert.match(closed.surfaceClassName ?? '', /justify-start/);

  assert.throws(
    () => resolveComponentStateAdapter('ui.plain-menu', {
      componentId: 'src/components/ui/plain-menu.tsx#PlainMenu',
      states: { data: 'long-korean', interactions: 'default' },
      variants: {
        align: 'start',
        density: 'one',
        open: 'closed',
        role: 'menu',
      },
    }),
    /closed plain menu data/,
  );
});

test('ui-calendar-scenarios cover month rows, day states, availability, outside days, and keyboard movement', () => {
  const calendar = resolveComponentStateAdapter('ui.calendar', {
    componentId: 'src/components/ui/calendar.tsx#Calendar',
    interactionTargetId: 'four-weeks-next-day',
    states: { interactions: 'keyboard-navigation' },
    variants: {
      availability: 'partial',
      dayState: 'selected-today',
      monthLayout: 'four-weeks',
      outsideDays: 'hidden',
    },
  });

  assert.equal((calendar.props.defaultMonth as Date).getFullYear(), 2026);
  assert.equal((calendar.props.defaultMonth as Date).getMonth(), 1);
  assert.equal((calendar.props.defaultMonth as Date).getDate(), 15);
  assert.equal((calendar.props.selected as Date).getTime(), (calendar.props.today as Date).getTime());
  assert.equal(calendar.props.showOutsideDays, false);
  assert.equal((calendar.props.disabled as (date: Date) => boolean)(new Date(2026, 1, 20)), false);
  assert.equal((calendar.props.disabled as (date: Date) => boolean)(new Date(2026, 1, 21)), true);
  assert.equal(calendar.captureSelector, '[aria-label="Visual QA 달력"]');
  assert.match(calendar.surfaceClassName ?? '', /max-w-\[340px\]/);

  const disabled = resolveComponentStateAdapter('ui.calendar', {
    componentId: 'src/components/ui/calendar.tsx#Calendar',
    interactionTargetId: 'next-month',
    states: { interactions: 'pressed' },
    variants: {
      availability: 'all-disabled',
      dayState: 'none',
      monthLayout: 'six-weeks',
      outsideDays: 'shown',
    },
  });
  assert.equal((disabled.props.disabled as (date: Date) => boolean)(new Date(2026, 7, 1)), true);
  assert.equal(disabled.props.selected, undefined);

  assert.throws(
    () => resolveComponentStateAdapter('ui.calendar', {
      componentId: 'src/components/ui/calendar.tsx#Calendar',
      interactionTargetId: 'six-weeks-next-day',
      states: { interactions: 'keyboard-navigation' },
      variants: {
        availability: 'all-disabled',
        dayState: 'today',
        monthLayout: 'six-weeks',
        outsideDays: 'shown',
      },
    }),
    /calendar interaction/,
  );
});

test('auth-primitives cover content pressure, optional copy, shell height, and every status tone', () => {
  const shell = resolveComponentStateAdapter('ui.auth-primitive', {
    componentId: 'src/components/ui/auth-primitives.tsx#AuthShell',
    states: { data: 'unbroken-token' },
    variants: { contentHeight: 'tall' },
  });
  assert.equal(shell.captureSelector, '[data-slot="auth-shell"]');
  assert.match(
    ((shell.props.children as { props: { className: string } }).props.className),
    /min-h-\[900px\]/,
  );

  const header = resolveComponentStateAdapter('ui.auth-primitive', {
    componentId: 'src/components/ui/auth-primitives.tsx#AuthHeader',
    states: { data: 'long-korean' },
    variants: { description: 'present' },
  });
  assert.match(String(header.props.title), /안전하게/);
  assert.match(String(header.props.description), /모바일 화면/);
  assert.equal(header.captureSelector, '[data-slot="auth-header"]');

  const fieldGroup = resolveComponentStateAdapter('ui.auth-primitive', {
    componentId: 'src/components/ui/auth-primitives.tsx#AuthFieldGroup',
    states: { data: 'maximum-supported' },
    variants: {},
  });
  assert.equal((fieldGroup.props.children as unknown[]).length, 4);
  assert.equal(fieldGroup.captureSelector, '[data-slot="auth-field-group"]');

  const status = resolveComponentStateAdapter('ui.auth-primitive', {
    componentId: 'src/components/ui/auth-primitives.tsx#AuthStatusPanel',
    states: { data: 'single' },
    variants: { leadingIcon: 'present', tone: 'warning' },
  });
  assert.equal(status.props.tone, 'warning');
  assert.equal((status.props.children as unknown[]).length, 2);
  assert.equal(status.captureSelector, '[data-slot="auth-status-panel"]');

  assert.throws(
    () => resolveComponentStateAdapter('ui.auth-primitive', {
      componentId: 'src/components/ui/auth-primitives.tsx#UnsupportedPrimitive',
      states: { data: 'single' },
      variants: {},
    }),
    /auth primitive/,
  );
});

test('auth layout and sign-up status adapters cover owned branches without live auth data', () => {
  const layout = resolveComponentStateAdapter('auth.layout', {
    componentId: 'src/components/auth/AuthLayout.tsx#AuthLayout',
    states: { data: 'unbroken-token', interactions: 'selected' },
    variants: { homeButton: 'shown' },
  });
  assert.equal(layout.props.showHomeButton, true);
  assert.equal(layout.captureSelector, '[data-testid="auth-shell"]');
  assert.equal(layout.expectedPathname, undefined);
  assert.match(String((layout.props.children as { props: { children: string } }).props.children), /AUTH-LAYOUT-/);

  const success = resolveComponentStateAdapter('auth.sign-up-status-panel', {
    componentId: 'src/components/auth/SignUpStatusPanel.tsx#SignUpStatusPanel',
    states: { data: 'single' },
    variants: { outcome: 'success' },
  });
  assert.deepEqual(success.props, { error: null, isSuccess: true });
  assert.equal(success.captureSelector, '[data-slot="auth-status-panel"]');

  const longError = resolveComponentStateAdapter('auth.sign-up-status-panel', {
    componentId: 'src/components/auth/SignUpStatusPanel.tsx#SignUpStatusPanel',
    states: { data: 'long-korean' },
    variants: { outcome: 'error' },
  });
  assert.equal(longError.props.isSuccess, false);
  assert.match(String(longError.props.error), /모바일/);

  const idle = resolveComponentStateAdapter('auth.sign-up-status-panel', {
    componentId: 'src/components/auth/SignUpStatusPanel.tsx#SignUpStatusPanel',
    states: { data: 'single' },
    variants: { outcome: 'idle' },
  });
  assert.deepEqual(idle.props, { error: null, isSuccess: false });
  assert.equal(idle.captureSelector, '[data-vqa-harness-surface]');
});

test('oauth email challenge adapter covers initial, mutation failure, and pending transport states', async () => {
  type ChallengeClient = {
    getOAuthEmailChallenge: (challengeId: string) => Promise<{
      challengeId: string;
      status: string;
      maskedEmail: string | null;
      expiresAt: string | null;
    }>;
    submitOAuthEmailChallengeEmail: (challengeId: string, email: string) => Promise<unknown>;
    resendOAuthEmailChallenge: (challengeId: string) => Promise<unknown>;
  };
  const context = {
    componentId: 'src/components/auth/OAuthEmailChallengePanel.tsx#OAuthEmailChallengePanel',
    states: { data: 'unbroken-token', interactions: 'default', system: 'online' },
    variants: { presentation: 'email-sent', reason: 'email-required' },
  };
  const sent = resolveComponentStateAdapter('auth.oauth-email-challenge-panel', context);
  const sentClient = sent.props.challengeClient as ChallengeClient;
  const sentChallenge = await sentClient.getOAuthEmailChallenge(String(sent.props.challengeId));
  assert.equal(sent.props.reason, 'oauth2_email_required');
  assert.equal(sent.captureSelector, '[data-testid="oauth-email-challenge-panel"]');
  assert.equal(sentChallenge.status, 'EMAIL_SENT');
  assert.match(String(sentChallenge.maskedEmail), /OAUTH-EMAIL-/);

  const offline = resolveComponentStateAdapter('auth.oauth-email-challenge-panel', {
    ...context,
    states: { data: 'single', interactions: 'selected', system: 'offline' },
  });
  const offlineClient = offline.props.challengeClient as ChallengeClient;
  assert.equal((await offlineClient.getOAuthEmailChallenge('challenge')).status, 'EMAIL_SENT');
  await assert.rejects(
    () => offlineClient.resendOAuthEmailChallenge('challenge'),
    /네트워크 연결이 끊어졌습니다/,
  );

  const timeout = resolveComponentStateAdapter('auth.oauth-email-challenge-panel', {
    ...context,
    states: { data: 'single', interactions: 'submitting', system: 'timeout' },
  });
  const timeoutClient = timeout.props.challengeClient as ChallengeClient;
  let settled = false;
  void timeoutClient.resendOAuthEmailChallenge('challenge').finally(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);

  const loadError = resolveComponentStateAdapter('auth.oauth-email-challenge-panel', {
    ...context,
    states: { data: 'error-503', interactions: 'default', system: 'online' },
    variants: { presentation: 'email-required', reason: 'verification-required' },
  });
  const loadErrorClient = loadError.props.challengeClient as ChallengeClient;
  assert.equal(loadError.props.reason, 'oauth2_email_verification_required');
  await assert.rejects(
    () => loadErrorClient.getOAuthEmailChallenge('challenge'),
    /503/,
  );
});

test('common component adapters cover content pressure, faults, fallbacks, and QR variants', async () => {
  const markdown = resolveComponentStateAdapter('common.coach-markdown', {
    componentId: 'src/components/common/CoachMarkdown.tsx#CoachMarkdown',
    states: { data: 'maximum-supported' },
    variants: { format: 'rich-gfm' },
  });
  assert.match(String(markdown.props.children), /\| 구분 \| 값 \|/);
  assert.equal(markdown.captureSelector, '.vqa-coach-markdown');

  const emptyState = resolveComponentStateAdapter('common.empty-state', {
    componentId: 'src/components/common/EmptyState.tsx#EmptyState',
    states: { data: 'unbroken-token', interactions: 'focus-visible' },
    variants: {
      action: 'present',
      description: 'present',
      icon: 'present',
      tone: 'warning',
    },
  });
  assert.equal(emptyState.props.tone, 'warning');
  assert.match(String(emptyState.props.title), /EMPTY-TITLE-/);
  assert.ok(emptyState.props.action);

  const errorBoundary = resolveComponentStateAdapter('common.error-boundary', {
    componentId: 'src/components/common/ErrorBoundary.tsx#ErrorBoundary',
    states: { data: 'long-korean' },
    variants: { outcome: 'default-fallback' },
  });
  assert.ok(errorBoundary.props.children);
  assert.equal(errorBoundary.props.fallback, undefined);

  const fallback = resolveComponentStateAdapter('common.error-boundary-fallback', {
    componentId: 'src/components/common/ErrorBoundaryFallback.tsx#ErrorBoundaryFallback',
    states: { data: 'null-optional', interactions: 'input' },
    variants: {},
  });
  assert.equal(fallback.props.errorId, undefined);
  assert.equal(typeof fallback.props.onRetry, 'function');

  const feedbackSuccess = resolveComponentStateAdapter('common.error-feedback-panel', {
    componentId: 'src/components/common/ErrorFeedbackPanel.tsx#ErrorFeedbackPanel',
    states: { data: 'long-korean', interactions: 'selected', system: 'online' },
    variants: { reloadAction: 'present', retryAction: 'present', source: 'api' },
  });
  assert.equal(feedbackSuccess.props.source, 'api');
  assert.equal(typeof feedbackSuccess.props.onRetry, 'function');
  assert.equal(typeof feedbackSuccess.props.onReload, 'function');
  assert.equal(feedbackSuccess.captureSelector, '[data-testid="error-feedback"]');
  assert.equal(await (feedbackSuccess.props.submitFeedback as () => Promise<boolean>)(), true);

  const feedbackFailure = resolveComponentStateAdapter('common.error-feedback-panel', {
    componentId: 'src/components/common/ErrorFeedbackPanel.tsx#ErrorFeedbackPanel',
    states: { data: 'unbroken-token', interactions: 'selected', system: 'offline' },
    variants: { reloadAction: 'missing', retryAction: 'missing', source: 'unhandled-rejection' },
  });
  assert.equal(feedbackFailure.props.source, 'unhandled_rejection');
  assert.equal(feedbackFailure.props.onRetry, undefined);
  assert.equal(feedbackFailure.props.onReload, null);
  assert.equal(await (feedbackFailure.props.submitFeedback as () => Promise<boolean>)(), false);

  const optimizedImage = resolveComponentStateAdapter('common.optimized-image', {
    componentId: 'src/components/common/OptimizedImage.tsx#OptimizedImage',
    states: { data: 'broken-image' },
    variants: { dimensions: 'landscape', priority: 'eager', webp: 'present' },
  });
  assert.equal(optimizedImage.props.priority, true);
  assert.equal(optimizedImage.props.width, 320);
  assert.match(String(optimizedImage.props.src), /bm90LXZhbGlk/);

  const profileImage = resolveComponentStateAdapter('common.profile-image', {
    componentId: 'src/components/common/ProfileImage.tsx#ProfileImage',
    states: { data: 'missing-image' },
    variants: { size: 'xl' },
  });
  assert.equal(profileImage.props.src, undefined);
  assert.equal(profileImage.props.username, '베가');
  assert.equal(profileImage.props.size, 'xl');

  const qr = resolveComponentStateAdapter('common.qr-code', {
    componentId: 'src/components/common/QrCodeSvg.tsx#QrCodeSvg',
    states: { data: 'unbroken-token' },
    variants: { level: 'H', palette: 'brand', size: 'touch' },
  });
  assert.equal(qr.props.level, 'H');
  assert.equal(qr.props.size, 256);
  assert.match(String(qr.props.value), /QR-/);
});

test('figma image and ranking result adapters cover fallback and result pressure states', () => {
  const brokenImage = resolveComponentStateAdapter('figma.image-with-fallback', {
    componentId: 'src/components/figma/ImageWithFallback.tsx#ImageWithFallback',
    states: { data: 'broken-image' },
    variants: { alt: 'long-korean', dimensions: 'landscape' },
  });
  assert.match(String(brokenImage.props.src), /bm90LXZhbGlk/);
  assert.match(String(brokenImage.props.alt), /모바일/);
  assert.deepEqual(brokenImage.props.style, { height: 180, width: 320 });
  assert.equal(brokenImage.captureSelector, '.vqa-figma-image');

  const maximumResult = resolveComponentStateAdapter('ranking.result-panel', {
    componentId: 'src/components/ranking/RankingPredictionResultPanel.tsx#RankingPredictionResultPanel',
    states: { data: 'maximum-supported' },
    variants: { accuracy: 'mismatch', season: 'boundary-maximum' },
  });
  const result = maximumResult.props.result as {
    exactMatchCount: number;
    seasonYear: number;
    teamDetails: Array<{ currentRank: number | null; teamName: string }>;
  };
  assert.equal(result.seasonYear, 9999);
  assert.equal(result.teamDetails.length, 10);
  assert.equal(result.exactMatchCount, 0);
  assert.ok(result.teamDetails.every((detail, index) => detail.currentRank !== index + 1));
  assert.equal(maximumResult.captureSelector, '[data-testid="ranking-result-panel"]');

  const missingRanks = resolveComponentStateAdapter('ranking.result-panel', {
    componentId: 'src/components/ranking/RankingPredictionResultPanel.tsx#RankingPredictionResultPanel',
    states: { data: 'unbroken-token' },
    variants: { accuracy: 'missing-rank', season: 'current' },
  });
  const missingResult = missingRanks.props.result as {
    teamDetails: Array<{ currentRank: number | null; teamName: string }>;
  };
  assert.equal(missingResult.teamDetails[0]?.currentRank, null);
  assert.match(missingResult.teamDetails[0]?.teamName ?? '', /RANKING-TEAM-/);
});

test('ranking item adapter covers empty, content pressure, permissions, positions, and movement', () => {
  const dragging = resolveComponentStateAdapter('ranking.item', {
    componentId: 'src/components/ranking/RankingItem.tsx#RankingItem',
    states: { data: 'unbroken-token', interactions: 'focus-visible' },
    variants: { mode: 'editable', movement: 'dragging', rank: 'divider' },
  });
  const team = dragging.props.team as { id: string; name: string };
  assert.match(team.name, /RANKING-ITEM-/);
  assert.equal(dragging.props.index, 5);
  assert.equal(dragging.props.alreadySaved, false);
  assert.equal(dragging.props.draggedTeamId, team.id);
  assert.equal(dragging.props.lastMovedTeamId, null);
  assert.equal(dragging.captureSelector, '[data-vqa-harness-surface]');

  const empty = resolveComponentStateAdapter('ranking.item', {
    componentId: 'src/components/ranking/RankingItem.tsx#RankingItem',
    states: { data: 'empty', interactions: 'default' },
    variants: { mode: 'editable', movement: 'idle', rank: 'last' },
  });
  assert.equal(empty.props.team, null);
  assert.equal(empty.props.index, 9);
  assert.equal(typeof empty.props.onMoveTeamByStep, 'function');

  const readOnly = resolveComponentStateAdapter('ranking.item', {
    componentId: 'src/components/ranking/RankingItem.tsx#RankingItem',
    states: { data: 'long-korean', interactions: 'default' },
    variants: { mode: 'read-only', movement: 'idle', rank: 'playoff-last' },
  });
  assert.equal(readOnly.props.alreadySaved, true);
  assert.match(String((readOnly.props.team as { name: string }).name), /모바일/);
});

test('ui-kit-preview-scenarios pin both themes and validate every toggle interaction target', () => {
  const light = resolveComponentStateAdapter('ui.ui-kit-preview', {
    componentId: 'src/components/ui/UIKitPreview.tsx#UIKitPreview',
    interactionTargetId: 'theme-toggle',
    states: { interactions: 'focus-visible' },
    variants: { theme: 'light' },
  });
  assert.equal(light.theme, 'light');
  assert.equal(light.captureSelector, '[data-testid="ui-kit-preview"]');
  assert.match(light.surfaceClassName ?? '', /max-w-\[1024px\]/);

  const darkToLight = resolveComponentStateAdapter('ui.ui-kit-preview', {
    componentId: 'src/components/ui/UIKitPreview.tsx#UIKitPreview',
    interactionTargetId: 'to-light',
    states: { interactions: 'selected' },
    variants: { theme: 'dark' },
  });
  assert.equal(darkToLight.theme, 'dark');

  assert.throws(
    () => resolveComponentStateAdapter('ui.ui-kit-preview', {
      componentId: 'src/components/ui/UIKitPreview.tsx#UIKitPreview',
      interactionTargetId: 'to-light',
      states: { interactions: 'selected' },
      variants: { theme: 'light' },
    }),
    /theme transition/,
  );
});

test('ui-toaster scenarios seed real toast API states without changing the production wrapper props', () => {
  const result = resolveComponentStateAdapter('ui.toaster', {
    componentId: 'src/components/ui/sonner.tsx#Toaster',
    interactionTargetId: 'close-button',
    states: {
      data: 'maximum-supported',
      interactions: 'hover',
    },
    variants: {
      duration: 'timed',
      position: 'top-left',
      theme: 'dark',
      tone: 'warning',
    },
  });

  assert.equal(result.props.position, 'top-left');
  assert.equal(result.props.theme, 'dark');
  assert.equal(result.theme, 'dark');
  assert.equal(result.captureSelector, '.vqa-toaster');
  assert.ok(result.companion);
  assert.match(result.surfaceClassName ?? '', /min-h-\[560px\]/);

  assert.throws(
    () => resolveComponentStateAdapter('ui.toaster', {
      componentId: 'src/components/ui/sonner.tsx#Toaster',
      states: { data: 'single', interactions: 'default' },
      variants: { duration: 'timed', position: 'middle', theme: 'light', tone: 'success' },
    }),
    /position=middle/,
  );
});

test('loading-spinner-scenarios cover public visual branches and delayed reveal props', () => {
  const app = resolveComponentStateAdapter('loading.spinner', {
    componentId: 'src/components/LoadingSpinner.tsx#LoadingSpinner',
    states: { data: 'long-korean' },
    variants: {
      delay: 'delayed',
      fullScreen: 'true',
      hostClass: 'transition',
      showTagline: 'true',
      size: 'sm',
      variant: 'app',
    },
  });
  assert.equal(app.props.size, 'sm');
  assert.equal(app.props.variant, 'app');
  assert.equal(app.props.fullScreen, true);
  assert.equal(app.props.minDurationMs, 60);
  assert.equal(app.props.showTagline, true);
  assert.match(String(app.props.message), /모바일 화면/);
  assert.match(String(app.props.subMessage), /줄바꿈/);
  assert.equal(app.props.className, 'transition-colors duration-200');
  assert.match(app.surfaceClassName ?? '', /\bblock\b/);

  const inlineEmpty = resolveComponentStateAdapter('loading.spinner', {
    componentId: 'src/components/LoadingSpinner.tsx#LoadingSpinner',
    states: { data: 'empty' },
    variants: {
      delay: 'immediate',
      fullScreen: 'false',
      hostClass: 'default',
      showTagline: 'true',
      size: 'lg',
      variant: 'inline',
    },
  });
  assert.equal(inlineEmpty.props.message, '');
  assert.equal(inlineEmpty.props.subMessage, '');
  assert.equal(inlineEmpty.props.fullScreen, false);

  assert.throws(
    () => resolveComponentStateAdapter('loading.spinner', {
      componentId: 'src/components/LoadingSpinner.tsx#LoadingSpinner',
      states: { data: 'populated' },
      variants: {
        delay: 'immediate',
        fullScreen: 'true',
        hostClass: 'default',
        showTagline: 'true',
        size: 'lg',
        variant: 'inline',
      },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('the base skeleton adapter gives the otherwise size-less primitive a visible surface', () => {
  const result = resolveComponentStateAdapter('ui.skeleton.loading', {
    componentId: 'src/components/ui/skeleton.tsx#Skeleton',
    states: { data: 'loading' },
    variants: { usage: 'usage-73a1199e3286' },
  });
  assert.equal(result.props.className, 'h-10 min-w-0 flex-1 rounded-md');
  assert.equal(result.props['aria-label'], '콘텐츠를 불러오는 중');
  assert.match(result.surfaceClassName ?? '', /justify-start/);

  const grid = resolveComponentStateAdapter('ui.skeleton.loading', {
    componentId: 'src/components/ui/skeleton.tsx#Skeleton',
    states: { data: 'loading' },
    variants: { usage: 'usage-56546e2d7373' },
  });
  assert.match(grid.surfaceClassName ?? '', /grid-cols-2/);

  const fullHeight = resolveComponentStateAdapter('ui.skeleton.loading', {
    componentId: 'src/components/ui/skeleton.tsx#Skeleton',
    states: { data: 'loading' },
    variants: { usage: 'usage-cd9d6c0d0cc4' },
  });
  assert.match(fullHeight.surfaceClassName ?? '', /h-48/);

  assert.throws(
    () => resolveComponentStateAdapter('ui.skeleton.loading', {
      componentId: 'src/components/ui/skeleton.tsx#Skeleton',
      states: { data: 'loading' },
      variants: { usage: 'usage-does-not-exist' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
});

test('the Skeleton state manifest and adapter cover every exact source usage variant', async () => {
  const [usageContract, stateManifest] = await Promise.all([
    readFile(new URL('../../contracts/visual-qa-skeleton-usages-v1.json', import.meta.url), 'utf8')
      .then((value) => JSON.parse(value) as {
        variants: Array<{ id: string; className: string }>;
      }),
    readFile(new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url), 'utf8')
      .then((value) => JSON.parse(value) as {
        components: Array<{
          id: string;
          status: string;
          variants?: { dimensions?: Array<{ name: string; values: string[] }> };
        }>;
      }),
  ]);
  const entry = stateManifest.components.find(({ id }) => (
    id === 'src/components/ui/skeleton.tsx#Skeleton'
  ));
  const usageValues = entry?.variants?.dimensions?.find(({ name }) => name === 'usage')?.values;
  assert.equal(entry?.status, 'registered');
  assert.deepEqual(usageValues, usageContract.variants.map(({ id }) => id));

  for (const variant of usageContract.variants) {
    const resolved = resolveComponentStateAdapter('ui.skeleton.loading', {
      componentId: 'src/components/ui/skeleton.tsx#Skeleton',
      states: { data: 'loading' },
      variants: { usage: variant.id },
    });
    assert.equal(resolved.props.className, variant.className);
    assert.ok(resolved.surfaceClassName);
  }
});

test('registered-component-variant-scenarios', async () => {
  assert.deepEqual(
    resolveComponentStateAdapter('prediction.loading-view', {
      componentId: 'src/components/prediction/PredictionLoadingView.tsx#PredictionLoadingView',
      states: { data: 'loading' },
      variants: { topNotice: 'long-korean' },
    }),
    { props: { topNotice: '경기 데이터 동기화가 진행 중이며 완료되는 즉시 예측 화면을 표시합니다.' } },
  );
  assert.deepEqual(
    resolveComponentStateAdapter('stadium-seatmap.loading', {
      componentId: 'src/components/StadiumSeatMapStates.tsx#StadiumSeatMapLoadingSkeleton',
      states: { data: 'loading' },
      variants: { stadiumName: 'short', label: 'missing' },
    }),
    { props: { stadiumName: '잠실야구장', label: undefined } },
  );
  assert.deepEqual(
    resolveComponentStateAdapter('stadium-seatmap.manual-required', {
      componentId: 'src/components/StadiumSeatMapStates.tsx#StadiumSeatMapManualRequired',
      states: { data: 'manual-required' },
      variants: { stadiumName: 'missing' },
    }),
    { props: { stadiumName: null } },
  );
  assert.throws(
    () => resolveComponentStateAdapter('prediction.loading-view', {
      componentId: 'src/components/prediction/PredictionLoadingView.tsx#PredictionLoadingView',
      states: { data: 'loading' },
      variants: { topNotice: 'undeclared' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('prediction.loading-view', {
      componentId: 'src/components/prediction/PredictionLoadingView.tsx#PredictionLoadingView',
      states: { data: 'loading' },
      variants: { topNotice: 'toString' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      status: string;
      variants?: { dimensions?: Array<{ name: string; values: string[]; testEvidence?: string }> };
    }>;
  };
  const initialVariantIds = new Set([
    'src/components/prediction/PredictionLoadingView.tsx#PredictionLoadingView',
    'src/components/StadiumSeatMapStates.tsx#StadiumSeatMapLoadingSkeleton',
    'src/components/StadiumSeatMapStates.tsx#StadiumSeatMapManualRequired',
  ]);
  const variantEntries = manifest.components.filter(({ id, status, variants }) => (
    status === 'registered'
      && initialVariantIds.has(id)
      && (variants?.dimensions?.length ?? 0) > 0
  ));
  assert.equal(variantEntries.length, 3);
  assert.ok(variantEntries.every(({ variants }) => variants?.dimensions?.every(({ testEvidence }) => (
    testEvidence === 'src/visual-qa/stateAdapters.test.ts#registered-component-variant-scenarios'
  ))));
});

test('registered-interactive-state-scenarios', () => {
  const result = resolveComponentStateAdapter('cheer-feed.error', {
    componentId: 'src/components/CheerFeedStates.tsx#CheerFeedErrorState',
    states: { data: 'error-503', interactions: 'focus-visible' },
    variants: {},
  });
  assert.deepEqual(Object.keys(result.props), ['onRetry']);
  assert.equal(typeof result.props.onRetry, 'function');
  assert.throws(
    () => resolveComponentStateAdapter('cheer-feed.error', {
      componentId: 'src/components/CheerFeedStates.tsx#CheerFeedErrorState',
      states: { data: 'empty', interactions: 'default' },
      variants: {},
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('stadium-seatmap-error-scenarios', () => {
  const result = resolveComponentStateAdapter('stadium-seatmap.error', {
    componentId: 'src/components/StadiumSeatMapStates.tsx#StadiumSeatMapErrorFallback',
    states: { data: 'error-503', interactions: 'focus-visible' },
    variants: { stadiumName: 'long-korean' },
  });
  assert.equal(
    result.props.stadiumName,
    '서울특별시 종합운동장 야구장 공식 좌석 안내 구역',
  );
  assert.equal(typeof result.props.onRetry, 'function');
  assert.throws(
    () => resolveComponentStateAdapter('stadium-seatmap.error', {
      componentId: 'src/components/StadiumSeatMapStates.tsx#StadiumSeatMapErrorFallback',
      states: { data: 'empty', interactions: 'default' },
      variants: { stadiumName: 'short' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('sajik-seatmap-scenarios map every declared guide and auth state without network data', () => {
  const emptyGuide = resolveComponentStateAdapter('sajik.first-visit-guide', {
    componentId: 'src/components/sajik/SajikSeatMap.tsx#SajikFirstVisitGuide',
    states: { data: 'empty', interactions: 'default' },
    variants: { intent: 'accessible', mode: 'dark' },
  });
  assert.equal(emptyGuide.props.intent, 'accessible');
  assert.equal(emptyGuide.props.mode, 'dark');
  assert.equal(emptyGuide.props.query, '등록되지않은구역');
  assert.deepEqual(emptyGuide.props.matches, []);
  assert.equal(typeof emptyGuide.props.onIntentChange, 'function');
  assert.equal(typeof emptyGuide.props.onQueryChange, 'function');
  assert.equal(typeof emptyGuide.props.onSelectBlock, 'function');
  assert.equal(emptyGuide.captureSelector, '[data-testid="sajik-first-visit-guide"]');

  const maximumGuide = resolveComponentStateAdapter('sajik.first-visit-guide', {
    componentId: 'src/components/sajik/SajikSeatMap.tsx#SajikFirstVisitGuide',
    states: { data: 'maximum-supported', interactions: 'focus-visible' },
    variants: { intent: 'all', mode: 'light' },
  });
  assert.equal(Array.isArray(maximumGuide.props.matches), true);
  assert.equal((maximumGuide.props.matches as unknown[]).length, 78);

  const longGuide = resolveComponentStateAdapter('sajik.first-visit-guide', {
    componentId: 'src/components/sajik/SajikSeatMap.tsx#SajikFirstVisitGuide',
    states: { data: 'long-korean', interactions: 'default' },
    variants: { intent: 'home_cheer', mode: 'light' },
  });
  assert.equal(
    longGuide.props.query,
    '모바일에서도 입력 영역과 결과 카드가 겹치지 않는 매우 긴 사직야구장 좌석 블록 검색어',
  );

  const anonymousMap = resolveComponentStateAdapter('sajik.seat-map', {
    componentId: 'src/components/sajik/SajikSeatMap.tsx#SajikSeatMap',
    states: { data: 'populated', permissions: 'anonymous', interactions: 'default' },
    variants: {},
  });
  assert.deepEqual(anonymousMap.props.stateOverride, { isLoggedIn: false });
  assert.equal(anonymousMap.captureSelector, '[data-vqa-harness-surface]');

  const userMap = resolveComponentStateAdapter('sajik.seat-map', {
    componentId: 'src/components/sajik/SajikSeatMap.tsx#SajikSeatMap',
    states: { data: 'populated', permissions: 'user', interactions: 'open' },
    variants: {},
  });
  assert.deepEqual(userMap.props.stateOverride, { isLoggedIn: true });

  assert.throws(
    () => resolveComponentStateAdapter('sajik.seat-map', {
      componentId: 'src/components/sajik/SajikSeatMap.tsx#SajikSeatMap',
      states: { data: 'empty', permissions: 'anonymous', interactions: 'default' },
      variants: {},
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('sajik SVG and editor adapters reproduce every declared local state without network data', () => {
  const svg = resolveComponentStateAdapter('sajik.seat-map-svg', {
    componentId: 'src/components/sajik/SajikSeatMapSvg.tsx#SajikSeatMapSvg',
    states: { data: 'loading', interactions: 'default' },
    variants: {
      filter: 'category-filtered',
      fullscreen: 'present',
      guide: 'matched',
      mode: 'dark',
      selection: 'selected',
      zoom: 'maximum',
    },
  });
  assert.equal(svg.props.mode, 'dark');
  assert.equal((svg.props.selected as { id?: string }).id, 'sajik-canonical-322');
  assert.deepEqual(svg.props.filterCats, ['CENTRAL_TABLE']);
  assert.deepEqual(svg.props.guideMatchedBlockIds, ['sajik-canonical-322']);
  assert.equal(svg.props.guideActive, true);
  assert.equal(svg.props.zoom, 2.5);
  assert.equal(typeof svg.props.onFullscreen, 'function');
  assert.deepEqual(svg.props.stateOverride, { imageState: 'loading' });
  assert.equal(svg.captureSelector, '[data-testid="sajik-seatmap-panel"]');

  const missing = resolveComponentStateAdapter('sajik.missing-official-seat-map', {
    componentId: 'src/components/sajik/SajikSeatMapSvg.tsx#MissingOfficialSeatMap',
    states: { data: 'manual-required' },
    variants: { mode: 'light' },
  });
  assert.deepEqual(missing.props, { mode: 'light' });

  const validator = resolveComponentStateAdapter('sajik.path-validation', {
    componentId: 'src/components/sajik/SajikSeatMapEditor.tsx#PathValidationStatus',
    states: { data: 'error-422' },
    variants: { label: 'unbroken-token' },
  });
  assert.equal((validator.props.issues as unknown[]).length, 2);
  assert.equal(String(validator.props.label), `PATH-${'X'.repeat(120)}`);

  const editor = resolveComponentStateAdapter('sajik.seat-map-editor', {
    componentId: 'src/components/sajik/SajikSeatMapEditor.tsx#SajikSeatMapEditor',
    states: { data: 'error-422', interactions: 'default' },
    variants: {
      copyStatus: 'failed',
      editingTarget: 'labelPoint',
      query: 'unbroken-token',
      section: 'accessibility',
    },
  });
  assert.deepEqual(editor.props.stateOverride, {
    dataState: 'invalid-hitpath',
    copyStatus: 'failed',
    editingTarget: 'labelPoint',
    query: `SAJIK-${'X'.repeat(160)}`,
    selectedSectionId: '323',
  });
  assert.equal(editor.captureSelector, '[data-testid="sajik-seatmap-editor"]');
});

test('prediction-matches-error-scenarios', () => {
  const manual = resolveComponentStateAdapter('prediction.matches-error', {
    componentId: 'src/components/prediction/PredictionMatchesErrorView.tsx#PredictionMatchesErrorView',
    states: { data: 'manual-required', interactions: 'default' },
    variants: {},
  });
  assert.equal(manual.props.matchesLoadErrorCode, 'MANUAL_BASEBALL_DATA_REQUIRED');
  assert.equal(manual.props.matchesLoadErrorMessage, null);
  assert.equal(manual.props.predictionRecoveryPath, '/prediction');
  assert.equal(typeof manual.props.onReloadMatches, 'function');

  const unbroken = resolveComponentStateAdapter('prediction.matches-error', {
    componentId: 'src/components/prediction/PredictionMatchesErrorView.tsx#PredictionMatchesErrorView',
    states: { data: 'unbroken-token', interactions: 'pressed' },
    variants: {},
  });
  assert.equal(unbroken.props.matchesLoadErrorCode, 'UPSTREAM_ERROR');
  assert.equal(unbroken.props.matchesLoadErrorMessage, 'X'.repeat(180));
  assert.throws(
    () => resolveComponentStateAdapter('prediction.matches-error', {
      componentId: 'src/components/prediction/PredictionMatchesErrorView.tsx#PredictionMatchesErrorView',
      states: { data: 'populated', interactions: 'default' },
      variants: {},
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('mypage-season-empty-scenarios', () => {
  const longContent = resolveComponentStateAdapter('mypage.season-empty', {
    componentId: 'src/components/mypage/MyPageSeasonEmptyState.tsx#MyPageSeasonEmptyState',
    states: { data: 'long-korean', interactions: 'focus-visible' },
    variants: {
      action: 'present',
      description: 'present',
      icon: 'present',
      layout: 'compact',
      tone: 'danger',
    },
  });
  assert.match(String(longContent.props.title), /조건에 맞는 시즌.*기록/);
  assert.match(String(longContent.props.description), /필터 조건/);
  assert.match(String(longContent.props.actionLabel), /직관 기록 작성 화면/);
  assert.equal(longContent.props.className, 'is-compact');
  assert.equal(longContent.props.tone, 'danger');
  assert.ok(longContent.props.icon);
  assert.equal(typeof longContent.props.onAction, 'function');

  const minimal = resolveComponentStateAdapter('mypage.season-empty', {
    componentId: 'src/components/mypage/MyPageSeasonEmptyState.tsx#MyPageSeasonEmptyState',
    states: { data: 'empty', interactions: 'default' },
    variants: {
      action: 'missing',
      description: 'missing',
      icon: 'missing',
      layout: 'default',
      tone: 'default',
    },
  });
  assert.equal(minimal.props.description, undefined);
  assert.equal(minimal.props.actionLabel, undefined);
  assert.equal(minimal.props.onAction, undefined);
  assert.equal(minimal.props.icon, undefined);
  assert.equal(minimal.props.className, '');
});

test('cheer-feed-empty-scenarios', () => {
  const result = resolveComponentStateAdapter('cheer-feed.empty', {
    componentId: 'src/components/CheerFeedStates.tsx#CheerFeedEmptyState',
    states: { data: 'empty', interactions: 'pressed' },
    variants: { feedTab: 'popular', teamId: 'HH' },
  });
  assert.equal(result.props.feedTab, 'popular');
  assert.equal(result.props.teamColor, '#F37321');
  assert.equal(typeof result.props.onWriteClick, 'function');

  assert.deepEqual(FRANCHISE_TEAM_IDS, ['LG', 'DB', 'SSG', 'KT', 'KH', 'NC', 'SS', 'LT', 'KIA', 'HH']);
  assert.throws(
    () => resolveComponentStateAdapter('cheer-feed.empty', {
      componentId: 'src/components/CheerFeedStates.tsx#CheerFeedEmptyState',
      states: { data: 'empty', interactions: 'default' },
      variants: { feedTab: 'search', teamId: 'HH' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
});

test('cheer-feed-login-required-scenarios', () => {
  const result = resolveComponentStateAdapter('cheer-feed.login-required', {
    componentId: 'src/components/CheerFeedStates.tsx#CheerFeedLoginRequiredState',
    states: { permissions: 'anonymous', interactions: 'focus-visible' },
    variants: { teamId: 'KIA' },
  });
  assert.equal(result.props.teamColor, '#EA0029');
  assert.equal(typeof result.props.onRequireLogin, 'function');
  assert.throws(
    () => resolveComponentStateAdapter('cheer-feed.login-required', {
      componentId: 'src/components/CheerFeedStates.tsx#CheerFeedLoginRequiredState',
      states: { permissions: 'user', interactions: 'default' },
      variants: { teamId: 'KIA' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('offseason-error-scenarios', () => {
  const rateLimited = resolveComponentStateAdapter('offseason.error', {
    componentId: 'src/components/offseason/OffseasonListStates.tsx#OffseasonErrorState',
    states: { data: 'error-429', interactions: 'default' },
    variants: {},
  });
  assert.equal(
    (rateLimited.props.error as { response?: { status?: number } }).response?.status,
    429,
  );
  assert.equal(typeof rateLimited.props.onRetry, 'function');

  const unbroken = resolveComponentStateAdapter('offseason.error', {
    componentId: 'src/components/offseason/OffseasonListStates.tsx#OffseasonErrorState',
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: {},
  });
  assert.equal((unbroken.props.error as Error).message, 'X'.repeat(180));
});

test('offseason-empty-scenarios', () => {
  const result = resolveComponentStateAdapter('offseason.empty', {
    componentId: 'src/components/offseason/OffseasonListStates.tsx#OffseasonEmptyState',
    states: { data: 'empty', interactions: 'pressed' },
    variants: { hasSearchTerm: 'true', hasActiveFilters: 'true' },
  });
  assert.equal(result.props.hasSearchTerm, true);
  assert.equal(result.props.hasActiveFilters, true);
  assert.equal(typeof result.props.onReset, 'function');
  assert.throws(
    () => resolveComponentStateAdapter('offseason.empty', {
      componentId: 'src/components/offseason/OffseasonListStates.tsx#OffseasonEmptyState',
      states: { data: 'empty', interactions: 'default' },
      variants: { hasSearchTerm: 'maybe', hasActiveFilters: 'false' },
    }),
    /지원하지 않는 Visual QA variant/,
  );
});

test('public landing adapters preserve direct surfaces, pressure copy, and navigation outcomes', () => {
  const landing = resolveComponentStateAdapter('landing.page', {
    componentId: 'src/components/Landing.tsx#Landing',
    states: { data: 'populated', interactions: 'default' },
    variants: { theme: 'dark' },
  });
  assert.equal(landing.captureSelector, '[data-testid="landing-page"]');
  assert.equal(landing.theme, 'dark');
  assert.match(landing.surfaceClassName ?? '', /\bp-0\b/);

  const feature = resolveComponentStateAdapter('landing.feature-section', {
    componentId: 'src/components/landing/LandingFeatureSection.tsx#LandingFeatureSection',
    states: { data: 'unbroken-token' },
    variants: {
      number: '05',
      order: 'visual-first',
      supplement: 'present',
      theme: 'light',
      tone: 'muted',
    },
  });
  assert.equal(feature.props.number, '05');
  assert.equal(feature.props.visualFirst, true);
  assert.equal(feature.props.tone, 'muted');
  assert.match(String(feature.props.title), /UNBROKEN/);
  assert.ok(feature.props.copySupplement);
  assert.ok(feature.props.visual);
  assert.equal(feature.captureSelector, '[data-testid="landing-feature-05"]');

  const heroOpen = resolveComponentStateAdapter('landing.hero', {
    componentId: 'src/components/landing/LandingHero.tsx#LandingHero',
    interactionTargetId: 'home',
    states: { data: 'populated', interactions: 'open' },
    variants: { theme: 'light' },
  });
  assert.equal(heroOpen.initialPathname, '/');
  assert.equal(heroOpen.expectedPathname, undefined);
  assert.equal(heroOpen.captureSelector, '[data-testid="landing-hero"]');

  const ticker = resolveComponentStateAdapter('landing.ticker', {
    componentId: 'src/components/landing/LandingTicker.tsx#LandingTicker',
    interactionTargetId: 'toggle',
    states: { data: 'populated', interactions: 'selected' },
    variants: {},
  });
  assert.equal(ticker.captureSelector, '[data-testid="landing-score-ticker"]');

  for (const adapterId of [
    'landing.app-preview',
    'landing.closing',
    'landing.offseason',
    'landing.phone-preview',
    'landing.start-guide',
    'landing.cheer-vignette',
    'landing.diary-vignette',
    'landing.game-data-vignette',
    'landing.mate-vignette',
    'landing.prediction-vignette',
    'landing.stadium-chips',
    'landing.stadium-vignette',
  ]) {
    const result = resolveComponentStateAdapter(adapterId, {
      componentId: adapterId,
      states: { data: 'populated' },
      variants: adapterId === 'landing.app-preview'
        || adapterId === 'landing.closing'
        || adapterId === 'landing.phone-preview'
        || adapterId === 'landing.ticker'
        ? {}
        : { theme: 'dark' },
    });
    assert.ok(result.captureSelector);
    assert.match(result.surfaceClassName ?? '', /\bp-0\b|landing-phone-frame/);
  }

  assert.throws(
    () => resolveComponentStateAdapter('landing.offseason', {
      componentId: 'src/components/landing/LandingOffseason.tsx#LandingOffseason',
      states: { data: 'empty' },
      variants: { theme: 'light' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('legacy landing showcase adapters preserve pressure, image failure, and card interactions', () => {
  const capability = resolveComponentStateAdapter('landing.capability-showcase', {
    componentId: 'src/components/LandingCapabilityShowcase.tsx#LandingCapabilityShowcase',
    states: { data: 'unbroken-token' },
    variants: { theme: 'dark' },
  });
  const capabilityOverride = capability.props.visualQaStateOverride as {
    heading: string;
    imageSrc?: string;
    storyTitleSuffix: string;
  };
  assert.match(capabilityOverride.heading, /UNBROKEN/);
  assert.match(capabilityOverride.storyTitleSuffix, /UNBROKEN/);
  assert.equal(capabilityOverride.imageSrc, undefined);
  assert.equal(capability.captureSelector, '[data-testid="landing-capability-showcase"]');
  assert.equal(capability.theme, 'dark');

  const brokenCapability = resolveComponentStateAdapter('landing.capability-showcase', {
    componentId: 'src/components/LandingCapabilityShowcase.tsx#LandingCapabilityShowcase',
    states: { data: 'broken-image' },
    variants: { theme: 'light' },
  });
  assert.equal(
    (brokenCapability.props.visualQaStateOverride as { imageSrc: string }).imageSrc,
    '/__visual-qa__/missing-capability.webp',
  );

  const selectedFeature = resolveComponentStateAdapter('landing.features-runtime', {
    componentId: 'src/components/LandingFeaturesRuntime.tsx#LandingFeaturesRuntime',
    interactionTargetId: 'feature-5',
    states: { data: 'maximum-supported', interactions: 'selected' },
    variants: { theme: 'light' },
  });
  assert.deepEqual(selectedFeature.props, {});
  assert.equal(selectedFeature.captureSelector, '[data-testid="landing-features"]');
  assert.equal(selectedFeature.theme, 'light');
  assert.match(selectedFeature.surfaceClassName ?? '', /\bp-0\b/);
});

test('lazy emoji picker adapter preserves inventory, search pressure, dimensions, and targets', () => {
  const maximum = resolveComponentStateAdapter('common.lazy-emoji-picker', {
    componentId: 'src/components/LazyEmojiPicker.tsx#LazyEmojiPicker',
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: { group: 'recent', size: 'oversized-input', theme: 'dark' },
  });
  const maximumOverride = maximum.props.visualQaStateOverride as {
    activeGroupId: string;
    query: string;
    recentEmojis: string[];
  };
  assert.equal(maximum.props.isDarkMode, true);
  assert.equal(maximum.props.width, 4096);
  assert.equal(maximum.props.height, 4096);
  assert.equal(maximumOverride.activeGroupId, 'recent');
  assert.equal(maximumOverride.query, '');
  assert.equal(maximumOverride.recentEmojis.length, 18);
  assert.equal(maximum.captureSelector, '[data-testid="lazy-emoji-picker"]');
  assert.equal(maximum.theme, 'dark');

  const selected = resolveComponentStateAdapter('common.lazy-emoji-picker', {
    componentId: 'src/components/LazyEmojiPicker.tsx#LazyEmojiPicker',
    interactionTargetId: 'emoji-17',
    states: { data: 'maximum-supported', interactions: 'selected' },
    variants: { group: 'recent', size: 'default', theme: 'dark' },
  });
  assert.equal(selected.captureSelector, '[data-testid="lazy-emoji-picker"]');

  const single = resolveComponentStateAdapter('common.lazy-emoji-picker', {
    componentId: 'src/components/LazyEmojiPicker.tsx#LazyEmojiPicker',
    interactionTargetId: 'search',
    states: { data: 'single', interactions: 'input' },
    variants: { group: 'baseball', size: 'default', theme: 'light' },
  });
  assert.equal(
    (single.props.visualQaStateOverride as { query: string }).query,
    'baseball',
  );
  assert.equal(single.props.width, 300);
  assert.equal(single.props.height, 400);

  assert.throws(
    () => resolveComponentStateAdapter('common.lazy-emoji-picker', {
      componentId: 'src/components/LazyEmojiPicker.tsx#LazyEmojiPicker',
      states: { data: 'populated', interactions: 'default' },
      variants: { group: 'recent', size: 'default', theme: 'light' },
    }),
    /지원하지 않는 Visual QA variant combination/,
  );
});

test('mate page adapter isolates both lazy boundaries and the resolved handoff', () => {
  const fallback = resolveComponentStateAdapter('mate.page', {
    componentId: 'src/components/Mate.tsx#Mate',
    states: { data: 'single' },
    variants: { phase: 'controls-fallback', theme: 'light' },
  });
  assert.deepEqual(fallback.props.visualQaStateOverride, { phase: 'controls-fallback' });
  assert.equal(fallback.captureSelector, '[data-testid="mate-page"]');
  assert.equal(fallback.initialPathname, '/mate');

  const runtime = resolveComponentStateAdapter('mate.page', {
    componentId: 'src/components/Mate.tsx#Mate',
    states: { data: 'single' },
    variants: { phase: 'runtime', theme: 'dark' },
  });
  const runtimeOverride = runtime.props.visualQaStateOverride as {
    phase: string;
    controller: {
      dateItems: Date[];
      isLoading: boolean;
      parties: unknown[];
    };
  };
  assert.equal(runtimeOverride.phase, 'runtime');
  assert.equal(runtimeOverride.controller.dateItems.length, 14);
  assert.equal(runtimeOverride.controller.isLoading, false);
  assert.deepEqual(runtimeOverride.controller.parties, []);
  assert.equal(runtime.theme, 'dark');

  assert.throws(
    () => resolveComponentStateAdapter('mate.page', {
      componentId: 'src/components/Mate.tsx#Mate',
      states: { data: 'unknown' },
      variants: { phase: 'runtime', theme: 'light' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('mate apply adapter maps terminal, pressure, payment, and ticket phases', () => {
  const error = resolveComponentStateAdapter('mate.apply', {
    componentId: 'src/components/MateApply.tsx#MateApply',
    states: { data: 'error-503', interactions: 'default', system: 'online' },
    variants: {
      flow: 'participation',
      submission: 'idle',
      ticketPanel: 'resolved',
      theme: 'light',
    },
  });
  assert.equal(error.captureSelector, '[data-testid="mate-apply-error"]');

  const maximum = resolveComponentStateAdapter('mate.apply', {
    componentId: 'src/components/MateApply.tsx#MateApply',
    states: { data: 'maximum-supported', interactions: 'default', system: 'online' },
    variants: {
      flow: 'selling',
      submission: 'idle',
      ticketPanel: 'resolved',
      theme: 'dark',
    },
  });
  const maximumOverride = maximum.props.visualQaStateOverride as {
    party: { price: number };
    paymentCapability: string;
  };
  assert.equal(maximumOverride.party.price, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumOverride.paymentCapability, 'available');
  assert.equal(maximum.theme, 'dark');

  const input = resolveComponentStateAdapter('mate.apply', {
    componentId: 'src/components/MateApply.tsx#MateApply',
    interactionTargetId: 'message',
    states: { data: 'single', interactions: 'input', system: 'online' },
    variants: {
      flow: 'participation',
      submission: 'idle',
      ticketPanel: 'resolved',
      theme: 'light',
    },
  });
  assert.equal(input.initialPathname, '/mate/77/apply');

  assert.throws(
    () => resolveComponentStateAdapter('mate.apply', {
      componentId: 'src/components/MateApply.tsx#MateApply',
      interactionTargetId: 'message',
      states: { data: 'single', interactions: 'input', system: 'online' },
      variants: {
        flow: 'selling',
        submission: 'idle',
        ticketPanel: 'resolved',
        theme: 'light',
      },
    }),
    /지원하지 않는 MateApply interaction target/,
  );
});

test('mate apply page adapter isolates the lazy fallback and resolved handoff', () => {
  const fallback = resolveComponentStateAdapter('mate.apply-page', {
    componentId: 'src/components/MateApplyPage.tsx#MateApplyPage',
    states: { data: 'single' },
    variants: { phase: 'fallback', theme: 'dark' },
  });
  assert.equal(fallback.props.visualQaPhase, 'fallback');
  assert.equal(fallback.captureSelector, '[data-testid="mate-apply-page-fallback"]');
  assert.equal(fallback.initialPathname, '/mate/77/apply');
  assert.equal(fallback.theme, 'dark');

  const runtime = resolveComponentStateAdapter('mate.apply-page', {
    componentId: 'src/components/MateApplyPage.tsx#MateApplyPage',
    states: { data: 'single' },
    variants: { phase: 'runtime', theme: 'light' },
  });
  const runtimeOverride = runtime.props.visualQaRuntimeStateOverride as {
    party: { id: number; status: string };
    ticketPanelPhase: string;
  };
  assert.equal(runtime.props.visualQaPhase, 'runtime');
  assert.equal(runtimeOverride.party.id, 77);
  assert.equal(runtimeOverride.party.status, 'PENDING');
  assert.equal(runtimeOverride.ticketPanelPhase, 'resolved');
  assert.equal(runtime.captureSelector, '[data-testid="mate-apply"]');

  assert.throws(
    () => resolveComponentStateAdapter('mate.apply-page', {
      componentId: 'src/components/MateApplyPage.tsx#MateApplyPage',
      states: { data: 'loading' },
      variants: { phase: 'runtime', theme: 'light' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('mate ticket verification adapter maps idle, scanning, pressure, and reset states', () => {
  const idle = resolveComponentStateAdapter('mate.ticket-verification', {
    componentId: 'src/components/MateApplyTicketVerificationPanel.tsx#MateApplyTicketVerificationPanel',
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { phase: 'idle', theme: 'light' },
    interactionTargetId: 'upload',
  });
  assert.equal(idle.props.ticketVerified, false);
  assert.deepEqual(idle.props.visualQaStateOverride, { isScanning: false });
  assert.equal(idle.captureSelector, '[data-testid="mate-apply-ticket-panel"]');

  const scanning = resolveComponentStateAdapter('mate.ticket-verification', {
    componentId: 'src/components/MateApplyTicketVerificationPanel.tsx#MateApplyTicketVerificationPanel',
    states: { data: 'single', interactions: 'default' },
    variants: { phase: 'scanning', theme: 'dark' },
  });
  assert.deepEqual(scanning.props.visualQaStateOverride, { isScanning: true });
  assert.equal(scanning.theme, 'dark');

  const pressure = resolveComponentStateAdapter('mate.ticket-verification', {
    componentId: 'src/components/MateApplyTicketVerificationPanel.tsx#MateApplyTicketVerificationPanel',
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { phase: 'verified', theme: 'light' },
  });
  const pressureInfo = pressure.props.ticketInfo as { stadium: string; section: string };
  assert.match(pressureInfo.stadium, /^STADIUM-/);
  assert.match(pressureInfo.section, /^SECTION-/);

  assert.throws(
    () => resolveComponentStateAdapter('mate.ticket-verification', {
      componentId: 'src/components/MateApplyTicketVerificationPanel.tsx#MateApplyTicketVerificationPanel',
      states: { data: 'long-korean', interactions: 'default' },
      variants: { phase: 'idle', theme: 'light' },
    }),
    /지원하지 않는 Mate ticket verification state/,
  );
});

test('mate chat adapter maps route, permission, pressure, approval, and lazy fallback states', () => {
  const partyError = resolveComponentStateAdapter('mate.chat', {
    componentId: 'src/components/MateChat.tsx#MateChat',
    interactionTargetId: 'party-error-list',
    states: {
      data: 'unbroken-token',
      interactions: 'focus-visible',
      permissions: 'anonymous',
    },
    variants: { phase: 'access', theme: 'dark' },
  });
  const partyErrorOverride = partyError.props.visualQaStateOverride as {
    partyError: string;
    currentUser: unknown;
  };
  assert.match(partyErrorOverride.partyError, /^PARTY-ERROR-/);
  assert.equal(partyErrorOverride.currentUser, null);
  assert.equal(partyError.captureSelector, '[data-testid="mate-chat-access-state"]');
  assert.equal(partyError.theme, 'dark');

  const approvedHost = resolveComponentStateAdapter('mate.chat', {
    componentId: 'src/components/MateChat.tsx#MateChat',
    states: {
      data: 'single',
      interactions: 'default',
      permissions: 'mate-host',
    },
    variants: { phase: 'approved-fallback', theme: 'light' },
  });
  const approvedOverride = approvedHost.props.visualQaStateOverride as {
    approvedPhase: string;
    currentUser: { id: number };
    party: { hostId: number };
  };
  assert.equal(approvedOverride.approvedPhase, 'fallback');
  assert.equal(approvedOverride.currentUser.id, approvedOverride.party.hostId);
  assert.equal(approvedHost.captureSelector, '[data-testid="mate-chat-approved-fallback"]');

  assert.throws(
    () => resolveComponentStateAdapter('mate.chat', {
      componentId: 'src/components/MateChat.tsx#MateChat',
      interactionTargetId: 'login',
      states: {
        data: 'error-503',
        interactions: 'hover',
        permissions: 'anonymous',
      },
      variants: { phase: 'approval', theme: 'light' },
    }),
    /지원하지 않는 MateChat state/,
  );
});

test('mate chat access adapter isolates every denial state and action target', () => {
  const approvalError = resolveComponentStateAdapter('mate.chat-access', {
    componentId: 'src/components/MateChatAccessStateRuntime.tsx#MateChatAccessStateRuntime',
    interactionTargetId: 'approval-detail',
    states: {
      data: 'long-korean',
      interactions: 'pressed',
      permissions: 'mate-applicant-pending',
    },
    variants: { state: 'approval-error', theme: 'dark' },
  });
  assert.equal(approvalError.props.state, 'approvalError');
  assert.match(String(approvalError.props.message), /채팅 승인 상태/);
  assert.equal(approvalError.captureSelector, '[data-testid="mate-chat-access-state"]');
  assert.equal(approvalError.theme, 'dark');

  const unauthenticated = resolveComponentStateAdapter('mate.chat-access', {
    componentId: 'src/components/MateChatAccessStateRuntime.tsx#MateChatAccessStateRuntime',
    states: {
      data: 'single',
      interactions: 'default',
      permissions: 'anonymous',
    },
    variants: { state: 'unauthenticated', theme: 'light' },
  });
  assert.deepEqual(unauthenticated.props, {
    partyId: '77',
    state: 'unauthenticated',
  });

  assert.throws(
    () => resolveComponentStateAdapter('mate.chat-access', {
      componentId: 'src/components/MateChatAccessStateRuntime.tsx#MateChatAccessStateRuntime',
      interactionTargetId: 'login',
      states: {
        data: 'single',
        interactions: 'hover',
        permissions: 'mate-applicant-pending',
      },
      variants: { state: 'unauthenticated', theme: 'light' },
    }),
    /지원하지 않는 MateChat access state/,
  );
});

test('mate chat approved adapter isolates loading, fallback, runtime, history, and connection states', () => {
  const runtime = resolveComponentStateAdapter('mate.chat-approved', {
    componentId: 'src/components/MateChatApprovedRuntime.tsx#MateChatApprovedRuntime',
    states: {
      data: 'unbroken-token',
      permissions: 'mate-host',
      system: 'offline',
    },
    variants: {
      history: 'loading',
      phase: 'runtime',
      revalidating: 'true',
      theme: 'dark',
    },
  });
  const runtimeOverride = runtime.props.visualQaStateOverride as {
    chatLoadError: string | null;
    hasOlderMessages: boolean;
    isConnected: boolean;
    isLoadingOlderMessages: boolean;
    messages: Array<{ message: string }>;
    viewPhase: string;
  };
  assert.equal(runtime.props.isHost, true);
  assert.equal(runtime.props.isPartyRevalidating, true);
  assert.equal(runtimeOverride.chatLoadError, null);
  assert.equal(runtimeOverride.hasOlderMessages, true);
  assert.equal(runtimeOverride.isConnected, false);
  assert.equal(runtimeOverride.isLoadingOlderMessages, true);
  assert.match(runtimeOverride.messages[0]?.message ?? '', /^MESSAGE-/);
  assert.equal(runtimeOverride.viewPhase, 'runtime');
  assert.equal(runtime.captureSelector, '[data-testid="mate-chat-view"]');
  assert.equal(runtime.theme, 'dark');

  const pending = resolveComponentStateAdapter('mate.chat-approved', {
    componentId: 'src/components/MateChatApprovedRuntime.tsx#MateChatApprovedRuntime',
    states: {
      data: 'loading',
      permissions: 'mate-member-approved',
      system: 'online',
    },
    variants: {
      history: 'none',
      phase: 'messages-loading',
      revalidating: 'false',
      theme: 'light',
    },
  });
  const pendingOverride = pending.props.visualQaStateOverride as {
    messagesPending: boolean;
    viewPhase: string;
  };
  assert.equal(pendingOverride.messagesPending, true);
  assert.equal(pendingOverride.viewPhase, 'messages-loading');
  assert.equal(pending.captureSelector, '[data-testid="mate-chat-approved-runtime-fallback"]');

  assert.throws(
    () => resolveComponentStateAdapter('mate.chat-approved', {
      componentId: 'src/components/MateChatApprovedRuntime.tsx#MateChatApprovedRuntime',
      states: {
        data: 'empty',
        permissions: 'mate-host',
        system: 'offline',
      },
      variants: {
        history: 'available',
        phase: 'view-fallback',
        revalidating: 'true',
        theme: 'light',
      },
    }),
    /지원하지 않는 MateChat approved state/,
  );
});

test('mate chat composer adapter maps message pressure, preview failure, upload, and connection states', () => {
  const brokenPreview = resolveComponentStateAdapter('mate.chat-composer', {
    componentId: 'src/components/MateChatComposerPanel.tsx#MateChatComposerPanel',
    interactionTargetId: 'cancel',
    states: {
      data: 'broken-image',
      interactions: 'focus-visible',
      system: 'offline',
    },
    variants: { media: 'preview', theme: 'dark' },
  });
  assert.equal(brokenPreview.props.messageText, '');
  assert.match(String(brokenPreview.props.imagePreviewUrl), /^data:image\/png/);
  assert.equal(brokenPreview.props.isConnected, false);
  assert.equal(brokenPreview.props.isUploadingImage, false);
  assert.equal(brokenPreview.captureSelector, '[data-testid="mate-chat-composer-panel"]');
  assert.equal(brokenPreview.theme, 'dark');

  const uploading = resolveComponentStateAdapter('mate.chat-composer', {
    componentId: 'src/components/MateChatComposerPanel.tsx#MateChatComposerPanel',
    states: {
      data: 'unbroken-token',
      interactions: 'default',
      system: 'online',
    },
    variants: { media: 'uploading', theme: 'light' },
  });
  assert.match(String(uploading.props.messageText), /^MESSAGE-/);
  assert.equal(uploading.props.isUploadingImage, true);

  assert.throws(
    () => resolveComponentStateAdapter('mate.chat-composer', {
      componentId: 'src/components/MateChatComposerPanel.tsx#MateChatComposerPanel',
      states: {
        data: 'broken-image',
        interactions: 'default',
        system: 'online',
      },
      variants: { media: 'none', theme: 'light' },
    }),
    /지원하지 않는 MateChat composer state/,
  );
});

test('mate chat conversation adapter maps ownership, history, failures, and lazy composer phases', () => {
  const mixedHistory = resolveComponentStateAdapter('mate.chat-conversation', {
    componentId: 'src/components/MateChatConversationPanel.tsx#MateChatConversationPanel',
    interactionTargetId: 'load-older',
    states: {
      data: 'populated',
      permissions: 'mate-member-approved',
      interactions: 'focus-visible',
      system: 'offline',
    },
    variants: {
      composer: 'runtime',
      history: 'available',
      ownership: 'mixed',
      theme: 'dark',
    },
  });
  const messages = mixedHistory.props.groupedMessages as Array<{ messages: Array<{ senderId: number }> }>;
  assert.equal(messages[0]?.messages.length, 2);
  assert.deepEqual(new Set(messages[0]?.messages.map(({ senderId }) => senderId)), new Set([21, 42]));
  assert.equal(mixedHistory.props.hasOlderMessages, true);
  assert.equal(mixedHistory.props.isLoadingOlderMessages, false);
  assert.equal(mixedHistory.props.isConnected, false);
  assert.equal(mixedHistory.captureSelector, '[data-testid="mate-chat-conversation-panel"]');
  assert.equal(mixedHistory.theme, 'dark');

  const brokenImage = resolveComponentStateAdapter('mate.chat-conversation', {
    componentId: 'src/components/MateChatConversationPanel.tsx#MateChatConversationPanel',
    states: {
      data: 'broken-image',
      permissions: 'mate-member-approved',
      interactions: 'default',
      system: 'online',
    },
    variants: {
      composer: 'runtime',
      history: 'none',
      ownership: 'theirs',
      theme: 'light',
    },
  });
  const brokenMessages = brokenImage.props.groupedMessages as Array<{ messages: Array<{ imageUrl?: string }> }>;
  assert.match(String(brokenMessages[0]?.messages[0]?.imageUrl), /^data:image\/png/);

  const fallback = resolveComponentStateAdapter('mate.chat-conversation', {
    componentId: 'src/components/MateChatConversationPanel.tsx#MateChatConversationPanel',
    states: {
      data: 'empty',
      permissions: 'mate-member-approved',
      interactions: 'default',
      system: 'online',
    },
    variants: {
      composer: 'fallback',
      history: 'none',
      ownership: 'mine',
      theme: 'light',
    },
  });
  assert.equal(fallback.props.visualQaComposerPhase, 'fallback');

  assert.throws(
    () => resolveComponentStateAdapter('mate.chat-conversation', {
      componentId: 'src/components/MateChatConversationPanel.tsx#MateChatConversationPanel',
      states: {
        data: 'empty',
        permissions: 'mate-host',
        interactions: 'default',
        system: 'offline',
      },
      variants: {
        composer: 'fallback',
        history: 'available',
        ownership: 'mixed',
        theme: 'light',
      },
    }),
    /지원하지 않는 MateChat conversation state/,
  );
});

test('mate chat page adapter isolates the lazy fallback and resolved handoff', () => {
  const fallback = resolveComponentStateAdapter('mate.chat-page', {
    componentId: 'src/components/MateChatPage.tsx#MateChatPage',
    states: { data: 'single' },
    variants: { phase: 'fallback', theme: 'dark' },
  });
  assert.equal(fallback.props.visualQaPhase, 'fallback');
  assert.equal(fallback.captureSelector, '[data-testid="mate-chat-page-fallback"]');
  assert.equal(fallback.initialPathname, '/mate/77/chat');
  assert.equal(fallback.theme, 'dark');

  const runtime = resolveComponentStateAdapter('mate.chat-page', {
    componentId: 'src/components/MateChatPage.tsx#MateChatPage',
    states: { data: 'single' },
    variants: { phase: 'runtime', theme: 'light' },
  });
  const runtimeOverride = runtime.props.visualQaRuntimeStateOverride as {
    currentUser: { id: number };
    party: { id: number };
  };
  assert.equal(runtime.props.visualQaPhase, 'runtime');
  assert.equal(runtimeOverride.currentUser.id, 42);
  assert.equal(runtimeOverride.party.id, 77);
  assert.equal(runtime.captureSelector, '[data-testid="mate-chat-approved-fallback"]');

  assert.throws(
    () => resolveComponentStateAdapter('mate.chat-page', {
      componentId: 'src/components/MateChatPage.tsx#MateChatPage',
      states: { data: 'loading' },
      variants: { phase: 'runtime', theme: 'light' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('mate chat view adapter maps role, pressure metadata, child phases, and header actions', () => {
  const host = resolveComponentStateAdapter('mate.chat-view', {
    componentId: 'src/components/MateChatViewRuntime.tsx#MateChatViewRuntime',
    interactionTargetId: 'manage',
    states: {
      data: 'single',
      permissions: 'mate-host',
      interactions: 'focus-visible',
      system: 'online',
    },
    variants: { state: 'base', theme: 'dark' },
  });
  assert.equal(host.props.isHost, true);
  assert.equal(host.props.canAccessCheckIn, false);
  assert.equal(host.props.visualQaConversationPhase, 'runtime');
  assert.equal(host.captureSelector, '[data-testid="mate-chat-view"]');
  assert.equal(host.theme, 'dark');

  const pressure = resolveComponentStateAdapter('mate.chat-view', {
    componentId: 'src/components/MateChatViewRuntime.tsx#MateChatViewRuntime',
    states: {
      data: 'unbroken-token',
      permissions: 'mate-member-approved',
      interactions: 'default',
      system: 'online',
    },
    variants: { state: 'base', theme: 'light' },
  });
  const pressureParty = pressure.props.party as { section: string; stadium: string };
  assert.match(pressureParty.stadium, /^STADIUM-/);
  assert.match(pressureParty.section, /^SECTION-/);

  const fallback = resolveComponentStateAdapter('mate.chat-view', {
    componentId: 'src/components/MateChatViewRuntime.tsx#MateChatViewRuntime',
    states: {
      data: 'single',
      permissions: 'mate-member-approved',
      interactions: 'default',
      system: 'online',
    },
    variants: { state: 'conversation-fallback', theme: 'light' },
  });
  assert.equal(fallback.props.visualQaConversationPhase, 'fallback');

  assert.throws(
    () => resolveComponentStateAdapter('mate.chat-view', {
      componentId: 'src/components/MateChatViewRuntime.tsx#MateChatViewRuntime',
      states: {
        data: 'long-korean',
        permissions: 'mate-host',
        interactions: 'default',
        system: 'offline',
      },
      variants: { state: 'checkin', theme: 'light' },
    }),
    /지원하지 않는 MateChat view state/,
  );
});

test('mate check-in adapter maps route recovery, entry mode, validation, and lazy content', () => {
  const loading = resolveComponentStateAdapter('mate.check-in', {
    componentId: 'src/components/MateCheckIn.tsx#MateCheckIn',
    states: { data: 'loading', permissions: 'anonymous', interactions: 'default' },
    variants: { phase: 'auth-loading', entry: 'manual', validation: 'idle', theme: 'dark' },
  });
  assert.equal((loading.props.visualQaStateOverride as { isAuthLoading: boolean }).isAuthLoading, true);
  assert.equal(loading.captureSelector, '[data-testid="mate-check-in-loading"]');

  const pressure = resolveComponentStateAdapter('mate.check-in', {
    componentId: 'src/components/MateCheckIn.tsx#MateCheckIn',
    states: { data: 'unbroken-token', permissions: 'mate-member-approved', interactions: 'default' },
    variants: { phase: 'party-error', entry: 'manual', validation: 'idle', theme: 'light' },
  });
  assert.match(
    (pressure.props.visualQaStateOverride as { partyError: string }).partyError,
    /^CHECK-IN-PARTY-/,
  );

  const runtime = resolveComponentStateAdapter('mate.check-in', {
    componentId: 'src/components/MateCheckIn.tsx#MateCheckIn',
    states: { data: 'single', permissions: 'mate-host', interactions: 'default' },
    variants: { phase: 'runtime', entry: 'qr', validation: 'idle', theme: 'dark' },
  });
  const runtimeOverride = runtime.props.visualQaStateOverride as {
    currentUser: { id: number };
    qrSessionId: string;
    visualQaContentPhase: string;
  };
  assert.equal(runtimeOverride.currentUser.id, 11);
  assert.equal(runtimeOverride.qrSessionId, 'visual-qa-session');
  assert.equal(runtimeOverride.visualQaContentPhase, 'runtime');
  assert.equal(runtime.captureSelector, '[data-testid="mate-check-in"]');

  const invalid = resolveComponentStateAdapter('mate.check-in', {
    componentId: 'src/components/MateCheckIn.tsx#MateCheckIn',
    states: { data: 'single', permissions: 'mate-member-approved', interactions: 'default' },
    variants: { phase: 'runtime', entry: 'manual', validation: 'invalid', theme: 'light' },
  });
  assert.equal(
    (invalid.props.visualQaStateOverride as { manualCodeError: string }).manualCodeError,
    '수동 체크인 코드를 4자리 숫자로 입력해주세요.',
  );

  assert.throws(
    () => resolveComponentStateAdapter('mate.check-in', {
      componentId: 'src/components/MateCheckIn.tsx#MateCheckIn',
      states: { data: 'loading', permissions: 'mate-host', interactions: 'pressed' },
      variants: { phase: 'runtime', entry: 'qr', validation: 'invalid', theme: 'dark' },
    }),
    /지원하지 않는 MateCheckIn state/,
  );
});

test('mate check-in action adapter maps every visible progress state and fails closed', () => {
  const ready = resolveComponentStateAdapter('mate.check-in-action', {
    componentId: 'src/components/MateCheckInActionRuntime.tsx#MateCheckInActionRuntime',
    states: { data: 'single', permissions: 'mate-member-approved', interactions: 'default' },
    variants: { state: 'ready', theme: 'light' },
  });
  assert.equal(ready.props.isCheckedIn, false);
  assert.equal(ready.props.isChecking, false);
  assert.equal(ready.props.checkedInCount, 1);
  assert.equal(ready.captureSelector, '[data-testid="mate-check-in-action-runtime"]');

  const waitingHost = resolveComponentStateAdapter('mate.check-in-action', {
    componentId: 'src/components/MateCheckInActionRuntime.tsx#MateCheckInActionRuntime',
    states: { data: 'single', permissions: 'mate-host', interactions: 'default' },
    variants: { state: 'waiting', theme: 'dark' },
  });
  assert.equal(waitingHost.props.isCheckedIn, true);
  assert.equal(waitingHost.props.allCheckedIn, false);
  assert.equal(waitingHost.props.isHost, true);
  assert.equal(waitingHost.theme, 'dark');

  const maximum = resolveComponentStateAdapter('mate.check-in-action', {
    componentId: 'src/components/MateCheckInActionRuntime.tsx#MateCheckInActionRuntime',
    states: { data: 'maximum-supported', permissions: 'mate-member-approved', interactions: 'default' },
    variants: { state: 'ready', theme: 'light' },
  });
  assert.equal(maximum.props.checkedInCount, Number.MAX_SAFE_INTEGER);
  assert.equal(maximum.props.totalParticipants, Number.MAX_SAFE_INTEGER);

  const focusedPrimary = resolveComponentStateAdapter('mate.check-in-action', {
    componentId: 'src/components/MateCheckInActionRuntime.tsx#MateCheckInActionRuntime',
    states: { data: 'single', permissions: 'mate-member-approved', interactions: 'focus-visible' },
    variants: { state: 'complete', theme: 'light' },
    interactionTargetId: 'primary',
  });
  assert.equal(focusedPrimary.props.allCheckedIn, true);

  assert.throws(
    () => resolveComponentStateAdapter('mate.check-in-action', {
      componentId: 'src/components/MateCheckInActionRuntime.tsx#MateCheckInActionRuntime',
      states: { data: 'maximum-supported', permissions: 'mate-member-approved', interactions: 'pressed' },
      variants: { state: 'ready', theme: 'dark' },
      interactionTargetId: 'primary',
    }),
    /지원하지 않는 MateCheckInActionRuntime state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.check-in-action', {
      componentId: 'src/components/MateCheckInActionRuntime.tsx#MateCheckInActionRuntime',
      states: { data: 'single', permissions: 'mate-member-approved', interactions: 'hover' },
      variants: { state: 'waiting', theme: 'light' },
      interactionTargetId: 'primary',
    }),
    /지원하지 않는 MateCheckInActionRuntime state/,
  );
});

test('mate check-in content adapter maps lazy boundaries, transport pressure, and roster density', () => {
  const ready = resolveComponentStateAdapter('mate.check-in-content', {
    componentId: 'src/components/MateCheckInContentRuntime.tsx#MateCheckInContentRuntime',
    states: {
      data: 'single',
      permissions: 'mate-member-approved',
      interactions: 'default',
      system: 'online',
    },
    variants: { phase: 'runtime', state: 'ready', entry: 'manual', theme: 'light' },
  });
  assert.equal(ready.props.isCheckedIn, false);
  assert.equal(ready.props.isChecking, false);
  assert.equal((ready.props.checkInStatus as unknown[]).length, 0);
  assert.equal(ready.captureSelector, '[data-testid="mate-check-in-content"]');

  const pressure = resolveComponentStateAdapter('mate.check-in-content', {
    componentId: 'src/components/MateCheckInContentRuntime.tsx#MateCheckInContentRuntime',
    states: {
      data: 'unbroken-token',
      permissions: 'mate-member-approved',
      interactions: 'default',
      system: 'offline',
    },
    variants: { phase: 'runtime', state: 'ready', entry: 'manual', theme: 'dark' },
  });
  assert.match(pressure.props.statusLoadError as string, /^CHECK-IN-STATUS-/);

  const maximum = resolveComponentStateAdapter('mate.check-in-content', {
    componentId: 'src/components/MateCheckInContentRuntime.tsx#MateCheckInContentRuntime',
    states: {
      data: 'maximum-supported',
      permissions: 'mate-member-approved',
      interactions: 'default',
      system: 'online',
    },
    variants: { phase: 'runtime', state: 'waiting', entry: 'manual', theme: 'light' },
  });
  assert.equal(maximum.props.totalParticipants, 12);
  assert.equal((maximum.props.checkInStatus as unknown[]).length, 11);

  const actionFallback = resolveComponentStateAdapter('mate.check-in-content', {
    componentId: 'src/components/MateCheckInContentRuntime.tsx#MateCheckInContentRuntime',
    states: {
      data: 'single',
      permissions: 'mate-host',
      interactions: 'default',
      system: 'online',
    },
    variants: { phase: 'action-fallback', state: 'ready', entry: 'manual', theme: 'dark' },
  });
  assert.equal(
    (actionFallback.props.visualQaStateOverride as { actionPhase: string }).actionPhase,
    'fallback',
  );

  const focusedRetry = resolveComponentStateAdapter('mate.check-in-content', {
    componentId: 'src/components/MateCheckInContentRuntime.tsx#MateCheckInContentRuntime',
    states: {
      data: 'single',
      permissions: 'mate-member-approved',
      interactions: 'focus-visible',
      system: 'offline',
    },
    variants: { phase: 'runtime', state: 'ready', entry: 'manual', theme: 'light' },
    interactionTargetId: 'retry',
  });
  assert.equal(focusedRetry.props.statusLoadError, '체크인 현황을 불러오지 못했습니다.');

  assert.throws(
    () => resolveComponentStateAdapter('mate.check-in-content', {
      componentId: 'src/components/MateCheckInContentRuntime.tsx#MateCheckInContentRuntime',
      states: {
        data: 'long-korean',
        permissions: 'mate-member-approved',
        interactions: 'default',
        system: 'online',
      },
      variants: { phase: 'runtime', state: 'ready', entry: 'manual', theme: 'light' },
    }),
    /지원하지 않는 MateCheckInContentRuntime state/,
  );
});

test('mate check-in overview adapter maps pressure, role, entry, and progress states fail closed', () => {
  const componentId = 'src/components/MateCheckInOverviewRuntime.tsx#MateCheckInOverviewRuntime';
  const ready = resolveComponentStateAdapter('mate.check-in-overview', {
    componentId,
    states: { data: 'single', permissions: 'mate-member-approved' },
    variants: { state: 'ready', entry: 'manual', theme: 'light' },
  });
  assert.equal(ready.props.isHost, false);
  assert.equal(ready.props.isCheckedIn, false);
  assert.equal(ready.props.checkedInCount, 0);
  assert.equal(ready.captureSelector, '[data-testid="mate-check-in-overview"]');

  const pressure = resolveComponentStateAdapter('mate.check-in-overview', {
    componentId,
    states: { data: 'unbroken-token', permissions: 'mate-member-approved' },
    variants: { state: 'ready', entry: 'manual', theme: 'dark' },
  });
  assert.match((pressure.props.party as { section: string }).section, /^SECTION/);

  const maximum = resolveComponentStateAdapter('mate.check-in-overview', {
    componentId,
    states: { data: 'maximum-supported', permissions: 'mate-member-approved' },
    variants: { state: 'waiting', entry: 'manual', theme: 'light' },
  });
  assert.equal(maximum.props.checkedInCount, Number.MAX_SAFE_INTEGER - 1);
  assert.equal(maximum.props.totalParticipants, Number.MAX_SAFE_INTEGER);
  assert.equal(maximum.props.remainingCount, 1);

  const qrHost = resolveComponentStateAdapter('mate.check-in-overview', {
    componentId,
    states: { data: 'single', permissions: 'mate-host' },
    variants: { state: 'complete', entry: 'qr', theme: 'dark' },
  });
  assert.equal(qrHost.props.isHost, true);
  assert.equal(qrHost.props.allCheckedIn, true);
  assert.equal(qrHost.props.qrSessionId, 'visual-qa-session');

  assert.throws(
    () => resolveComponentStateAdapter('mate.check-in-overview', {
      componentId,
      states: { data: 'long-korean', permissions: 'mate-host' },
      variants: { state: 'ready', entry: 'manual', theme: 'light' },
    }),
    /지원하지 않는 MateCheckInOverviewRuntime state/,
  );
});

test('mate check-in page adapter isolates fallback and resolved runtime fail closed', () => {
  const componentId = 'src/components/MateCheckInPage.tsx#MateCheckInPage';
  const fallback = resolveComponentStateAdapter('mate.check-in-page', {
    componentId,
    states: { data: 'single' },
    variants: { phase: 'fallback', theme: 'dark' },
  });
  assert.equal(fallback.props.visualQaPhase, 'fallback');
  assert.equal(fallback.captureSelector, '[data-testid="mate-check-in-page-fallback"]');
  assert.equal(fallback.theme, 'dark');

  const runtime = resolveComponentStateAdapter('mate.check-in-page', {
    componentId,
    states: { data: 'single' },
    variants: { phase: 'runtime', theme: 'light' },
  });
  assert.equal(runtime.props.visualQaPhase, 'runtime');
  assert.ok(runtime.props.visualQaRuntimeStateOverride);
  assert.equal(runtime.captureSelector, '[data-testid="mate-check-in"]');
  assert.equal(runtime.initialPathname, '/mate/77/check-in');

  assert.throws(
    () => resolveComponentStateAdapter('mate.check-in-page', {
      componentId,
      states: { data: 'long-korean' },
      variants: { phase: 'runtime', theme: 'light' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('mate check-in roster adapter maps density, identity, progress, and chat states fail closed', () => {
  const componentId = 'src/components/MateCheckInRosterRuntime.tsx#MateCheckInRosterRuntime';
  const empty = resolveComponentStateAdapter('mate.check-in-roster', {
    componentId,
    states: { data: 'single', permissions: 'mate-member-approved', interactions: 'default' },
    variants: { state: 'empty', theme: 'light' },
  });
  assert.equal(empty.props.hasAnyCheckIn, false);
  assert.equal(empty.props.hostCheckedIn, false);
  assert.equal((empty.props.otherCheckIns as unknown[]).length, 0);
  assert.equal(empty.captureSelector, '[data-testid="mate-check-in-roster"]');

  const maximum = resolveComponentStateAdapter('mate.check-in-roster', {
    componentId,
    states: { data: 'maximum-supported', permissions: 'mate-member-approved', interactions: 'default' },
    variants: { state: 'partial', theme: 'dark' },
  });
  assert.equal((maximum.props.otherCheckIns as unknown[]).length, 9);
  assert.equal(maximum.props.remainingCount, 1);

  const pressure = resolveComponentStateAdapter('mate.check-in-roster', {
    componentId,
    states: { data: 'unbroken-token', permissions: 'mate-member-approved', interactions: 'default' },
    variants: { state: 'partial', theme: 'light' },
  });
  assert.match((pressure.props.party as { hostName: string }).hostName, /^HOST/);
  assert.match((pressure.props.otherCheckIns as Array<{ userName: string }>)[0].userName, /^PARTICIPANT/);

  const focusedChat = resolveComponentStateAdapter('mate.check-in-roster', {
    componentId,
    states: { data: 'single', permissions: 'mate-host', interactions: 'focus-visible' },
    variants: { state: 'complete', theme: 'dark' },
    interactionTargetId: 'chat',
  });
  assert.equal(focusedChat.props.isHost, true);

  assert.throws(
    () => resolveComponentStateAdapter('mate.check-in-roster', {
      componentId,
      states: { data: 'long-korean', permissions: 'mate-host', interactions: 'default' },
      variants: { state: 'partial', theme: 'light' },
    }),
    /지원하지 않는 MateCheckInRosterRuntime state/,
  );
});

test('mate check-in status adapter maps entry, progress, pressure, and actions fail closed', () => {
  const componentId = 'src/components/MateCheckInStatusRuntime.tsx#MateCheckInStatusRuntime';
  const ready = resolveComponentStateAdapter('mate.check-in-status', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { state: 'ready', entry: 'manual', theme: 'light' },
  });
  assert.equal(ready.props.isCheckedIn, false);
  assert.equal(ready.props.progressValue, 0);
  assert.equal(ready.props.sessionLabel, '일반 진입');
  assert.equal(ready.captureSelector, '[data-testid="mate-check-in-status"]');

  const qrWaiting = resolveComponentStateAdapter('mate.check-in-status', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { state: 'waiting', entry: 'qr', theme: 'dark' },
  });
  assert.equal(qrWaiting.props.isCheckedIn, true);
  assert.equal(qrWaiting.props.sessionLabel, 'QR 세션 진입');
  assert.equal(qrWaiting.props.progressValue, 50);

  const maximum = resolveComponentStateAdapter('mate.check-in-status', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: { state: 'waiting', entry: 'manual', theme: 'light' },
  });
  assert.equal(maximum.props.checkedInCount, Number.MAX_SAFE_INTEGER - 1);
  assert.equal(maximum.props.totalParticipants, Number.MAX_SAFE_INTEGER);

  const focusedComplete = resolveComponentStateAdapter('mate.check-in-status', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { state: 'complete', entry: 'qr', theme: 'dark' },
    interactionTargetId: 'complete',
  });
  assert.equal(focusedComplete.props.allCheckedIn, true);

  assert.throws(
    () => resolveComponentStateAdapter('mate.check-in-status', {
      componentId,
      states: { data: 'unbroken-token', interactions: 'pressed' },
      variants: { state: 'waiting', entry: 'manual', theme: 'light' },
      interactionTargetId: 'check-in',
    }),
    /지원하지 않는 MateCheckInStatusRuntime state/,
  );
});

test('mate create adapter isolates every lazy phase, pressure fixture, and navigation target fail closed', () => {
  const componentId = 'src/components/MateCreate.tsx#MateCreate';
  const ticketFallback = resolveComponentStateAdapter('mate.create', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { phase: 'ticket-fallback', theme: 'dark' },
  });
  assert.equal(
    (ticketFallback.props.visualQaStateOverride as { phase: string }).phase,
    'ticket-fallback',
  );
  assert.equal(ticketFallback.captureSelector, '[data-testid="mate-create"]');
  assert.equal(ticketFallback.initialPathname, '/mate/create');
  assert.equal(ticketFallback.theme, 'dark');

  const matchRuntime = resolveComponentStateAdapter('mate.create', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { phase: 'match-runtime', theme: 'light' },
  });
  const matchOverride = matchRuntime.props.visualQaStateOverride as {
    controller: { createStep: number; availableMatches: unknown[] };
    phase: string;
  };
  assert.equal(matchOverride.phase, 'match-runtime');
  assert.equal(matchOverride.controller.createStep, 2);
  assert.equal(matchOverride.controller.availableMatches.length, 1);

  const longDescription = resolveComponentStateAdapter('mate.create', {
    componentId,
    states: { data: 'long-korean', interactions: 'default' },
    variants: { phase: 'description-runtime', theme: 'light' },
  });
  assert.match(
    ((longDescription.props.visualQaStateOverride as {
      controller: { formData: { description: string }; blockedStepMessage: string };
    }).controller.formData.description),
    /모바일 화면/,
  );
  assert.match(
    ((longDescription.props.visualQaStateOverride as {
      controller: { blockedStepMessage: string };
    }).controller.blockedStepMessage),
    /모바일 화면/,
  );

  const tokenDescription = resolveComponentStateAdapter('mate.create', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { phase: 'description-runtime', theme: 'dark' },
  });
  assert.match(
    ((tokenDescription.props.visualQaStateOverride as {
      controller: { formData: { description: string } };
    }).controller.formData.description),
    /^DESCRIPTIONUNBROKEN/,
  );

  const focusedSubmit = resolveComponentStateAdapter('mate.create', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { phase: 'description-runtime', theme: 'dark' },
    interactionTargetId: 'submit',
  });
  assert.equal(
    (focusedSubmit.props.visualQaStateOverride as { controller: { createStep: number } })
      .controller.createStep,
    4,
  );

  const confirmFallback = resolveComponentStateAdapter('mate.create', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { phase: 'confirm-fallback', theme: 'light' },
  });
  assert.equal(
    (confirmFallback.props.visualQaStateOverride as {
      controller: { isConfirming: boolean; showVerificationDialog: boolean };
    }).controller.isConfirming,
    true,
  );
  assert.equal(
    (confirmFallback.props.visualQaStateOverride as {
      controller: { showVerificationDialog: boolean };
    }).controller.showVerificationDialog,
    false,
  );

  const verificationRuntime = resolveComponentStateAdapter('mate.create', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { phase: 'verification-runtime', theme: 'dark' },
  });
  assert.equal(
    (verificationRuntime.props.visualQaStateOverride as {
      controller: { isConfirming: boolean; showVerificationDialog: boolean };
    }).controller.isConfirming,
    false,
  );
  assert.equal(
    (verificationRuntime.props.visualQaStateOverride as {
      controller: { showVerificationDialog: boolean };
    }).controller.showVerificationDialog,
    true,
  );

  assert.throws(
    () => resolveComponentStateAdapter('mate.create', {
      componentId,
      states: { data: 'long-korean', interactions: 'pressed' },
      variants: { phase: 'ticket-runtime', theme: 'light' },
      interactionTargetId: 'next',
    }),
    /지원하지 않는 MateCreate state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.create', {
      componentId,
      states: { data: 'single', interactions: 'hover', system: 'online' },
      variants: { phase: 'match-runtime', theme: 'light' },
      interactionTargetId: 'next',
    }),
    /지원하지 않는 MateCreate state/,
  );
});

test('mate create confirmation adapter maps every summary branch, pressure class, and action fail closed', () => {
  const componentId = 'src/components/MateCreateConfirmDialog.tsx#MateCreateConfirmDialog';
  const ordinary = resolveComponentStateAdapter('mate.create-confirm-dialog', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: {
      submission: 'idle',
      deposit: 'present',
      seat: 'detailed',
      time: 'provided',
      cheering: 'home',
      theme: 'light',
    },
  });
  const ordinaryForm = ordinary.props.formData as {
    cheeringSide: string;
    gameTime: string;
    reservationDepositAmount: number;
    seatDetail: string;
  };
  assert.equal(ordinaryForm.cheeringSide, 'HOME');
  assert.equal(ordinaryForm.gameTime, '18:30');
  assert.equal(ordinaryForm.reservationDepositAmount, 10000);
  assert.equal(ordinaryForm.seatDetail, '305블록 12열 15번');
  assert.equal(ordinary.props.isSubmitting, false);
  assert.equal(ordinary.captureSelector, '[data-testid="mate-create-confirm-dialog"]');

  const legacyFallback = resolveComponentStateAdapter('mate.create-confirm-dialog', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: {
      submission: 'pending',
      deposit: 'none',
      seat: 'legacy-section',
      time: 'fallback',
      cheering: 'neutral',
      theme: 'dark',
    },
  });
  const legacyForm = legacyFallback.props.formData as {
    cheeringSide: string;
    gameTime: string;
    reservationDepositAmount: number;
    seatDetail: string;
    section: string;
  };
  assert.equal(legacyForm.cheeringSide, 'NEUTRAL');
  assert.equal(legacyForm.gameTime, '');
  assert.equal(legacyForm.reservationDepositAmount, 0);
  assert.equal(legacyForm.seatDetail, '');
  assert.equal(legacyForm.section, '1루 내야 101구역');
  assert.equal(legacyFallback.props.isSubmitting, true);
  assert.equal(legacyFallback.theme, 'dark');

  const pressure = resolveComponentStateAdapter('mate.create-confirm-dialog', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: {
      submission: 'idle',
      deposit: 'present',
      seat: 'detailed',
      time: 'provided',
      cheering: 'home',
      theme: 'light',
    },
  });
  assert.match((pressure.props.formData as { stadium: string }).stadium, /^STADIUMUNBROKEN/);
  assert.match((pressure.props.formData as { seatDetail: string }).seatDetail, /^SEATUNBROKEN/);
  assert.match((pressure.props.formData as { description: string }).description, /^DESCRIPTIONUNBROKEN/);

  const maximum = resolveComponentStateAdapter('mate.create-confirm-dialog', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: {
      submission: 'idle',
      deposit: 'present',
      seat: 'detailed',
      time: 'provided',
      cheering: 'home',
      theme: 'dark',
    },
  });
  const maximumForm = maximum.props.formData as {
    description: string;
    maxParticipants: number;
    ticketPrice: number;
  };
  assert.equal(maximumForm.description.length, 200);
  assert.equal(maximumForm.maxParticipants, 4);
  assert.equal(maximumForm.ticketPrice, Number.MAX_SAFE_INTEGER);

  const focusedCancel = resolveComponentStateAdapter('mate.create-confirm-dialog', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible' },
    variants: {
      submission: 'idle',
      deposit: 'none',
      seat: 'legacy-section',
      time: 'fallback',
      cheering: 'away',
      theme: 'dark',
    },
    interactionTargetId: 'cancel',
  });
  assert.equal(focusedCancel.props.isSubmitting, false);

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-confirm-dialog', {
      componentId,
      states: { data: 'long-korean', interactions: 'hover' },
      variants: {
        submission: 'idle',
        deposit: 'present',
        seat: 'detailed',
        time: 'provided',
        cheering: 'home',
        theme: 'light',
      },
      interactionTargetId: 'confirm',
    }),
    /지원하지 않는 MateCreateConfirmDialog state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.create-confirm-dialog', {
      componentId,
      states: { data: 'single', interactions: 'pressed' },
      variants: {
        submission: 'pending',
        deposit: 'present',
        seat: 'detailed',
        time: 'provided',
        cheering: 'home',
        theme: 'light',
      },
      interactionTargetId: 'confirm',
    }),
    /지원하지 않는 MateCreateConfirmDialog state/,
  );
});

test('mate create description adapter maps count colors, validation, selected tags, and targets fail closed', () => {
  const componentId = 'src/components/MateCreateDescriptionStep.tsx#MateCreateDescriptionStep';
  const ordinary = resolveComponentStateAdapter('mate.create-description-step', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { validation: 'none', theme: 'light' },
  });
  const ordinaryForm = ordinary.props.formData as { description: string };
  assert.match(ordinaryForm.description, /#열정응원🔥/);
  assert.deepEqual(ordinary.props.formErrors, { description: '', ticketFile: '' });
  assert.equal(ordinary.captureSelector, '[data-testid="mate-create-description-step"]');

  const invalid = resolveComponentStateAdapter('mate.create-description-step', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { validation: 'error', theme: 'dark' },
  });
  assert.match(
    (invalid.props.formErrors as { description: string }).description,
    /사용할 수 없는 표현/,
  );
  assert.equal(invalid.theme, 'dark');

  const longKorean = resolveComponentStateAdapter('mate.create-description-step', {
    componentId,
    states: { data: 'long-korean', interactions: 'default' },
    variants: { validation: 'none', theme: 'light' },
  });
  assert.equal((longKorean.props.formData as { description: string }).description.length, 170);

  const unbroken = resolveComponentStateAdapter('mate.create-description-step', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { validation: 'none', theme: 'dark' },
  });
  const unbrokenDescription = (unbroken.props.formData as { description: string }).description;
  assert.match(unbrokenDescription, /^DESCRIPTIONUNBROKEN/);
  assert.equal(unbrokenDescription.length, 200);

  const maximum = resolveComponentStateAdapter('mate.create-description-step', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: { validation: 'none', theme: 'light' },
  });
  const maximumDescription = (maximum.props.formData as { description: string }).description;
  assert.equal(maximumDescription.length, 200);
  assert.match(maximumDescription, /#직관승요🧚/);

  const focusedInput = resolveComponentStateAdapter('mate.create-description-step', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { validation: 'none', theme: 'dark' },
    interactionTargetId: 'description',
  });
  assert.equal(focusedInput.theme, 'dark');

  const hoveredTag = resolveComponentStateAdapter('mate.create-description-step', {
    componentId,
    states: { data: 'single', interactions: 'hover' },
    variants: { validation: 'error', theme: 'light' },
    interactionTargetId: 'tag-5',
  });
  assert.equal(hoveredTag.theme, 'light');

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-description-step', {
      componentId,
      states: { data: 'long-korean', interactions: 'pressed' },
      variants: { validation: 'none', theme: 'light' },
      interactionTargetId: 'tag-0',
    }),
    /지원하지 않는 MateCreateDescriptionStep state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.create-description-step', {
      componentId,
      states: { data: 'single', interactions: 'hover' },
      variants: { validation: 'none', theme: 'light' },
      interactionTargetId: 'description',
    }),
    /지원하지 않는 MateCreateDescriptionStep state/,
  );
});

test('mate create match adapter maps transport, result, manual, pressure, and targets fail closed', () => {
  const componentId = 'src/components/MateCreateMatchStep.tsx#MateCreateMatchStep';
  const selected = resolveComponentStateAdapter('mate.create-match-step', {
    componentId,
    states: { data: 'single', interactions: 'default', system: 'online' },
    variants: { phase: 'results-selected', theme: 'light' },
  });
  const selectedProps = selected.props as {
    availableMatches: Array<{ id: string }>;
    formData: { awayTeam: string; homeTeam: string };
  };
  assert.equal(selectedProps.availableMatches.length, 2);
  assert.equal(selectedProps.formData.awayTeam, 'lg');
  assert.equal(selectedProps.formData.homeTeam, 'doosan');
  assert.equal(selected.captureSelector, '[data-testid="mate-create-match-step"]');

  const timeout = resolveComponentStateAdapter('mate.create-match-step', {
    componentId,
    states: { data: 'long-korean', interactions: 'default', system: 'timeout' },
    variants: { phase: 'error', theme: 'dark' },
  });
  assert.match(timeout.props.matchLoadErrorMessage as string, /시간 안에 완료되지 않았습니다/);
  assert.equal(timeout.theme, 'dark');

  const token = resolveComponentStateAdapter('mate.create-match-step', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default', system: 'online' },
    variants: { phase: 'results-unselected', theme: 'light' },
  });
  assert.match(
    ((token.props.availableMatches as Array<{ stadium: string }>)[0]).stadium,
    /^STADIUMUNBROKEN/,
  );

  const maximum = resolveComponentStateAdapter('mate.create-match-step', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default', system: 'online' },
    variants: { phase: 'results-selected', theme: 'dark' },
  });
  assert.equal((maximum.props.availableMatches as unknown[]).length, 12);

  const focusedManual = resolveComponentStateAdapter('mate.create-match-step', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible', system: 'online' },
    variants: { phase: 'manual-complete', theme: 'dark' },
    interactionTargetId: 'manual-stadium',
  });
  assert.equal((focusedManual.props.formData as { stadium: string }).stadium, '잠실야구장');

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-match-step', {
      componentId,
      states: { data: 'single', interactions: 'hover', system: 'online' },
      variants: { phase: 'loading', theme: 'light' },
      interactionTargetId: 'retry',
    }),
    /지원하지 않는 MateCreateMatchStep state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.create-match-step', {
      componentId,
      states: { data: 'maximum-supported', interactions: 'focus-visible', system: 'online' },
      variants: { phase: 'results-selected', theme: 'light' },
      interactionTargetId: 'match-first',
    }),
    /지원하지 않는 MateCreateMatchStep state/,
  );
});

test('mate create page adapter isolates fallback and resolved runtime fail closed', () => {
  const componentId = 'src/components/MateCreatePage.tsx#MateCreatePage';
  const fallback = resolveComponentStateAdapter('mate.create-page', {
    componentId,
    states: { data: 'single' },
    variants: { phase: 'fallback', theme: 'dark' },
  });
  assert.equal(fallback.props.visualQaPhase, 'fallback');
  assert.equal(fallback.captureSelector, '[data-testid="mate-create-page-fallback"]');
  assert.equal(fallback.theme, 'dark');

  const runtime = resolveComponentStateAdapter('mate.create-page', {
    componentId,
    states: { data: 'single' },
    variants: { phase: 'runtime', theme: 'light' },
  });
  const runtimeOverride = runtime.props.visualQaRuntimeStateOverride as {
    controller: { createStep: number };
    phase: string;
  };
  assert.equal(runtime.props.visualQaPhase, 'runtime');
  assert.equal(runtimeOverride.controller.createStep, 1);
  assert.equal(runtimeOverride.phase, 'ticket-runtime');
  assert.equal(runtime.captureSelector, '[data-testid="mate-create"]');
  assert.equal(runtime.initialPathname, '/mate/create');

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-page', {
      componentId,
      states: { data: 'long-korean' },
      variants: { phase: 'runtime', theme: 'light' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('mate detail page adapter isolates fallback and resolved runtime fail closed', () => {
  const componentId = 'src/components/MateDetail.tsx#MateDetail';
  const fallback = resolveComponentStateAdapter('mate.detail-page', {
    componentId,
    states: { data: 'single' },
    variants: { phase: 'fallback', theme: 'dark' },
  });
  assert.equal(fallback.props.visualQaPhase, 'fallback');
  assert.equal(fallback.captureSelector, '[data-testid="mate-detail-page-fallback"]');
  assert.equal(fallback.theme, 'dark');

  const runtime = resolveComponentStateAdapter('mate.detail-page', {
    componentId,
    states: { data: 'single' },
    variants: { phase: 'runtime', theme: 'light' },
  });
  assert.equal(runtime.props.visualQaPhase, 'runtime');
  assert.equal(runtime.captureSelector, '[data-testid="mate-detail-runtime"][data-phase="error"]');
  assert.equal(runtime.initialPathname, '/mate/visual-qa-missing-id');
  assert.equal(runtime.theme, 'light');

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-page', {
      componentId,
      states: { data: 'long-korean' },
      variants: { phase: 'runtime', theme: 'light' },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('mate detail action dialog adapter maps both forms, pressure, selection, pending, and real controls fail closed', () => {
  const componentId = 'src/components/MateDetailActionDialogs.tsx#MateDetailActionDialogs';
  const cancel = resolveComponentStateAdapter('mate.detail-action-dialog', {
    componentId,
    states: { data: 'long-korean', interactions: 'default' },
    variants: {
      dialog: 'cancel',
      pending: 'idle',
      selection: 'last',
      validation: 'none',
      theme: 'dark',
    },
  });
  assert.equal(cancel.props.showCancelDialog, true);
  assert.equal(cancel.props.showSaleDialog, false);
  assert.equal(cancel.props.selectedCancelReason, 'OTHER');
  assert.match(String(cancel.props.cancelMemo), /모바일/);
  assert.equal(cancel.captureSelector, '[data-testid="mate-detail-cancel-dialog"]');
  assert.equal(cancel.theme, 'dark');

  const sale = resolveComponentStateAdapter('mate.detail-action-dialog', {
    componentId,
    states: { data: 'single', interactions: 'input' },
    variants: {
      dialog: 'sale',
      pending: 'idle',
      selection: 'first',
      validation: 'none',
      theme: 'light',
    },
    interactionTargetId: 'sale-price',
  });
  assert.equal(sale.props.showCancelDialog, false);
  assert.equal(sale.props.showSaleDialog, true);
  assert.deepEqual(sale.props.visualQaStateOverride, { interactive: true });
  assert.equal(sale.captureSelector, '[data-testid="mate-detail-sale-dialog"]');

  const saleError = resolveComponentStateAdapter('mate.detail-action-dialog', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: {
      dialog: 'sale',
      pending: 'idle',
      selection: 'first',
      validation: 'error',
      theme: 'light',
    },
  });
  assert.match(String(saleError.props.salePriceError), /^SALEPRICEERROR-/);

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-action-dialog', {
      componentId,
      states: { data: 'maximum-supported', interactions: 'default' },
      variants: {
        dialog: 'sale',
        pending: 'idle',
        selection: 'first',
        validation: 'error',
        theme: 'light',
      },
    }),
    /지원하지 않는 MateDetailActionDialogs state/,
  );
});

test('mate detail action section adapter maps pressure, permissions, surfaces, pending states, and real controls fail closed', () => {
  const componentId = 'src/components/MateDetailActionSection.tsx#MateDetailActionSection';
  const hostSheet = resolveComponentStateAdapter('mate.detail-action-section', {
    componentId,
    states: {
      data: 'long-korean',
      permissions: 'mate-host',
      interactions: 'default',
    },
    variants: {
      actions: 'maximum',
      pending: 'share',
      surface: 'mobile-sheet',
      theme: 'dark',
    },
  });
  const hostProps = hostSheet.props as {
    actionButtons: Array<{ key: string }>;
    actionContext: { title: string };
    visualQaStateOverride: { layout: string; sheetOpen: boolean };
  };
  assert.deepEqual(hostProps.actionButtons.map(({ key }) => key), [
    'manage',
    'chat',
    'checkin',
    'sale',
  ]);
  assert.match(hostProps.actionContext.title, /모바일/);
  assert.deepEqual(hostProps.visualQaStateOverride, { layout: 'mobile', sheetOpen: true });
  assert.equal(hostSheet.props.isShareToCheerPending, true);
  assert.equal(hostSheet.captureSelector, '[data-testid="mate-detail-action-sheet"]');
  assert.equal(hostSheet.theme, 'dark');

  const awaitingPending = resolveComponentStateAdapter('mate.detail-action-section', {
    componentId,
    states: {
      data: 'single',
      permissions: 'mate-applicant-pending',
      interactions: 'default',
    },
    variants: {
      actions: 'minimal',
      pending: 'action',
      surface: 'mobile-bar',
      theme: 'light',
    },
  });
  const awaitingProps = awaitingPending.props as {
    actionButtons: Array<{ disabled?: boolean; key: string }>;
    primaryMobileAction: { disabled?: boolean; key: string };
  };
  assert.equal(awaitingProps.actionButtons[0]?.key, 'cancel');
  assert.equal(awaitingProps.actionButtons[0]?.disabled, true);
  assert.equal(awaitingProps.primaryMobileAction.disabled, true);
  assert.equal(awaitingPending.captureSelector, '[data-testid="mate-mobile-action-bar"]');

  const unavailable = resolveComponentStateAdapter('mate.detail-action-section', {
    componentId,
    states: {
      data: 'maximum-supported',
      permissions: 'disabled',
      interactions: 'default',
    },
    variants: {
      actions: 'minimal',
      pending: 'idle',
      surface: 'desktop-rail',
      theme: 'light',
    },
  });
  assert.deepEqual(unavailable.props.actionButtons, []);
  assert.equal(unavailable.props.primaryMobileAction, null);
  assert.equal((unavailable.props.party as { status: string }).status, 'SELLING');
  assert.equal(unavailable.captureSelector, '[data-testid="mate-desktop-action-rail"]');

  const open = resolveComponentStateAdapter('mate.detail-action-section', {
    componentId,
    states: {
      data: 'single',
      permissions: 'mate-host',
      interactions: 'open',
    },
    variants: {
      actions: 'maximum',
      pending: 'idle',
      surface: 'mobile-bar',
      theme: 'light',
    },
    interactionTargetId: 'mobile-summary',
  });
  assert.deepEqual(open.props.visualQaStateOverride, { layout: 'mobile', sheetOpen: false });
  assert.equal(open.captureSelector, '[data-testid="mate-detail-action-sheet"]');

  const escape = resolveComponentStateAdapter('mate.detail-action-section', {
    componentId,
    states: {
      data: 'single',
      permissions: 'mate-host',
      interactions: 'keyboard-navigation',
    },
    variants: {
      actions: 'maximum',
      pending: 'idle',
      surface: 'mobile-sheet',
      theme: 'dark',
    },
    interactionTargetId: 'sheet-close',
  });
  assert.deepEqual(escape.props.visualQaStateOverride, { layout: 'mobile', sheetOpen: true });
  assert.equal(escape.captureSelector, '[data-testid="mate-mobile-action-bar"]');

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-action-section', {
      componentId,
      states: {
        data: 'single',
        permissions: 'disabled',
        interactions: 'default',
      },
      variants: {
        actions: 'maximum',
        pending: 'share',
        surface: 'mobile-sheet',
        theme: 'light',
      },
    }),
    /지원하지 않는 MateDetailActionSection state/,
  );
});

test('mate host reviews adapter maps query outcomes, pressure inventories, and close controls fail closed', () => {
  const componentId = 'src/components/MateHostReviewsModal.tsx#MateHostReviewsModal';
  const maximum = resolveComponentStateAdapter('mate.host-reviews-modal', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default', system: 'online' },
    variants: { theme: 'dark' },
  });
  const maximumOverride = maximum.props.visualQaStateOverride as {
    isError: boolean;
    isLoading: boolean;
    reviews: Array<{ id: number }>;
  };

  assert.equal(maximumOverride.isError, false);
  assert.equal(maximumOverride.isLoading, false);
  assert.equal(maximumOverride.reviews.length, 50);
  assert.equal(maximum.captureSelector, '[data-testid="mate-host-reviews-dialog"]');
  assert.equal(maximum.theme, 'dark');

  const error = resolveComponentStateAdapter('mate.host-reviews-modal', {
    componentId,
    states: { data: 'error-503', interactions: 'default', system: 'offline' },
    variants: { theme: 'light' },
  });
  assert.equal((error.props.visualQaStateOverride as { isError: boolean }).isError, true);

  const focus = resolveComponentStateAdapter('mate.host-reviews-modal', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible', system: 'online' },
    variants: { theme: 'light' },
    interactionTargetId: 'footer-close',
  });
  assert.equal(focus.props.hostName, '김호스트');

  assert.throws(
    () => resolveComponentStateAdapter('mate.host-reviews-modal', {
      componentId,
      states: { data: 'loading', interactions: 'default', system: 'online' },
      variants: { theme: 'light' },
    }),
    /지원하지 않는 MateHostReviewsModal state/,
  );
});

test('mate detail reviews adapter maps permissions, query outcomes, pressure, and controls fail closed', () => {
  const componentId = 'src/components/MateDetailReviewsSection.tsx#MateDetailReviewsSection';
  const maximum = resolveComponentStateAdapter('mate.detail-reviews-section', {
    componentId,
    states: {
      data: 'maximum-supported',
      permissions: 'host',
      interactions: 'default',
      system: 'online',
    },
    variants: { theme: 'dark' },
  });
  const maximumOverride = maximum.props.visualQaStateOverride as {
    applications: Array<{ id: number }>;
    reviews: Array<{ id: number }>;
  };
  assert.equal(maximum.props.isHost, true);
  assert.equal(maximumOverride.applications.length, 50);
  assert.equal(maximumOverride.reviews.length, 0);
  assert.equal(maximum.captureSelector, '[data-testid="mate-detail-reviews-section"]');
  assert.equal(maximum.theme, 'dark');

  const reviewed = resolveComponentStateAdapter('mate.detail-reviews-section', {
    componentId,
    states: {
      data: 'reviewed',
      permissions: 'approved-member',
      interactions: 'default',
      system: 'online',
    },
    variants: { theme: 'light' },
  });
  const reviewedOverride = reviewed.props.visualQaStateOverride as {
    reviews: Array<{ reviewerHandle?: string; revieweeHandle?: string }>;
  };
  assert.equal(reviewed.props.isHost, false);
  assert.deepEqual(reviewedOverride.reviews[0], {
    id: 1,
    partyId: 20260828,
    reviewerHandle: 'viewer',
    revieweeHandle: 'host-kim',
    rating: 5,
    comment: '약속 시간을 잘 지키고 친절하게 안내해주셨어요.',
    createdAt: '2026-08-28T10:00:00+09:00',
  });

  const error = resolveComponentStateAdapter('mate.detail-reviews-section', {
    componentId,
    states: {
      data: 'error-503',
      permissions: 'host',
      interactions: 'hover',
      system: 'offline',
    },
    variants: { theme: 'light' },
    interactionTargetId: 'retry',
  });
  assert.equal((error.props.visualQaStateOverride as { reviewsIsError: boolean }).reviewsIsError, true);

  const focus = resolveComponentStateAdapter('mate.detail-reviews-section', {
    componentId,
    states: {
      data: 'single',
      permissions: 'approved-member',
      interactions: 'focus-visible',
      system: 'online',
    },
    variants: { theme: 'light' },
    interactionTargetId: 'write-review',
  });
  assert.equal(focus.props.partyHostHandle, 'host-kim');

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-reviews-section', {
      componentId,
      states: {
        data: 'maximum-supported',
        permissions: 'approved-member',
        interactions: 'default',
        system: 'online',
      },
      variants: { theme: 'light' },
    }),
    /지원하지 않는 MateDetailReviewsSection state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-reviews-section', {
      componentId,
      states: {
        data: 'loading',
        permissions: 'host',
        interactions: 'default',
        system: 'online',
      },
      variants: { theme: 'light' },
    }),
    /지원하지 않는 MateDetailReviewsSection state/,
  );
});

test('mate detail seat view adapter maps count bounds, content pressure, themes, and both controls fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailSeatViewBlock';
  const maximum = resolveComponentStateAdapter('mate.detail-seat-view', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: { theme: 'dark' },
  });
  assert.equal(maximum.props.visualQaPhotoCountOverride, 9);
  assert.equal(maximum.captureSelector, '[data-testid="mate-detail-seat-view-block"]');
  assert.equal(maximum.theme, 'dark');

  const pressure = resolveComponentStateAdapter('mate.detail-seat-view', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { theme: 'light' },
  });
  const pressureParty = pressure.props.party as { section: string; seatDetail?: string };
  assert.match(pressureParty.section, /^SECTION-X{200}/);
  assert.match(pressureParty.seatDetail ?? '', /^SEAT-Y{240}/);

  const focus = resolveComponentStateAdapter('mate.detail-seat-view', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { theme: 'light' },
    interactionTargetId: 'official-map',
  });
  assert.equal(focus.props.visualQaPhotoCountOverride, 1);

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-seat-view', {
      componentId,
      states: { data: 'long-korean', interactions: 'hover' },
      variants: { theme: 'light' },
      interactionTargetId: 'photo-gallery',
    }),
    /지원하지 않는 MateDetailSeatViewBlock state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-seat-view', {
      componentId,
      states: { data: 'single', interactions: 'pressed' },
      variants: { theme: 'light' },
      interactionTargetId: 'unknown',
    }),
    /지원하지 않는 MateDetailSeatViewBlock state/,
  );
});

test('mate detail host adapter maps sparse identity, profile failures, metric bounds, themes, and both controls fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailHostBlock';
  const maximum = resolveComponentStateAdapter('mate.detail-host-block', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: { theme: 'dark' },
  });
  const maximumParty = maximum.props.party as {
    hostReviewCount: number;
    hostTrustMetrics?: { completedMateCount?: number; recentNoShowCount?: number };
  };
  assert.equal(maximumParty.hostReviewCount, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumParty.hostTrustMetrics?.completedMateCount, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumParty.hostTrustMetrics?.recentNoShowCount, Number.MAX_SAFE_INTEGER);
  assert.equal(maximum.captureSelector, '[data-testid="mate-detail-host-block"]');
  assert.equal(maximum.theme, 'dark');

  const brokenImage = resolveComponentStateAdapter('mate.detail-host-block', {
    componentId,
    states: { data: 'broken-image', interactions: 'default' },
    variants: { theme: 'light' },
  });
  assert.equal(
    (brokenImage.props.party as { hostProfileImageUrl?: string }).hostProfileImageUrl,
    '/__visual-qa__/missing-mate-host-avatar.png',
  );

  const pressure = resolveComponentStateAdapter('mate.detail-host-block', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { theme: 'light' },
  });
  assert.match((pressure.props.party as { hostName: string }).hostName, /^HOST-Z{240}/);

  const focus = resolveComponentStateAdapter('mate.detail-host-block', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { theme: 'light' },
    interactionTargetId: 'profile',
  });
  assert.equal((focus.props.party as { hostName: string }).hostName, '김호스트');

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-host-block', {
      componentId,
      states: { data: 'long-korean', interactions: 'hover' },
      variants: { theme: 'light' },
      interactionTargetId: 'chat',
    }),
    /지원하지 않는 MateDetailHostBlock state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-host-block', {
      componentId,
      states: { data: 'single', interactions: 'pressed' },
      variants: { theme: 'light' },
      interactionTargetId: 'unknown',
    }),
    /지원하지 않는 MateDetailHostBlock state/,
  );
});

test('mate detail intro adapter maps optional copy, verification, content pressure, bounded tags, and themes fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailIntroBlock';
  const empty = resolveComponentStateAdapter('mate.detail-intro-block', {
    componentId,
    states: { data: 'empty' },
    variants: { theme: 'light' },
  });
  assert.equal((empty.props.party as { description: string }).description, '');
  assert.equal((empty.props.party as { ticketVerified: boolean }).ticketVerified, false);
  assert.equal(empty.captureSelector, '[data-testid="mate-detail-intro-block"]');

  const maximum = resolveComponentStateAdapter('mate.detail-intro-block', {
    componentId,
    states: { data: 'maximum-supported' },
    variants: { theme: 'dark' },
  });
  const maximumParty = maximum.props.party as {
    currentParticipants: number;
    description: string;
    maxParticipants: number;
  };
  assert.equal(maximumParty.currentParticipants, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumParty.maxParticipants, Number.MAX_SAFE_INTEGER);
  assert.equal((maximumParty.description.match(/#/g) ?? []).length, 3);
  assert.equal(maximum.theme, 'dark');

  const pressure = resolveComponentStateAdapter('mate.detail-intro-block', {
    componentId,
    states: { data: 'unbroken-token' },
    variants: { theme: 'light' },
  });
  assert.match((pressure.props.party as { description: string }).description, /^INTRO-I{240}/);
  assert.match(pressure.props.summaryPolicyText as string, /^POLICY-P{220}/);

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-intro-block', {
      componentId,
      states: { data: 'unknown' },
      variants: { theme: 'light' },
    }),
    /지원하지 않는 Visual QA state: data=unknown/,
  );
});

test('mate detail review adapter maps empty, rating bounds, pressure, maximum inventory, optional action, and themes fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailReviewBlock';
  const maximum = resolveComponentStateAdapter('mate.detail-review-block', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: { theme: 'dark' },
  });
  const maximumParty = maximum.props.party as {
    hostReviewCount: number;
    hostTrustMetrics?: {
      recentHostReviews?: unknown[];
      reviewKeywordSummary?: unknown[];
    };
  };
  assert.equal(maximumParty.hostReviewCount, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumParty.hostTrustMetrics?.recentHostReviews?.length, 50);
  assert.equal(maximumParty.hostTrustMetrics?.reviewKeywordSummary?.length, 50);
  assert.equal(maximum.captureSelector, '[data-testid="mate-detail-review-block"]');
  assert.equal(maximum.theme, 'dark');

  const belowMinimum = resolveComponentStateAdapter('mate.detail-review-block', {
    componentId,
    states: { data: 'rating-below-minimum', interactions: 'default' },
    variants: { theme: 'light' },
  });
  assert.equal(
    (belowMinimum.props.party as { hostTrustMetrics?: { recentHostReviews?: Array<{ rating: number }> } })
      .hostTrustMetrics?.recentHostReviews?.[0]?.rating,
    0,
  );

  const missingHandle = resolveComponentStateAdapter('mate.detail-review-block', {
    componentId,
    states: { data: 'missing-host-handle', interactions: 'default' },
    variants: { theme: 'light' },
  });
  assert.equal((missingHandle.props.party as { hostHandle?: string }).hostHandle, undefined);
  assert.equal(missingHandle.props.onOpenHostReviews, undefined);

  const pressure = resolveComponentStateAdapter('mate.detail-review-block', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { theme: 'light' },
  });
  const pressureParty = pressure.props.party as {
    hostTrustMetrics?: { recentHostReviews?: Array<{ comment?: string | null }> };
  };
  assert.match(pressureParty.hostTrustMetrics?.recentHostReviews?.[0]?.comment ?? '', /^COMMENT-C{280}/);

  const focus = resolveComponentStateAdapter('mate.detail-review-block', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { theme: 'light' },
    interactionTargetId: 'open-reviews',
  });
  assert.equal((focus.props.party as { hostHandle?: string }).hostHandle, 'qa-host');

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-review-block', {
      componentId,
      states: { data: 'long-korean', interactions: 'hover' },
      variants: { theme: 'light' },
      interactionTargetId: 'open-reviews',
    }),
    /지원하지 않는 MateDetailReviewBlock state/,
  );
});

test('mate detail reference card adapter maps empty and content pressure with both themes fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailReferenceCard';
  const empty = resolveComponentStateAdapter('mate.detail-reference-card', {
    componentId,
    states: { data: 'empty' },
    variants: { theme: 'light' },
  });
  assert.equal(empty.props.children, null);
  assert.equal(empty.captureSelector, '[data-testid="mate-detail-reference-card"]');

  const pressure = resolveComponentStateAdapter('mate.detail-reference-card', {
    componentId,
    states: { data: 'unbroken-token' },
    variants: { theme: 'dark' },
  });
  assert.match(pressure.props.children as string, /^CARD-K{280}/);
  assert.equal(pressure.theme, 'dark');

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-reference-card', {
      componentId,
      states: { data: 'unknown' },
      variants: { theme: 'light' },
    }),
    /지원하지 않는 Visual QA state: data=unknown/,
  );
});

test('mate detail hero adapter maps date and matchup pressure, layouts, favorite state, themes, and toggle interactions fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailHeroBlock';
  const pressure = resolveComponentStateAdapter('mate.detail-hero-block', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { favorite: 'on', layout: 'compact', theme: 'dark' },
  });
  const pressureParty = pressure.props.party as {
    awayTeam: string;
    homeTeam: string;
    stadium: string;
  };
  assert.match(pressureParty.homeTeam, /^TEAM-T{220}/);
  assert.match(pressureParty.awayTeam, /^AWAY-A{220}/);
  assert.match(pressureParty.stadium, /^STADIUM-S{240}/);
  assert.equal(pressure.props.compact, true);
  assert.equal(pressure.props.favorited, true);
  assert.equal(pressure.captureSelector, '[data-testid="mate-detail-hero-block"]');
  assert.equal(pressure.theme, 'dark');

  const invalidDate = resolveComponentStateAdapter('mate.detail-hero-block', {
    componentId,
    states: { data: 'invalid-date', interactions: 'default' },
    variants: { favorite: 'off', layout: 'full', theme: 'light' },
  });
  assert.equal((invalidDate.props.party as { gameDate: string }).gameDate, 'not-a-date');

  const focus = resolveComponentStateAdapter('mate.detail-hero-block', {
    componentId,
    states: { data: 'single', interactions: 'focus-visible' },
    variants: { favorite: 'off', layout: 'full', theme: 'light' },
    interactionTargetId: 'favorite',
  });
  assert.equal(focus.props.compact, false);

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-hero-block', {
      componentId,
      states: { data: 'single', interactions: 'hover' },
      variants: { favorite: 'on', layout: 'full', theme: 'light' },
      interactionTargetId: 'favorite',
    }),
    /지원하지 않는 MateDetailHeroBlock state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-hero-block', {
      componentId,
      states: { data: 'long-korean', interactions: 'pressed' },
      variants: { favorite: 'off', layout: 'full', theme: 'light' },
      interactionTargetId: 'favorite',
    }),
    /지원하지 않는 MateDetailHeroBlock state/,
  );
});

test('mate detail participation adapter maps capacity, roster, status, and theme pressure fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailParticipationBlock';
  const maximum = resolveComponentStateAdapter('mate.detail-participation-block', {
    componentId,
    states: { data: 'maximum-supported' },
    variants: { theme: 'dark' },
  });
  const maximumParty = maximum.props.party as {
    currentParticipants: number;
    maxParticipants: number;
  };
  assert.equal(maximumParty.currentParticipants, 4_999);
  assert.equal(maximumParty.maxParticipants, 5_000);
  assert.equal(maximum.captureSelector, '[data-testid="mate-detail-participation-block"]');
  assert.equal(maximum.theme, 'dark');

  const roster = resolveComponentStateAdapter('mate.detail-participation-block', {
    componentId,
    states: { data: 'unbroken-token' },
    variants: { theme: 'light' },
  });
  const rosterMembers = (roster.props.party as { members: Array<{ role: string }> }).members;
  assert.match(rosterMembers[0]?.role ?? '', /^ROLE-R{220}/);

  const completed = resolveComponentStateAdapter('mate.detail-participation-block', {
    componentId,
    states: { data: 'status-completed' },
    variants: { theme: 'light' },
  });
  assert.equal((completed.props.party as { status: string }).status, 'COMPLETED');

  const zero = resolveComponentStateAdapter('mate.detail-participation-block', {
    componentId,
    states: { data: 'zero' },
    variants: { theme: 'light' },
  });
  assert.equal((zero.props.party as { maxParticipants: number }).maxParticipants, 0);

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-participation-block', {
      componentId,
      states: { data: 'unknown' },
      variants: { theme: 'light' },
    }),
    /지원하지 않는 Visual QA state: data=unknown/,
  );
});

test('mate detail price adapter maps missing, deposit, sale, maximum currency, and themes fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailPriceBox';
  const maximum = resolveComponentStateAdapter('mate.detail-price-box', {
    componentId,
    states: { data: 'maximum-supported' },
    variants: { theme: 'dark' },
  });
  const maximumParty = maximum.props.party as {
    price: number;
    reservationDepositAmount: number;
    status: string;
  };
  assert.equal(maximumParty.price, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumParty.reservationDepositAmount, Number.MAX_SAFE_INTEGER);
  assert.equal(maximumParty.status, 'SELLING');
  assert.equal(maximum.captureSelector, '[data-testid="mate-detail-price-box"]');
  assert.equal(maximum.theme, 'dark');

  const missing = resolveComponentStateAdapter('mate.detail-price-box', {
    componentId,
    states: { data: 'missing' },
    variants: { theme: 'light' },
  });
  const missingParty = missing.props.party as {
    reservationDepositAmount?: number | null;
    ticketPrice?: number;
  };
  assert.equal(missingParty.reservationDepositAmount, null);
  assert.equal(missingParty.ticketPrice, undefined);

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-price-box', {
      componentId,
      states: { data: 'negative' },
      variants: { theme: 'light' },
    }),
    /지원하지 않는 Visual QA state: data=negative/,
  );
});

test('mate detail QR hint adapter maps locked and available permissions with interactions fail closed', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailQrHint';
  const locked = resolveComponentStateAdapter('mate.detail-qr-hint', {
    componentId,
    states: { permissions: 'locked', interactions: 'default' },
    variants: { theme: 'dark' },
  });
  assert.equal(locked.props.canAccessCheckIn, false);
  assert.equal(locked.captureSelector, '[data-testid="mate-open-qr-panel"]');
  assert.equal(locked.theme, 'dark');

  const focus = resolveComponentStateAdapter('mate.detail-qr-hint', {
    componentId,
    states: { permissions: 'check-in-access', interactions: 'focus-visible' },
    variants: { theme: 'light' },
    interactionTargetId: 'open',
  });
  assert.equal(focus.props.canAccessCheckIn, true);

  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-qr-hint', {
      componentId,
      states: { permissions: 'locked', interactions: 'hover' },
      variants: { theme: 'light' },
      interactionTargetId: 'open',
    }),
    /지원하지 않는 MateDetailQrHint state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.detail-qr-hint', {
      componentId,
      states: { permissions: 'check-in-access', interactions: 'pressed' },
      variants: { theme: 'light' },
      interactionTargetId: 'unknown',
    }),
    /지원하지 않는 MateDetailQrHint state/,
  );
});

test('mate create field label adapter maps copy, semantics, emphasis, requirement, and theme fail closed', () => {
  const componentId = 'src/components/MateCreatePrimitives.tsx#FieldLabel';
  const required = resolveComponentStateAdapter('mate.create-field-label', {
    componentId,
    states: { data: 'long-korean' },
    variants: {
      association: 'associated',
      emphasis: 'prominent',
      required: 'required',
      theme: 'dark',
    },
  });
  const requiredChildren = required.props.children as unknown[];
  assert.equal(required.props.htmlFor, 'visual-qa-field');
  assert.equal(required.props.className, 'text-base font-bold sm:text-lg');
  assert.equal(required.props['data-testid'], 'mate-create-field-label');
  assert.match(String(requiredChildren[0]), /모바일/);
  assert.equal(requiredChildren.length, 2);
  assert.equal(required.captureSelector, '[data-testid="mate-create-field-label"]');
  assert.equal(required.theme, 'dark');

  const unassociated = resolveComponentStateAdapter('mate.create-field-label', {
    componentId,
    states: { data: 'unbroken-token' },
    variants: {
      association: 'unassociated',
      emphasis: 'default',
      required: 'optional',
      theme: 'light',
    },
  });
  assert.equal(unassociated.props.htmlFor, undefined);
  assert.equal(unassociated.props.className, undefined);
  assert.match(String(unassociated.props.children), /^FIELDLABEL-/);

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-field-label', {
      componentId,
      states: { data: 'maximum-supported' },
      variants: {
        association: 'associated',
        emphasis: 'default',
        required: 'optional',
        theme: 'light',
      },
    }),
    /지원하지 않는 Visual QA state/,
  );
});

test('mate create seat pricing adapter maps copy, numeric boundaries, controls, and interactions fail closed', () => {
  const componentId = 'src/components/MateCreateSeatPricingFields.tsx#MateCreateSeatPricingFields';
  const maximum = resolveComponentStateAdapter('mate.create-seat-pricing', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: {
      deposit: 'maximum-supported',
      participants: 'four',
      theme: 'dark',
      ticket: 'maximum-supported',
    },
  });
  const maximumForm = maximum.props.formData as {
    maxParticipants: number;
    reservationDepositAmount: number;
    seatCategory: string;
    ticketPrice: number;
  };
  assert.equal(maximumForm.maxParticipants, 4);
  assert.equal(maximumForm.ticketPrice, 2_147_483_647);
  assert.equal(maximumForm.reservationDepositAmount, 2_147_483_647);
  assert.match(maximumForm.seatCategory, /^SEATCATEGORY-/);
  assert.equal(maximum.props.visualQaInteractive, true);
  assert.equal(maximum.captureSelector, '[data-testid="mate-create-seat-pricing-fields"]');
  assert.equal(maximum.theme, 'dark');

  const emptyInput = resolveComponentStateAdapter('mate.create-seat-pricing', {
    componentId,
    states: { data: 'single', interactions: 'input' },
    variants: {
      deposit: 'empty',
      participants: 'two',
      theme: 'light',
      ticket: 'empty',
    },
    interactionTargetId: 'ticket-price',
  });
  const emptyForm = emptyInput.props.formData as {
    reservationDepositAmount: number;
    ticketPrice: number;
  };
  assert.equal(emptyForm.ticketPrice, 0);
  assert.equal(emptyForm.reservationDepositAmount, 0);

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-seat-pricing', {
      componentId,
      states: { data: 'long-korean', interactions: 'focus-visible' },
      variants: {
        deposit: 'ordinary',
        participants: 'two',
        theme: 'light',
        ticket: 'ordinary',
      },
      interactionTargetId: 'ticket-price',
    }),
    /지원하지 않는 MateCreateSeatPricingFields state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.create-seat-pricing', {
      componentId,
      states: { data: 'single', interactions: 'input' },
      variants: {
        deposit: 'ordinary',
        participants: 'two',
        theme: 'light',
        ticket: 'ordinary',
      },
      interactionTargetId: 'max-participants',
    }),
    /지원하지 않는 MateCreateSeatPricingFields state/,
  );
});

test('mate create seat selection adapter maps inventories, pressure boundaries, selections, and interactions fail closed', () => {
  const componentId = 'src/components/MateCreateSeatSelectionFields.tsx#MateCreateSeatSelectionFields';
  const pressure = resolveComponentStateAdapter('mate.create-seat-selection', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: {
      category: 'outfield',
      cheering: 'away',
      inventory: 'gwangju-all',
      theme: 'dark',
    },
  });
  const pressureForm = pressure.props.formData as {
    awayTeam: string;
    cheeringSide: string;
    seatCategory: string;
    seatDetail: string;
  };
  assert.equal(pressureForm.awayTeam, 'KIA');
  assert.equal(pressureForm.cheeringSide, 'AWAY');
  assert.equal(pressureForm.seatCategory, '외야석');
  assert.equal(pressureForm.seatDetail.length, 100);
  assert.deepEqual(pressure.props.availableCategoryKeys, [
    'CHEERING', 'TABLE', 'PREMIUM', 'EXCITING', 'COMFORT', 'SPECIAL', 'OUTFIELD',
  ]);
  assert.equal(pressure.props.visualQaInteractive, true);
  assert.equal(pressure.captureSelector, '[data-testid="mate-create-seat-selection-fields"]');
  assert.equal(pressure.theme, 'dark');

  const wrappingKorean = resolveComponentStateAdapter('mate.create-seat-selection', {
    componentId,
    states: { data: 'long-korean', interactions: 'default' },
    variants: {
      category: 'special',
      cheering: 'neutral',
      inventory: 'gwangju-all',
      theme: 'light',
    },
  });
  const wrappingSeatDetail = (wrappingKorean.props.formData as { seatDetail: string }).seatDetail;
  assert.equal(wrappingSeatDetail.length, 100);
  assert.match(wrappingSeatDetail, /\s/);
  assert.doesNotMatch(wrappingSeatDetail, /^\S{100}$/);

  const toggle = resolveComponentStateAdapter('mate.create-seat-selection', {
    componentId,
    states: { data: 'single', interactions: 'selected' },
    variants: {
      category: 'premium',
      cheering: 'none',
      inventory: 'gwangju-all',
      theme: 'light',
    },
    interactionTargetId: 'clear-category-premium',
  });
  assert.equal((toggle.props.formData as { seatCategory: string }).seatCategory, '프리미엄');

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-seat-selection', {
      componentId,
      states: { data: 'long-korean', interactions: 'focus-visible' },
      variants: {
        category: 'none',
        cheering: 'none',
        inventory: 'gwangju-all',
        theme: 'light',
      },
      interactionTargetId: 'seat-block',
    }),
    /지원하지 않는 MateCreateSeatSelectionFields state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.create-seat-selection', {
      componentId,
      states: { data: 'single', interactions: 'selected' },
      variants: {
        category: 'premium',
        cheering: 'none',
        inventory: 'gwangju-all',
        theme: 'light',
      },
      interactionTargetId: 'clear-category-table',
    }),
    /지원하지 않는 MateCreateSeatSelectionFields state/,
  );
});

test('mate create seat step adapter composes every lazy boundary and pressure fixture fail closed', () => {
  const componentId = 'src/components/MateCreateSeatStep.tsx#MateCreateSeatStep';
  const selectionFallback = resolveComponentStateAdapter('mate.create-seat-step', {
    componentId,
    states: { data: 'long-korean', interactions: 'default' },
    variants: {
      pricing: 'runtime',
      selection: 'fallback',
      theme: 'dark',
    },
  });
  const selectionFallbackProps = selectionFallback.props as {
    formData: PartyFormData;
    visualQaStateOverride: { pricingPhase: string; selectionPhase: string };
  };
  assert.equal(selectionFallbackProps.visualQaStateOverride.selectionPhase, 'fallback');
  assert.equal(selectionFallbackProps.visualQaStateOverride.pricingPhase, 'runtime');
  assert.match(selectionFallbackProps.formData.seatCategory, /모바일/);
  assert.equal(selectionFallback.captureSelector, '[data-testid="mate-create-seat-step"]');
  assert.equal(selectionFallback.theme, 'dark');

  const maximum = resolveComponentStateAdapter('mate.create-seat-step', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: {
      pricing: 'runtime',
      selection: 'runtime',
      theme: 'light',
    },
  });
  const maximumProps = maximum.props as {
    availableCategoryKeys: string[];
    formData: PartyFormData;
  };
  assert.equal(maximumProps.availableCategoryKeys.length, 7);
  assert.equal(maximumProps.formData.maxParticipants, 4);
  assert.equal(maximumProps.formData.ticketPrice, 2_147_483_647);
  assert.equal(maximumProps.formData.reservationDepositAmount, 2_147_483_647);
  assert.equal(maximumProps.formData.seatDetail.length, 100);

  const empty = resolveComponentStateAdapter('mate.create-seat-step', {
    componentId,
    states: { data: 'empty', interactions: 'default' },
    variants: {
      pricing: 'runtime',
      selection: 'runtime',
      theme: 'light',
    },
  });
  assert.equal((empty.props.formData as PartyFormData).seatCategory, '');
  assert.deepEqual(empty.props.availableCategoryKeys, [
    'CHEERING', 'TABLE', 'PREMIUM', 'COMFORT', 'OUTFIELD',
  ]);

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-seat-step', {
      componentId,
      states: { data: 'unbroken-token', interactions: 'default' },
      variants: {
        pricing: 'fallback',
        selection: 'fallback',
        theme: 'light',
      },
    }),
    /지원하지 않는 MateCreateSeatStep state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.create-seat-step', {
      componentId,
      states: { data: 'single', interactions: 'focus-visible' },
      variants: {
        pricing: 'runtime',
        selection: 'runtime',
        theme: 'light',
      },
      interactionTargetId: 'ticket-price',
    }),
    /지원하지 않는 MateCreateSeatStep state/,
  );
});

test('mate create ticket step adapter covers retained-file pressure, scanner states, and interaction targets fail closed', () => {
  const componentId = 'src/components/MateCreateTicketStep.tsx#MateCreateTicketStep';
  const scanFailure = resolveComponentStateAdapter('mate.create-ticket-step', {
    componentId,
    states: { data: 'unbroken-token', interactions: 'default' },
    variants: { phase: 'scan-error', theme: 'dark' },
  });
  const scanFailureProps = scanFailure.props as {
    errorType: string;
    fileErrorMessage: string;
    isScanning: boolean;
    ticketFile: File;
    visualQaStateOverride: { showDevelopmentFixture: boolean };
  };
  assert.equal(scanFailure.captureSelector, '[data-testid="mate-create-ticket-step"]');
  assert.equal(scanFailure.theme, 'dark');
  assert.equal(scanFailureProps.errorType, 'scan');
  assert.equal(scanFailureProps.isScanning, false);
  assert.match(scanFailureProps.fileErrorMessage, /분석/);
  assert.match(scanFailureProps.ticketFile.name, /^TICKET-/);
  assert.equal(scanFailureProps.visualQaStateOverride.showDevelopmentFixture, false);

  const scanning = resolveComponentStateAdapter('mate.create-ticket-step', {
    componentId,
    states: { data: 'single', interactions: 'default' },
    variants: { phase: 'scanning', theme: 'light' },
  });
  assert.equal(scanning.props.isScanning, true);
  assert.ok(scanning.props.ticketFile instanceof File);

  const emptyValidation = resolveComponentStateAdapter('mate.create-ticket-step', {
    componentId,
    states: { data: 'empty', interactions: 'default' },
    variants: { phase: 'validation-size', theme: 'light' },
  });
  assert.equal(emptyValidation.props.ticketFile, null);
  assert.equal(emptyValidation.props.fileErrorMessage, '파일 크기는 10MB 이하여야 합니다.');

  const pickerFocus = resolveComponentStateAdapter('mate.create-ticket-step', {
    componentId,
    states: { data: 'empty', interactions: 'focus-visible' },
    variants: { phase: 'idle', theme: 'light' },
    interactionTargetId: 'picker-idle',
  });
  assert.equal(pickerFocus.props.errorType, null);

  assert.throws(
    () => resolveComponentStateAdapter('mate.create-ticket-step', {
      componentId,
      states: { data: 'empty', interactions: 'default' },
      variants: { phase: 'scanning', theme: 'light' },
    }),
    /지원하지 않는 MateCreateTicketStep state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.create-ticket-step', {
      componentId,
      states: { data: 'single', interactions: 'hover' },
      variants: { phase: 'scan-error', theme: 'light' },
      interactionTargetId: 'unknown',
    }),
    /지원하지 않는 MateCreateTicketStep state/,
  );
});

test('mate date rail adapter covers density, selection boundaries, expansion, and interactions fail closed', () => {
  const componentId = 'src/components/MateDateRailFilter.tsx#MateDateRailFilter';
  const hiddenSelection = resolveComponentStateAdapter('mate.date-rail-filter', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'default' },
    variants: { expansion: 'collapsed', selection: 'ninth', theme: 'dark' },
  });
  const hiddenProps = hiddenSelection.props as {
    dateItems: Date[];
    selectedDate: Date;
    visualQaStateOverride: { expanded: boolean; interactive: boolean };
  };
  assert.equal(hiddenSelection.captureSelector, '[data-testid="mate-date-rail-filter"]');
  assert.equal(hiddenSelection.theme, 'dark');
  assert.equal(hiddenProps.dateItems.length, 14);
  assert.equal(hiddenProps.selectedDate.getDate(), 1);
  assert.deepEqual(hiddenProps.visualQaStateOverride, { expanded: false, interactive: true });

  const outside = resolveComponentStateAdapter('mate.date-rail-filter', {
    componentId,
    states: { data: 'empty', interactions: 'default' },
    variants: { expansion: 'collapsed', selection: 'outside-range', theme: 'light' },
  });
  assert.deepEqual(outside.props.dateItems, []);
  assert.ok(outside.props.selectedDate instanceof Date);

  const expand = resolveComponentStateAdapter('mate.date-rail-filter', {
    componentId,
    states: { data: 'maximum-supported', interactions: 'selected' },
    variants: { expansion: 'collapsed', selection: 'all', theme: 'light' },
    interactionTargetId: 'expand',
  });
  assert.equal((expand.props.visualQaStateOverride as { expanded: boolean }).expanded, false);

  assert.throws(
    () => resolveComponentStateAdapter('mate.date-rail-filter', {
      componentId,
      states: { data: 'single', interactions: 'default' },
      variants: { expansion: 'expanded', selection: 'first', theme: 'light' },
    }),
    /지원하지 않는 MateDateRailFilter state/,
  );
  assert.throws(
    () => resolveComponentStateAdapter('mate.date-rail-filter', {
      componentId,
      states: { data: 'maximum-supported', interactions: 'hover' },
      variants: { expansion: 'collapsed', selection: 'all', theme: 'light' },
      interactionTargetId: 'date-last',
    }),
    /지원하지 않는 MateDateRailFilter state/,
  );
});

test('registered-loading-state-scenarios', async () => {
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      status: string;
      axes?: Record<string, {
        values?: string[];
        notApplicable?: {
          reason?: string;
          owner?: string;
          testEvidence?: string;
        };
      }>;
      variants?: {
        notApplicable?: {
          reason?: string;
          owner?: string;
          testEvidence?: string;
        };
      };
    }>;
  };
  const registered = manifest.components.filter(({ status, variants }) => (
    status === 'registered'
      && variants?.notApplicable != null
  ));
  const loading = registered.filter((component) => (
    component.axes?.data?.values?.length === 1
      && component.axes.data.values[0] === 'loading'
      && component.axes?.permissions?.notApplicable != null
      && component.axes?.interactions?.notApplicable != null
      && component.axes?.system?.notApplicable != null
  ));

  assert.equal(loading.length, 4);
  for (const component of loading) {
    assert.deepEqual(component.axes?.data?.values, ['loading']);
    for (const axis of ['permissions', 'interactions', 'system']) {
      const axisEvidence: {
        reason?: string;
        owner?: string;
        testEvidence?: string;
      } | undefined = component.axes?.[axis]?.notApplicable;
      assert.ok(axisEvidence?.reason);
      assert.equal(axisEvidence?.owner, 'frontend-platform');
      assert.equal(
        axisEvidence?.testEvidence,
        'src/visual-qa/stateAdapters.test.ts#registered-loading-state-scenarios',
      );
    }
    assert.ok(component.variants?.notApplicable?.reason);
    assert.equal(component.variants?.notApplicable?.owner, 'frontend-platform');
    assert.equal(
      component.variants?.notApplicable?.testEvidence,
      'src/visual-qa/stateAdapters.test.ts#registered-loading-state-scenarios',
    );
  }
});
