import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOME_ASSERTION_IDS,
  HOME_FLOW_SOURCE,
  MY_PAGE_ASSERTION_IDS,
  MY_PAGE_FLOW_SOURCE,
  PRODUCT_DEFECT_SOURCES,
  ROUTE_FLOW_WIDTHS,
  ROUTE_FLOW_ZOOMS,
  ROUTE_FLOW_EVIDENCE_RECORDS,
  STADIUM_ASSERTION_IDS,
  STADIUM_FLOW_SOURCE_IDENTITIES,
  TICKET_MODAL_ASSERTION_IDS,
  TICKET_MODAL_FLOW_SOURCE_IDENTITIES,
  homeAssertions,
  myPageAssertions,
  productDefectAssertions,
  resolveRouteFlowStatus,
  routeFlowLabel,
  stadiumAssertions,
} from './visual-qa-route-flow.integration.mjs';

test('route-flow matrix keeps the representative mobile and text-zoom axes explicit', () => {
  assert.deepEqual(ROUTE_FLOW_WIDTHS, [320, 390]);
  assert.deepEqual(ROUTE_FLOW_ZOOMS, [1, 2]);
  assert.equal(routeFlowLabel({ browser: 'webkit', route: '/mypage', width: 390, zoom: 2 }), 'webkit:/mypage:390px:200%');
});

test('route-flow evidence records keep Home registration and its route evidence linked', () => {
  const byId = new Map(ROUTE_FLOW_EVIDENCE_RECORDS.map((record) => [record.id, record]));
  assert.deepEqual(byId.get('home-content-and-navigation').contractStatuses, ['registered']);
  assert.deepEqual(byId.get('home-content-and-navigation').hostScenarioIds, [
    'state:src/components/AppRoutes.tsx#AppRoutes:data=single|variant.route=home|variant.theme=light',
    'state:src/components/AppRoutes.tsx#AppRoutes:data=single|variant.route=home|variant.theme=dark',
  ]);
  assert.deepEqual(byId.get('mypage-stats-and-ticket-host').contractComponentIds, [
    'src/components/AppRoutes.tsx#MyPage',
  ]);
  assert.deepEqual(byId.get('ticket-upload-modal-host').contractComponentIds, [
    'src/components/MyPageRuntime.tsx#TicketUploadModal',
  ]);
  assert.deepEqual(byId.get('stadium-guide-route-and-runtime').contractComponentIds, [
    'src/components/AppRoutes.tsx#StadiumGuide',
    'src/components/StadiumGuide.tsx#StadiumGuide',
    'src/components/StadiumGuide.tsx#StadiumGuideRuntime',
  ]);
  for (const record of ROUTE_FLOW_EVIDENCE_RECORDS) {
    assert.ok(record.fixtureIds.length > 0, `${record.id} fixture link`);
    assert.ok(record.scenarioIds.length > 0, `${record.id} scenario link`);
    assert.ok(record.validator, `${record.id} validator link`);
    assert.ok(record.assertionIds.length > 0, `${record.id} assertion link`);
  }
});

test('route-flow verdict distinguishes not-tested, review, failure, and pass', () => {
  assert.equal(resolveRouteFlowStatus({ blocked: true }), 'NOT_TESTED');
  assert.equal(resolveRouteFlowStatus({ issues: [{ type: 'focus-partially-obscured' }] }), 'REVIEW');
  assert.equal(resolveRouteFlowStatus({ errors: ['page error'] }), 'FAIL');
  assert.equal(resolveRouteFlowStatus(), 'PASS');
});

test('200% product assertions fail on the known navbar and ticket modal counterexamples', () => {
  const failures = productDefectAssertions({
    navbar: {
      actualInteractiveOverlaps: [{ left: 'navbar-notification-trigger', right: 'navbar-dm-icon' }],
    },
    ticketModal: {
      title: { lineCount: 8 },
      dropzone: { visibleRatio: 0.25 },
      actualInteractiveOverlap: { width: 174, height: 88 },
    },
  }, { zoom: 2 });

  assert.deepEqual(failures.map((failure) => failure.id), [
    'navbar-interactive-overlap',
    'ticket-modal-title-overflow',
    'ticket-modal-dropzone-clipped',
    'ticket-modal-interactive-overlap',
  ]);
});

test('100% and non-zoom route evidence does not report product defects', () => {
  assert.deepEqual(productDefectAssertions({
    navbar: { actualInteractiveOverlaps: [] },
    ticketModal: { title: { lineCount: 8 }, dropzone: { visibleRatio: 0.1 } },
  }, { zoom: 1 }), []);
});

test('product evidence keeps source identifiers and real interaction selectors explicit', () => {
  assert.equal(PRODUCT_DEFECT_SOURCES.navbar.source, 'src/components/PublicNavbar.tsx');
  assert.equal(PRODUCT_DEFECT_SOURCES.ticketModal.source, 'src/components/ticket/TicketUploadModal.tsx');
  assert.ok(PRODUCT_DEFECT_SOURCES.navbar.selectors.includes('[data-testid="navbar-dm-icon"]'));
  assert.ok(PRODUCT_DEFECT_SOURCES.ticketModal.selectors.includes('[data-testid="ticket-upload-dropzone"]'));
});

test('home assertions require fixture-backed content and a primary interaction', () => {
  const failures = homeAssertions({
    priorityPanelVisible: true,
    priorityHeadingVisible: true,
    gameCardCount: 5,
    fixtureTeamsVisible: true,
    primaryActionVisible: true,
    dateNextVisible: true,
    dateNextDisabled: false,
    dateNavigationChecked: true,
    dateNavigationUpdated: true,
  });
  assert.deepEqual(failures, []);
});

test('home negative control fails when the real panel body is removed', () => {
  const failures = homeAssertions({
    priorityPanelVisible: false,
    priorityHeadingVisible: false,
    gameCardCount: 0,
    fixtureTeamsVisible: false,
    primaryActionVisible: true,
    dateNextVisible: true,
    dateNextDisabled: false,
    dateNavigationChecked: true,
    dateNavigationUpdated: true,
  });
  assert.deepEqual(failures.map(({ id }) => id), [
    'home-priority-panel-missing',
    'home-priority-heading-missing',
    'home-game-cards-missing',
    'home-fixture-content-missing',
  ]);
});

test('home evidence names the actual source and stable interaction selectors', () => {
  assert.equal(HOME_FLOW_SOURCE.source, 'src/components/HomeRuntime.tsx');
  assert.equal(HOME_FLOW_SOURCE.symbol, 'HomeRuntime');
  assert.equal(HOME_FLOW_SOURCE.route, '/home');
  assert.equal(HOME_FLOW_SOURCE.selectors.priorityPanel, '[data-testid="home-match-priority-panel"]');
  assert.equal(HOME_FLOW_SOURCE.selectors.dateNext, '[data-testid="home-date-next"]');
});

test('MyPage evidence names the runtime source and requires each child flow', () => {
  assert.equal(MY_PAGE_FLOW_SOURCE.source, 'src/components/MyPageRuntime.tsx');
  assert.equal(MY_PAGE_FLOW_SOURCE.symbol, 'MyPageRuntime');
  assert.equal(MY_PAGE_FLOW_SOURCE.route, '/mypage');
  assert.ok(MY_PAGE_ASSERTION_IDS.includes('mypage-ticket-escape-missing'));
  assert.deepEqual(myPageAssertions({
    shellVisible: true,
    statsToggleVisible: true,
    statsPanelVisible: true,
    seasonHeatmapVisible: true,
    ticketOpenVisible: true,
    dialogVisible: true,
    cancelFocused: true,
    dialogClosedByEscape: true,
  }), []);
});

test('Home evidence exposes the complete assertion vocabulary for evidence linking', () => {
  assert.ok(HOME_ASSERTION_IDS.includes('home-fixture-content-missing'));
  assert.ok(HOME_ASSERTION_IDS.includes('home-date-navigation-not-updated'));
});

test('stadium and ticket evidence retain their owning source identities', () => {
  assert.deepEqual(STADIUM_FLOW_SOURCE_IDENTITIES.map(({ symbol }) => symbol), [
    'StadiumGuide',
    'StadiumGuide',
    'StadiumGuideRuntime',
  ]);
  assert.ok(STADIUM_ASSERTION_IDS.includes('stadium-guide-select-focus-missing'));
  assert.equal(TICKET_MODAL_FLOW_SOURCE_IDENTITIES[0].source, 'src/components/ticket/TicketUploadModal.tsx');
  assert.deepEqual(TICKET_MODAL_ASSERTION_IDS, [
    'mypage-ticket-flow-missing',
    'mypage-ticket-escape-missing',
  ]);
});

test('stadium assertions fail when the seat-map or guide focus disappears', () => {
  assert.deepEqual(stadiumAssertions({
    seatMapVisible: false,
    guideSelectVisible: true,
    guideSelectFocused: false,
  }).map(({ id }) => id), [
    'stadium-seat-map-missing',
    'stadium-guide-select-focus-missing',
  ]);
  assert.deepEqual(stadiumAssertions({
    seatMapVisible: true,
    guideSelectVisible: true,
    guideSelectFocused: true,
  }), []);
});

test('MyPage negative control fails when a child flow disappears', () => {
  assert.deepEqual(myPageAssertions({
    shellVisible: true,
    statsToggleVisible: true,
    statsPanelVisible: false,
    seasonHeatmapVisible: true,
    ticketOpenVisible: true,
    dialogVisible: true,
    cancelFocused: true,
    dialogClosedByEscape: true,
  }).map(({ id }) => id), ['mypage-stats-flow-missing']);
});
