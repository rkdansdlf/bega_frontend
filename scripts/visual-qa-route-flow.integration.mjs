#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIssues } from './visual-qa-lib.mjs';
import { VISUAL_QA_PROBE } from './visual-qa-audit.mjs';
import { loadPlaywright, settle, stubApi } from './reflow-320-audit.mjs';

export const ROUTE_FLOW_WIDTHS = [320, 390];
export const ROUTE_FLOW_ZOOMS = [1, 2];

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(SCRIPT_PATH), '..');

export const PRODUCT_DEFECT_SOURCES = {
  navbar: {
    source: 'src/components/PublicNavbar.tsx',
    symbol: 'PublicNavbar',
    selectors: [
      '[data-testid="navbar-notification-trigger"]',
      '[data-testid="navbar-dm-icon"]',
      'button[aria-label="메뉴 열기"]',
      '[data-testid="navbar-menu-toggle"]',
    ],
  },
  ticketModal: {
    source: 'src/components/ticket/TicketUploadModal.tsx',
    symbol: 'TicketUploadModal',
    selectors: [
      '[data-testid="ticket-upload-dialog"] h2',
      '[data-testid="ticket-upload-dropzone"]',
      '[data-testid="ticket-upload-cancel"]',
    ],
  },
};

export const HOME_FLOW_SOURCE = {
  source: 'src/components/HomeRuntime.tsx',
  symbol: 'HomeRuntime',
  route: '/home',
  selectors: {
    priorityPanel: '[data-testid="home-match-priority-panel"]',
    gameCard: '[data-testid="home-game-card"]',
    primaryAction: '[data-testid="home-secondary-prediction-cta"], [data-testid="home-offseason-cta"]',
    dateNext: '[data-testid="home-date-next"]',
  },
};

export const MY_PAGE_FLOW_SOURCE = {
  source: 'src/components/MyPageRuntime.tsx',
  symbol: 'MyPageRuntime',
  route: '/mypage',
  selectors: {
    shell: '[data-testid="mypage-prototype-shell"]',
    statsToggle: '[data-testid="mypage-toggle-stats"]',
    statsPanel: '[data-testid="mypage-monthly-visit-bars"]',
    seasonMenu: 'nav[aria-label="마이페이지 메뉴"] button',
    seasonHeatmap: '[data-testid="mypage-season-heatmap"]',
    ticketOpen: '[data-testid="mypage-ticket-upload-open"]',
    dialog: '[data-testid="ticket-upload-dialog"]',
    cancel: '[data-testid="ticket-upload-dialog"] [data-testid="ticket-upload-cancel"]',
  },
};

export const HOME_ASSERTION_IDS = [
  'home-priority-panel-missing',
  'home-priority-heading-missing',
  'home-game-cards-missing',
  'home-fixture-content-missing',
  'home-primary-action-missing',
  'home-date-navigation-missing',
  'home-date-navigation-not-updated',
];

export const MY_PAGE_ASSERTION_IDS = [
  'mypage-shell-missing',
  'mypage-stats-flow-missing',
  'mypage-season-flow-missing',
  'mypage-ticket-flow-missing',
  'mypage-ticket-escape-missing',
];

export const STADIUM_FLOW_SOURCE_IDENTITIES = [
  {
    source: 'src/components/AppRoutes.tsx',
    symbol: 'StadiumGuide',
    responsibility: 'route binding for /stadium',
  },
  {
    source: 'src/components/StadiumGuide.tsx',
    symbol: 'StadiumGuide',
    responsibility: 'lazy fallback and runtime boundary',
  },
  {
    source: 'src/components/StadiumGuide.tsx',
    symbol: 'StadiumGuideRuntime',
    responsibility: 'resolved stadium guide surface',
  },
];

export const STADIUM_ASSERTION_IDS = [
  'stadium-seat-map-missing',
  'stadium-guide-select-missing',
  'stadium-guide-select-focus-missing',
];

export const TICKET_MODAL_FLOW_SOURCE_IDENTITIES = [
  {
    source: 'src/components/ticket/TicketUploadModal.tsx',
    symbol: 'TicketUploadModal',
    responsibility: 'ticket dialog surface and keyboard close path',
  },
];

export const TICKET_MODAL_ASSERTION_IDS = [
  'mypage-ticket-flow-missing',
  'mypage-ticket-escape-missing',
];

// Every record below is deliberately tied to a source/contract/fixture and a
// concrete route-flow assertion. The result writer adds the source and
// validator hashes plus browser version for each matrix case, so a screenshot
// or assertion cannot be reused without its execution context.
export const ROUTE_FLOW_EVIDENCE_RECORDS = [
  {
    id: 'home-content-and-navigation',
    flow: 'home',
    source: HOME_FLOW_SOURCE,
    contractComponentIds: ['src/components/AppRoutes.tsx#Home'],
    contractStatuses: ['registered'],
    hostScenarioIds: [
      'state:src/components/AppRoutes.tsx#AppRoutes:data=single|variant.route=home|variant.theme=light',
      'state:src/components/AppRoutes.tsx#AppRoutes:data=single|variant.route=home|variant.theme=dark',
    ],
    fixtureIds: ['home bootstrap', 'home widgets'],
    scenarioIds: ['/home#home-content-and-navigation'],
    validator: 'homeAssertions',
    assertionIds: HOME_ASSERTION_IDS,
  },
  {
    id: 'mypage-stats-and-ticket-host',
    flow: 'mypage',
    source: MY_PAGE_FLOW_SOURCE,
    contractComponentIds: ['src/components/AppRoutes.tsx#MyPage'],
    contractStatuses: ['registered'],
    hostScenarioIds: [
      'state:src/components/AppRoutes.tsx#AppRoutes:data=single|variant.route=mypage|variant.theme=light',
      'state:src/components/AppRoutes.tsx#AppRoutes:data=single|variant.route=mypage|variant.theme=dark',
    ],
    fixtureIds: ['auth/mypage', 'my page diary entries', 'my page diary statistics'],
    scenarioIds: ['/mypage#stats-tab-open', '/mypage#ticket-dialog-keyboard'],
    validator: 'myPageAssertions',
    assertionIds: MY_PAGE_ASSERTION_IDS,
  },
  {
    id: 'ticket-upload-modal-host',
    flow: 'mypage',
    source: TICKET_MODAL_FLOW_SOURCE_IDENTITIES[0],
    contractComponentIds: ['src/components/MyPageRuntime.tsx#TicketUploadModal'],
    contractStatuses: ['registered'],
    hostScenarioIds: [
      'state:src/components/ticket/TicketUploadModal.tsx#TicketUploadModal:data=empty|interactions=default|system=online|variant.gameMatch=missing',
    ],
    fixtureIds: ['auth/mypage', 'ticket-upload-dialog:empty'],
    scenarioIds: ['/mypage#ticket-dialog-keyboard'],
    validator: 'myPageAssertions',
    assertionIds: TICKET_MODAL_ASSERTION_IDS,
  },
  {
    id: 'stadium-guide-route-and-runtime',
    flow: 'stadium',
    source: STADIUM_FLOW_SOURCE_IDENTITIES,
    contractComponentIds: [
      'src/components/AppRoutes.tsx#StadiumGuide',
      'src/components/StadiumGuide.tsx#StadiumGuide',
      'src/components/StadiumGuide.tsx#StadiumGuideRuntime',
    ],
    contractStatuses: ['registered', 'registered', 'registered'],
    hostScenarioIds: [
      'state:src/components/StadiumGuide.tsx#StadiumGuide:variant.phase=fallback|variant.theme=light',
      'state:src/components/StadiumGuide.tsx#StadiumGuide:variant.phase=fallback|variant.theme=dark',
      'state:src/components/StadiumGuide.tsx#StadiumGuide:variant.phase=runtime|variant.theme=light',
      'state:src/components/StadiumGuide.tsx#StadiumGuide:variant.phase=runtime|variant.theme=dark',
    ],
    fixtureIds: ['stadium guide list', 'stadium guide places'],
    scenarioIds: ['/stadium#seat-map-render-focus'],
    validator: 'stadiumAssertions',
    assertionIds: STADIUM_ASSERTION_IDS,
  },
  {
    id: 'navbar-200-percent-interactive-surface',
    flow: 'product-defects',
    source: PRODUCT_DEFECT_SOURCES.navbar,
    contractComponentIds: [],
    contractStatuses: [],
    hostScenarioIds: [],
    fixtureIds: ['auth/mypage'],
    scenarioIds: ['/mypage#ticket-dialog-keyboard', '/stadium#seat-map-render-focus'],
    validator: 'productDefectAssertions',
    assertionIds: ['navbar-interactive-overlap'],
  },
  {
    id: 'ticket-modal-200-percent-surface',
    flow: 'product-defects',
    source: PRODUCT_DEFECT_SOURCES.ticketModal,
    contractComponentIds: ['src/components/MyPageRuntime.tsx#TicketUploadModal'],
    contractStatuses: ['registered'],
    hostScenarioIds: [
      'state:src/components/ticket/TicketUploadModal.tsx#TicketUploadModal:data=empty|interactions=default|system=online|variant.gameMatch=missing',
    ],
    fixtureIds: ['auth/mypage', 'ticket-upload-dialog:empty'],
    scenarioIds: ['/mypage#ticket-dialog-keyboard'],
    validator: 'productDefectAssertions',
    assertionIds: [
      'ticket-modal-title-overflow',
      'ticket-modal-dropzone-clipped',
      'ticket-modal-interactive-overlap',
    ],
  },
];

export const routeFlowLabel = ({ browser, route, width, zoom }) => (
  `${browser}:${route}:${width}px:${zoom * 100}%`
);

const sha256File = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

const sourcePathsForRecord = (record) => {
  const sources = Array.isArray(record.source) ? record.source : [record.source];
  return sources.map(({ source }) => ({ source, path: join(PROJECT_ROOT, source) }));
};

export const loadRouteFlowEvidenceContext = async () => {
  const sourceSnapshots = {};
  for (const record of ROUTE_FLOW_EVIDENCE_RECORDS) {
    for (const { source, path } of sourcePathsForRecord(record)) {
      if (!sourceSnapshots[source]) sourceSnapshots[source] = await sha256File(path);
    }
  }
  return {
    validatorScript: 'scripts/visual-qa-route-flow.integration.mjs',
    validatorScriptSha256: await sha256File(SCRIPT_PATH),
    fixtureRegistry: 'scripts/reflow-320-fixtures.mjs',
    fixtureRegistrySha256: await sha256File(join(PROJECT_ROOT, 'scripts/reflow-320-fixtures.mjs')),
    sourceSnapshots,
  };
};

export const buildRouteFlowEvidenceManifest = ({
  context,
  browser,
  browserVersion,
  width,
  height,
  zoom,
}) => ROUTE_FLOW_EVIDENCE_RECORDS.map((record) => {
  const sources = (Array.isArray(record.source) ? record.source : [record.source]).map((source) => ({
    source: source.source,
    symbol: source.symbol,
    responsibility: source.responsibility,
    sourceSnapshotSha256: context.sourceSnapshots[source.source],
  }));
  return {
    id: record.id,
    flow: record.flow,
    sources,
    contractComponentIds: record.contractComponentIds,
    contractStatuses: record.contractStatuses,
    hostScenarioIds: record.hostScenarioIds,
    fixtureIds: record.fixtureIds,
    fixtureRegistry: context.fixtureRegistry,
    fixtureRegistrySha256: context.fixtureRegistrySha256,
    scenarioIds: record.scenarioIds,
    validator: record.validator,
    validatorScript: context.validatorScript,
    validatorScriptSha256: context.validatorScriptSha256,
    assertionIds: record.assertionIds,
    execution: {
      browser,
      browserVersion,
      platform: process.platform,
      architecture: process.arch,
      viewport: { width, height },
      requestedZoom: zoom,
      zoomMethod: 'document.documentElement.style.fontSize',
    },
  };
});

export const resolveRouteFlowStatus = ({ blocked = false, errors = [], issues = [] } = {}) => {
  if (blocked) return 'NOT_TESTED';
  if (errors.length > 0) return 'FAIL';
  if (issues.length > 0) return 'REVIEW';
  return 'PASS';
};

const waitFor = async (page, selector, timeout = 10_000) => {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout });
};

const waitForCondition = async (page, predicate, arg, timeout = 10_000) => {
  await page.waitForFunction(predicate, arg, { timeout });
};

export const homeAssertions = (evidence) => {
  const failures = [];
  if (!evidence?.priorityPanelVisible) {
    failures.push({
      id: 'home-priority-panel-missing',
      message: 'the real home match-priority panel is not visible',
      evidence,
    });
  }
  if (!evidence?.priorityHeadingVisible) {
    failures.push({
      id: 'home-priority-heading-missing',
      message: 'the home match-priority panel has no visible fixture heading',
      evidence,
    });
  }
  if ((evidence?.gameCardCount ?? 0) < 1) {
    failures.push({
      id: 'home-game-cards-missing',
      message: 'the fixture-backed home match panel has no game card',
      evidence,
    });
  }
  if (!evidence?.fixtureTeamsVisible) {
    failures.push({
      id: 'home-fixture-content-missing',
      message: 'the home panel does not expose the fixture teams from the stubbed payload',
      evidence,
    });
  }
  if (!evidence?.primaryActionVisible) {
    failures.push({
      id: 'home-primary-action-missing',
      message: 'the home primary route action is not visible',
      evidence,
    });
  }
  if (!evidence?.dateNextVisible || evidence?.dateNextDisabled) {
    failures.push({
      id: 'home-date-navigation-missing',
      message: 'the home next-date control is missing or disabled despite fixture navigation data',
      evidence,
    });
  }
  if (evidence?.dateNavigationChecked && !evidence.dateNavigationUpdated) {
    failures.push({
      id: 'home-date-navigation-not-updated',
      message: 'the home next-date interaction did not update the route query',
      evidence,
    });
  }
  return failures;
};

export const myPageAssertions = (evidence) => {
  const failures = [];
  if (!evidence?.shellVisible) {
    failures.push({
      id: 'mypage-shell-missing',
      message: 'the authenticated MyPage runtime shell is not visible',
      evidence,
    });
  }
  if (!evidence?.statsToggleVisible || !evidence?.statsPanelVisible) {
    failures.push({
      id: 'mypage-stats-flow-missing',
      message: 'the MyPage stats control did not expose its expected panel',
      evidence,
    });
  }
  if (!evidence?.seasonHeatmapVisible) {
    failures.push({
      id: 'mypage-season-flow-missing',
      message: 'the MyPage season navigation did not expose its heatmap',
      evidence,
    });
  }
  if (!evidence?.ticketOpenVisible || !evidence?.dialogVisible || !evidence?.cancelFocused) {
    failures.push({
      id: 'mypage-ticket-flow-missing',
      message: 'the MyPage ticket action did not open a focusable upload dialog',
      evidence,
    });
  }
  if (!evidence?.dialogClosedByEscape) {
    failures.push({
      id: 'mypage-ticket-escape-missing',
      message: 'the MyPage ticket dialog did not close through Escape',
      evidence,
    });
  }
  return failures;
};

export const stadiumAssertions = (evidence) => {
  const failures = [];
  if (!evidence?.seatMapVisible) {
    failures.push({
      id: 'stadium-seat-map-missing',
      message: 'the stadium route did not expose the real seat-map surface',
      evidence,
    });
  }
  if (!evidence?.guideSelectVisible) {
    failures.push({
      id: 'stadium-guide-select-missing',
      message: 'the stadium route did not expose the guide selector',
      evidence,
    });
  }
  if (!evidence?.guideSelectFocused) {
    failures.push({
      id: 'stadium-guide-select-focus-missing',
      message: 'the stadium guide selector did not receive focus',
      evidence,
    });
  }
  return failures;
};

export const collectHomeEvidence = async (page) => page.evaluate((source) => {
  const panel = document.querySelector(source.selectors.priorityPanel);
  const panelText = panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const heading = panel?.querySelector('h2, h3');
  const primaryAction = document.querySelector(source.selectors.primaryAction);
  const dateNext = document.querySelector(source.selectors.dateNext);
  const gameCards = panel?.querySelectorAll(source.selectors.gameCard) ?? [];
  return {
    source,
    priorityPanelVisible: panel instanceof HTMLElement && panel.getBoundingClientRect().height > 0,
    priorityHeadingVisible: heading instanceof HTMLElement
      && heading.getBoundingClientRect().height > 0
      && (heading.textContent?.trim().length ?? 0) > 0,
    priorityHeadingText: heading?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    gameCardCount: gameCards.length,
    fixtureTeamsVisible: panelText.includes('한화 이글스') && panelText.includes('롯데 자이언츠'),
    panelText: panelText.slice(0, 1000),
    primaryActionVisible: primaryAction instanceof HTMLElement && primaryAction.getBoundingClientRect().height > 0,
    dateNextVisible: dateNext instanceof HTMLElement && dateNext.getBoundingClientRect().height > 0,
    dateNextDisabled: dateNext instanceof HTMLButtonElement ? dateNext.disabled : null,
    url: window.location.href,
  };
}, HOME_FLOW_SOURCE);

const collectProductDefectEvidence = async (page) => page.evaluate((sourceMap) => {
  const rectData = (rect) => ({
    x: Number((rect.x ?? rect.left).toFixed(2)),
    y: Number((rect.y ?? rect.top).toFixed(2)),
    width: Number(rect.width.toFixed(2)),
    height: Number(rect.height.toFixed(2)),
    right: Number(rect.right.toFixed(2)),
    bottom: Number(rect.bottom.toFixed(2)),
  });
  const intersect = (a, b) => {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return right > left && bottom > top
      ? { left, top, right, bottom, width: right - left, height: bottom - top }
      : null;
  };
  const clipRect = (element) => {
    let visible = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
    let ancestor = element.parentElement;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      const clips = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflow)
        || ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)
        || ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY);
      if (clips) {
        const next = intersect(visible, ancestor.getBoundingClientRect());
        if (!next) return null;
        visible = next;
      }
      ancestor = ancestor.parentElement;
    }
    return visible;
  };
  const visibleRect = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const clip = clipRect(element);
    const visible = clip ? intersect(rect, clip) : rect;
    return visible ? { rect, visible } : null;
  };
  const selector = (element) => element?.getAttribute('data-testid')
    || element?.getAttribute('aria-label')
    || element?.tagName?.toLowerCase()
    || null;
  const elementForSelector = (candidate) => document.querySelector(candidate);
  const targetRect = (candidate) => visibleRect(elementForSelector(candidate));
  const navbarTargets = sourceMap.navbar.selectors
    .map((candidate) => ({ candidate, element: elementForSelector(candidate) }))
    .filter(({ element }) => element instanceof HTMLElement)
    .map(({ candidate, element }) => {
      const geometry = targetRect(candidate);
      return {
        candidate,
        selector: selector(element),
        element,
        geometry,
      };
    })
    // A responsive toggle can intentionally expose both a semantic and a
    // data-testid selector. Treat those as one control, otherwise the audit
    // reports the element overlapping itself in the 200% matrix.
    .filter((target, index, targets) => targets.findIndex((candidate) => candidate.element === target.element) === index);
  const overlaps = [];
  for (let leftIndex = 0; leftIndex < navbarTargets.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < navbarTargets.length; rightIndex += 1) {
      const left = navbarTargets[leftIndex];
      const right = navbarTargets[rightIndex];
      if (!left.geometry?.visible || !right.geometry?.visible) continue;
      const area = intersect(left.geometry.visible, right.geometry.visible);
      if (!area) continue;
      const points = [
        [area.left + (area.width / 2), area.top + (area.height / 2)],
        [area.left + 2, area.top + 2],
        [area.right - 2, area.bottom - 2],
      ].filter(([x, y]) => x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight);
      const hitByOtherControl = points.some(([x, y]) => {
        const topElement = document.elementFromPoint(x, y);
        return topElement && (left.element === topElement || left.element.contains(topElement)
          || right.element === topElement || right.element.contains(topElement));
      });
      overlaps.push({
        left: left.selector,
        right: right.selector,
        area: rectData(area),
        hitByOtherControl,
      });
    }
  }
  const title = elementForSelector(sourceMap.ticketModal.selectors[0]);
  const titleRange = title ? document.createRange() : null;
  if (titleRange) titleRange.selectNodeContents(title);
  const dropzone = targetRect(sourceMap.ticketModal.selectors[1]);
  const cancel = targetRect(sourceMap.ticketModal.selectors[2]);
  const dropzoneVisibleRatio = dropzone?.rect.width > 0 && dropzone.rect.height > 0
    ? dropzone.visible.height / dropzone.rect.height
    : 0;
  const visibleTicketOverlap = dropzone?.visible && cancel?.visible
    ? intersect(dropzone.visible, cancel.visible)
    : null;
  return {
    sourceMap,
    navbar: {
      targets: navbarTargets.map(({ candidate, selector: targetSelector, geometry }) => ({
        candidate,
        selector: targetSelector,
        rect: geometry?.rect ? rectData(geometry.rect) : null,
        visibleRect: geometry?.visible ? rectData(geometry.visible) : null,
      })),
      actualInteractiveOverlaps: overlaps.filter((overlap) => overlap.hitByOtherControl),
    },
    ticketModal: {
      title: {
        selector: selector(title),
        lineCount: titleRange ? [...titleRange.getClientRects()].length : 0,
        rect: title ? rectData(title.getBoundingClientRect()) : null,
      },
      dropzone: dropzone ? {
        rect: rectData(dropzone.rect),
        visibleRect: rectData(dropzone.visible),
        visibleRatio: Number(dropzoneVisibleRatio.toFixed(3)),
      } : null,
      cancel: cancel ? {
        rect: rectData(cancel.rect),
        visibleRect: rectData(cancel.visible),
      } : null,
      actualInteractiveOverlap: visibleTicketOverlap ? rectData(visibleTicketOverlap) : null,
    },
  };
}, PRODUCT_DEFECT_SOURCES);

export const productDefectAssertions = (evidence, { zoom } = {}) => {
  if (zoom !== 2) return [];
  const failures = [];
  if ((evidence.navbar?.actualInteractiveOverlaps?.length ?? 0) > 0) {
    failures.push({
      id: 'navbar-interactive-overlap',
      message: 'navbar notification/DM/menu controls have an actual hit-area overlap',
      evidence: evidence.navbar.actualInteractiveOverlaps,
    });
  }
  if (evidence.ticketModal?.title && evidence.ticketModal.title.lineCount > 2) {
    failures.push({
      id: 'ticket-modal-title-overflow',
      message: 'ticket modal title is split into more than two visual lines',
      evidence: evidence.ticketModal.title,
    });
  }
  if (evidence.ticketModal?.dropzone && evidence.ticketModal.dropzone.visibleRatio < 0.85) {
    failures.push({
      id: 'ticket-modal-dropzone-clipped',
      message: 'ticket upload dropzone is mostly clipped by the scroll body at 200% text zoom',
      evidence: evidence.ticketModal.dropzone,
    });
  }
  if (evidence.ticketModal?.actualInteractiveOverlap) {
    failures.push({
      id: 'ticket-modal-interactive-overlap',
      message: 'ticket upload dropzone and cancel button visibly overlap',
      evidence: evidence.ticketModal.actualInteractiveOverlap,
    });
  }
  return failures;
};

const screenshotEvidence = async (page, outputDir, label) => {
  if (!outputDir) return null;
  await mkdir(outputDir, { recursive: true });
  const screenshotPath = join(outputDir, `${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const sha256 = createHash('sha256').update(await readFile(screenshotPath)).digest('hex');
  return { path: screenshotPath, sha256 };
};

const setTextZoom = async (page, zoom, selectors = []) => {
  const before = await page.evaluate((keySelectors) => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).fontSize : null;
    };
    return {
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      keyFontSizes: Object.fromEntries(keySelectors.map((selector) => [selector, read(selector)])),
    };
  }, selectors);
  await page.evaluate((nextZoom) => {
    document.documentElement.style.fontSize = `${16 * nextZoom}px`;
  }, zoom);
  await page.waitForTimeout(250);
  const after = await page.evaluate((keySelectors) => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).fontSize : null;
    };
    return {
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      keyFontSizes: Object.fromEntries(keySelectors.map((selector) => [selector, read(selector)])),
    };
  }, selectors);
  return {
    method: 'document.documentElement.style.fontSize',
    requestedZoom: zoom,
    before,
    after,
  };
};

const measureFocusedRoute = async (page, route, width, zoom, flow) => {
  const viewport = { width, height: width <= 430 ? 844 : 900 };
  const measurement = await page.evaluate(VISUAL_QA_PROBE);
  return {
    flow,
    route,
    viewport,
    zoom,
    focus: await page.evaluate(() => {
      const active = document.activeElement;
      return active instanceof HTMLElement
        ? { selector: active.id ? `#${active.id}` : active.getAttribute('data-testid') }
        : null;
    }),
    focusObscured: measurement.focusObscured ?? [],
    focusPartiallyObscured: measurement.focusPartiallyObscured ?? [],
    issues: buildIssues({ route: `${route}#flow=${flow}`, viewport, measurement }),
  };
};

const runStadiumFlow = async (page, baseUrl, width, zoom, evidenceDir) => {
  await page.goto(new URL('/stadium', baseUrl).toString(), { waitUntil: 'commit' });
  await settle(page);
  const zoomMetrics = await setTextZoom(page, zoom, ['#stadium-guide-select', '[data-testid="stadium-seat-map"] h2']);
  await waitFor(page, '[data-testid="stadium-seat-map"]');
  const seatMapVisible = await page.locator('[data-testid="stadium-seat-map"]').first().isVisible();
  const guideSelect = page.locator('#stadium-guide-select');
  const guideSelectVisible = await guideSelect.isVisible();
  await guideSelect.focus();
  const guideSelectFocused = await page.evaluate(() => document.activeElement?.id === 'stadium-guide-select');
  const stadiumEvidence = {
    sourceIdentities: STADIUM_FLOW_SOURCE_IDENTITIES,
    seatMapVisible,
    guideSelectVisible,
    guideSelectFocused,
  };
  const stadiumAssertionFailures = stadiumAssertions(stadiumEvidence);
  const normal = await measureFocusedRoute(page, '/stadium', width, zoom, 'seat-map-render-focus');
  normal.zoomMetrics = zoomMetrics;
  normal.stadiumEvidence = stadiumEvidence;
  normal.stadiumAssertionIds = STADIUM_ASSERTION_IDS;
  normal.stadiumAssertionFailures = stadiumAssertionFailures;
  normal.productEvidence = await collectProductDefectEvidence(page);
  normal.productEvidence.assertionFailures = [
    ...stadiumAssertionFailures,
    ...productDefectAssertions(normal.productEvidence, { zoom }),
  ];
  normal.productEvidence.screenshot = zoom === 2
    ? await screenshotEvidence(page, evidenceDir, `stadium-seat-map-render-focus-${width}-${zoom * 100}`)
    : null;
  return { normal };
};

const runMyPageFlow = async (page, baseUrl, width, zoom, evidenceDir) => {
  await page.goto(new URL('/mypage', baseUrl).toString(), { waitUntil: 'commit' });
  await settle(page);
  const zoomMetrics = await setTextZoom(page, zoom, [
    MY_PAGE_FLOW_SOURCE.selectors.statsToggle,
    `${MY_PAGE_FLOW_SOURCE.selectors.statsPanel} h2`,
    `${MY_PAGE_FLOW_SOURCE.selectors.dialog} h2`,
  ]);
  await waitFor(page, MY_PAGE_FLOW_SOURCE.selectors.statsToggle);
  const shellVisible = await page.locator(MY_PAGE_FLOW_SOURCE.selectors.shell).isVisible();
  const statsToggleVisible = await page.locator(MY_PAGE_FLOW_SOURCE.selectors.statsToggle).isVisible();
  await page.locator(MY_PAGE_FLOW_SOURCE.selectors.statsToggle).click();
  await waitFor(page, MY_PAGE_FLOW_SOURCE.selectors.statsPanel);
  const statsPanelVisible = await page.locator(MY_PAGE_FLOW_SOURCE.selectors.statsPanel).isVisible();
  await page.locator(MY_PAGE_FLOW_SOURCE.selectors.statsToggle).focus();
  const stats = await measureFocusedRoute(page, '/mypage', width, zoom, 'stats-tab-open');
  stats.zoomMetrics = zoomMetrics;
  stats.productEvidence = await collectProductDefectEvidence(page);
  stats.productEvidence.assertionFailures = productDefectAssertions(stats.productEvidence, { zoom });
  stats.productEvidence.screenshot = zoom === 2
    ? await screenshotEvidence(page, evidenceDir, `mypage-stats-tab-open-${width}-${zoom * 100}`)
    : null;

  await page.locator(MY_PAGE_FLOW_SOURCE.selectors.seasonMenu).first().click();
  await waitFor(page, MY_PAGE_FLOW_SOURCE.selectors.seasonHeatmap);
  const seasonHeatmapVisible = await page.locator(MY_PAGE_FLOW_SOURCE.selectors.seasonHeatmap).isVisible();

  await waitFor(page, MY_PAGE_FLOW_SOURCE.selectors.ticketOpen);
  const ticketOpenVisible = await page.locator(MY_PAGE_FLOW_SOURCE.selectors.ticketOpen).isVisible();
  await page.locator(MY_PAGE_FLOW_SOURCE.selectors.ticketOpen).click();
  await waitFor(page, MY_PAGE_FLOW_SOURCE.selectors.dialog);
  const dialogVisible = await page.locator(MY_PAGE_FLOW_SOURCE.selectors.dialog).isVisible();
  await page.locator(MY_PAGE_FLOW_SOURCE.selectors.cancel).focus();
  const cancelFocused = await page.evaluate((selector) => document.activeElement === document.querySelector(selector), MY_PAGE_FLOW_SOURCE.selectors.cancel);
  const dialog = await measureFocusedRoute(page, '/mypage', width, zoom, 'ticket-dialog-keyboard');
  dialog.zoomMetrics = zoomMetrics;
  dialog.productEvidence = await collectProductDefectEvidence(page);
  dialog.productEvidence.assertionFailures = productDefectAssertions(dialog.productEvidence, { zoom });
  dialog.productEvidence.screenshot = zoom === 2
    ? await screenshotEvidence(page, evidenceDir, `mypage-ticket-dialog-keyboard-${width}-${zoom * 100}`)
    : null;
  await page.keyboard.press('Escape');
  await page.locator(MY_PAGE_FLOW_SOURCE.selectors.dialog).waitFor({ state: 'hidden', timeout: 5_000 });
  const dialogClosedByEscape = !(await page.locator(MY_PAGE_FLOW_SOURCE.selectors.dialog).isVisible());
  const myPageEvidence = {
    source: MY_PAGE_FLOW_SOURCE,
    shellVisible,
    statsToggleVisible,
    statsPanelVisible,
    seasonHeatmapVisible,
    ticketOpenVisible,
    dialogVisible,
    cancelFocused,
    dialogClosedByEscape,
  };
  const myPageAssertionFailures = myPageAssertions(myPageEvidence);
  stats.myPageEvidence = myPageEvidence;
  stats.myPageAssertionIds = MY_PAGE_ASSERTION_IDS;
  stats.myPageAssertionFailures = myPageAssertionFailures;
  dialog.myPageEvidence = myPageEvidence;
  dialog.myPageAssertionIds = MY_PAGE_ASSERTION_IDS;
  dialog.myPageAssertionFailures = myPageAssertionFailures;
  dialog.ticketModalEvidence = {
    sourceIdentities: TICKET_MODAL_FLOW_SOURCE_IDENTITIES,
    dialogVisible,
    cancelFocused,
    dialogClosedByEscape,
  };
  dialog.ticketModalAssertionIds = TICKET_MODAL_ASSERTION_IDS;
  dialog.ticketModalAssertionFailures = myPageAssertionFailures.filter(({ id }) => (
    TICKET_MODAL_ASSERTION_IDS.includes(id)
  ));
  stats.productEvidence.assertionFailures = [...stats.productEvidence.assertionFailures, ...myPageAssertionFailures];
  dialog.productEvidence.assertionFailures = [...dialog.productEvidence.assertionFailures, ...myPageAssertionFailures];

  return { stats, dialog, reenteredSeasonLog: true, dialogClosedByEscape, source: MY_PAGE_FLOW_SOURCE };
};

const runHomeFlow = async (page, baseUrl, width, zoom, evidenceDir) => {
  await page.goto(new URL('/home', baseUrl).toString(), { waitUntil: 'commit' });
  await settle(page);
  const zoomMetrics = await setTextZoom(page, zoom, [
    'h1',
    HOME_FLOW_SOURCE.selectors.primaryAction,
    HOME_FLOW_SOURCE.selectors.dateNext,
    `${HOME_FLOW_SOURCE.selectors.priorityPanel} h3`,
  ]);
  await waitFor(page, HOME_FLOW_SOURCE.selectors.priorityPanel);
  await waitFor(page, HOME_FLOW_SOURCE.selectors.gameCard);
  await page.locator(HOME_FLOW_SOURCE.selectors.dateNext).focus();
  const evidence = await collectHomeEvidence(page);
  const failures = homeAssertions(evidence);
  const beforeNavigationUrl = page.url();
  const dateNext = page.locator(HOME_FLOW_SOURCE.selectors.dateNext);
  if (!await dateNext.isDisabled()) {
    await dateNext.click();
    await waitForCondition(page, (previousUrl) => window.location.href !== previousUrl, beforeNavigationUrl);
  }
  const afterNavigationUrl = page.url();
  const navigationEvidence = {
    ...evidence,
    dateNavigationChecked: true,
    dateNavigationUpdated: afterNavigationUrl !== beforeNavigationUrl,
    beforeNavigationUrl,
    afterNavigationUrl,
  };
  failures.push(...homeAssertions(navigationEvidence).filter((failure) => (
    failure.id === 'home-date-navigation-not-updated'
  )));
  const normal = await measureFocusedRoute(page, '/home', width, zoom, 'home-content-and-navigation');
  normal.zoomMetrics = zoomMetrics;
  normal.homeEvidence = navigationEvidence;
  normal.homeAssertionIds = HOME_ASSERTION_IDS;
  normal.homeAssertionFailures = failures;
  normal.productEvidence = {
    source: HOME_FLOW_SOURCE,
    assertionFailures: failures,
    screenshot: zoom === 2
      ? await screenshotEvidence(page, evidenceDir, `home-content-and-navigation-${width}-${zoom * 100}`)
      : null,
  };
  return { normal };
};

const flattenFlowEvidence = (flowResult) => Object.values(flowResult)
  .flatMap((value) => (value && typeof value === 'object' && Array.isArray(value.issues) ? [value] : []));

const flattenProductFailures = (flowResult) => Object.values(flowResult)
  .flatMap((value) => value?.productEvidence?.assertionFailures ?? []);

export const runRouteFlowAudit = async ({
  baseUrl = process.env.VISUAL_QA_BASE_URL ?? 'http://127.0.0.1:5180',
  widths = ROUTE_FLOW_WIDTHS,
  zooms = ROUTE_FLOW_ZOOMS,
  browsers = ['chromium', 'webkit'],
  evidenceDir = process.env.VISUAL_QA_ROUTE_FLOW_EVIDENCE_DIR
    ?? '/private/tmp/kbo-visual-qa-route-flow/screenshots',
} = {}) => {
  const playwright = await loadPlaywright();
  const evidenceContext = await loadRouteFlowEvidenceContext();
  const results = [];
  for (const browserName of browsers) {
    const browserType = playwright[browserName];
    if (!browserType) {
      results.push({ browser: browserName, status: 'NOT_TESTED', reason: 'browser engine unavailable' });
      continue;
    }
    let browser;
    try {
      browser = await browserType.launch({ headless: true });
    } catch (error) {
      results.push({
        browser: browserName,
        status: 'NOT_TESTED',
        reason: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    try {
      const browserVersion = browser.version();
      for (const width of widths) {
        for (const zoom of zooms) {
          const context = await browser.newContext({ viewport: { width, height: width <= 430 ? 844 : 900 } });
          const externalRequests = [];
          await context.route('**/*', (route) => {
            const requestUrl = new URL(route.request().url());
            if (requestUrl.origin !== new URL(baseUrl).origin) {
              externalRequests.push(requestUrl.origin);
              return route.abort();
            }
            return route.fallback();
          });
          await stubApi(context, { allowedOrigin: new URL(baseUrl).origin });
          await context.addInitScript(() => {
            try {
              window.localStorage.setItem('auth-bootstrap-hint', '1');
            } catch { /* local storage can be unavailable in hardened browsers */ }
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          try {
            const home = await runHomeFlow(page, baseUrl, width, zoom, evidenceDir);
            const stadium = await runStadiumFlow(page, baseUrl, width, zoom, evidenceDir);
            const mypage = await runMyPageFlow(page, baseUrl, width, zoom, evidenceDir);
            const issues = [...flattenFlowEvidence(home), ...flattenFlowEvidence(stadium), ...flattenFlowEvidence(mypage)]
              .flatMap((evidence) => evidence.issues);
            const productFailures = [
              ...flattenProductFailures(home),
              ...flattenProductFailures(stadium),
              ...flattenProductFailures(mypage),
            ];
            const evidenceManifest = buildRouteFlowEvidenceManifest({
              context: evidenceContext,
              browser: browserName,
              browserVersion,
              width,
              height: width <= 430 ? 844 : 900,
              zoom,
            });
            results.push({
              browser: browserName,
              browserVersion,
              width,
              zoom,
              status: resolveRouteFlowStatus({ errors, issues: [...issues, ...productFailures] }),
              issues,
              productFailures,
              externalRequests: [...new Set(externalRequests)],
              pageErrors: errors,
              evidenceManifest,
              flows: { home, stadium, mypage },
            });
          } catch (error) {
            results.push({
              browser: browserName,
              width,
              zoom,
              status: 'FAIL',
              browserVersion,
              errors: [error instanceof Error ? error.message : String(error)],
              externalRequests: [...new Set(externalRequests)],
              pageErrors: errors,
              evidenceManifest: buildRouteFlowEvidenceManifest({
                context: evidenceContext,
                browser: browserName,
                browserVersion,
                width,
                height: width <= 430 ? 844 : 900,
                zoom,
              }),
            });
          } finally {
            await context.close();
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
  return results;
};

if (process.argv[1]?.endsWith('visual-qa-route-flow.integration.mjs')) {
  const outputPath = process.env.VISUAL_QA_ROUTE_FLOW_REPORT ?? '/private/tmp/kbo-visual-qa-route-flow.json';
  runRouteFlowAudit()
    .then(async (results) => {
      await writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`, 'utf8');
      const counts = results.reduce((summary, result) => {
        summary[result.status] = (summary[result.status] ?? 0) + 1;
        return summary;
      }, {});
      console.log(`[visual-qa:route-flow] ${JSON.stringify(counts)} report=${outputPath}`);
      if (results.some((result) => result.status === 'FAIL')) process.exitCode = 1;
      if (process.env.VISUAL_QA_ASSERT_PRODUCT_DEFECTS === '1'
        && results.some((result) => result.productFailures?.length > 0)) {
        console.error('[visual-qa:route-flow] product defect assertions failed');
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(`[visual-qa:route-flow] FAILED ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
