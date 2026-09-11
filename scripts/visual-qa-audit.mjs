#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { access, link, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUTHED_ROUTES,
  DEFAULT_ROUTES as REFLOW_DEFAULT_ROUTES,
  LOGGED_OUT_ROUTES,
  loadPlaywright,
  settle,
  stubApi,
} from './reflow-320-audit.mjs';
import {
  buildIssues,
  buildReport,
  parseViewportWidths,
  renderHtmlReport,
  scenarioSlug,
} from './visual-qa-lib.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');

export const DEFAULT_ROUTES = [...REFLOW_DEFAULT_ROUTES];
export const DEFAULT_WIDTHS = [320, 360, 390, 430, 480, 600, 767, 768, 834, 1024, 1040, 1160, 1280, 1440];
export const DEFAULT_STATE_SCENARIOS = [
  {
    id: 'public-mobile-menu',
    name: '공개 모바일 메뉴',
    route: '/home',
    session: 'logged-out',
    minWidth: 320,
    maxWidth: 767,
    trigger: '[aria-label="메뉴 열기"]',
    ready: '#mobile-menu-popup[role="dialog"]',
  },
  {
    id: 'authenticated-mobile-menu',
    name: '인증 모바일 메뉴',
    route: '/mypage',
    minWidth: 320,
    maxWidth: 767,
    trigger: '[aria-label="메뉴 열기"]',
    ready: '#mobile-menu-popup[role="dialog"]',
  },
  {
    id: 'mate-filter-sheet',
    name: '메이트 필터 바텀시트',
    route: '/mate',
    minWidth: 320,
    maxWidth: 1023,
    trigger: '[data-testid="mate-mobile-filter-open"]',
    ready: '[data-testid="mate-filter-sheet"]',
  },
  {
    id: 'mypage-ticket-upload',
    name: '티켓 등록 모달',
    route: '/mypage',
    minWidth: 320,
    maxWidth: 1440,
    trigger: '[data-testid="mypage-ticket-upload-open"]',
    ready: '[data-testid="ticket-upload-dialog"]',
    focusSelector: '[data-testid="ticket-upload-dialog"] [data-testid="ticket-upload-cancel"]',
  },
  {
    id: 'authenticated-chatbot',
    name: '인증 챗봇 패널',
    route: '/mypage',
    minWidth: 320,
    maxWidth: 1440,
    trigger: '[data-testid="auth-mobile-chatbot-tab"]:visible, [data-testid="chatbot-request-launcher"]:visible',
    ready: '[data-testid="chatbot-panel"]',
  },
  {
    id: 'stadium-seat-map-route',
    name: '실제 경기장 좌석도 라우트',
    route: '/stadium',
    minWidth: 320,
    maxWidth: 390,
    trigger: '[data-testid="stadium-seat-map"]',
    ready: '[data-testid="stadium-seat-map"]',
    focusSelector: '#stadium-guide-select',
  },
  {
    id: 'mypage-stats-tab-route',
    name: '마이페이지 기록 탭',
    route: '/mypage',
    minWidth: 320,
    maxWidth: 390,
    trigger: '[data-testid="mypage-toggle-stats"]',
    ready: '[data-testid="mypage-monthly-visit-bars"]',
    focusSelector: '[data-testid="mypage-toggle-stats"]',
  },
];

export const viewportForWidth = (width) => ({
  width,
  height: width <= 430 ? 844 : width <= 834 ? 1024 : 900,
});

export const buildVisualQaScenarioRuns = ({
  routes,
  widths,
  stateScenarios = DEFAULT_STATE_SCENARIOS,
}) => [
  ...routes.flatMap((route) => widths.map((width) => ({ route, width, state: null }))),
  ...stateScenarios.flatMap((state) => (
    routes.includes(state.route)
      ? widths
        .filter((width) => width >= state.minWidth && width <= state.maxWidth)
        .map((width) => ({ route: state.route, width, state }))
      : []
  )),
];

const argumentValue = (argv, name) => {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};

const routePathname = (route) => new URL(route, 'https://visual-qa.invalid').pathname;

const assertSameOriginRoute = (route) => {
  if (!/^\/(?!\/)/.test(route) || route.includes('\\')) {
    throw new Error(`Route must be a same-origin path starting with one “/”: ${route}`);
  }
  const parsed = new URL(route, 'https://visual-qa.invalid');
  if (parsed.origin !== 'https://visual-qa.invalid') {
    throw new Error(`Route must be a same-origin path starting with one “/”: ${route}`);
  }
};

const parseRoutes = (value) => {
  const routes = String(value).split(',').map((route) => route.trim()).filter(Boolean);
  if (routes.length === 0) throw new Error('Provide at least one route.');
  for (const route of routes) assertSameOriginRoute(route);
  return [...new Set(routes)];
};

export const resolveRouteUrl = (baseUrl, route) => {
  assertSameOriginRoute(route);
  const base = new URL(baseUrl);
  const target = new URL(route, base);
  if (target.origin !== base.origin) {
    throw new Error(`Route must be a same-origin path starting with one “/”: ${route}`);
  }
  return target.toString();
};

export const parseArguments = (argv = process.argv.slice(2), env = process.env) => {
  const baseUrl = argumentValue(argv, '--base-url') || env.VISUAL_QA_BASE_URL || 'http://127.0.0.1:5180';
  const routes = parseRoutes(argumentValue(argv, '--routes') || env.VISUAL_QA_ROUTES || DEFAULT_ROUTES.join(','));
  const widths = parseViewportWidths(argumentValue(argv, '--widths') || env.VISUAL_QA_WIDTHS || DEFAULT_WIDTHS.join(','));
  const outputDir = resolve(PROJECT_ROOT, argumentValue(argv, '--output-dir') || env.VISUAL_QA_OUTPUT_DIR || 'visual-qa');
  const failOn = argumentValue(argv, '--fail-on') || env.VISUAL_QA_FAIL_ON || 'none';
  if (!['none', 'major', 'any'].includes(failOn)) throw new Error('--fail-on must be none, major, or any.');
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Visual QA base URL must use http or https.');
  const allowApi = env.VISUAL_QA_ALLOW_API === '1';
  const storageStateValue = argumentValue(argv, '--storage-state') || env.VISUAL_QA_STORAGE_STATE;
  const storageState = storageStateValue ? resolve(PROJECT_ROOT, storageStateValue) : undefined;
  const protectedRouteRequested = routes.some((route) => {
    const pathname = routePathname(route);
    return AUTHED_ROUTES.some((protectedRoute) => pathname === protectedRoute || pathname.startsWith(`${protectedRoute}/`));
  });
  if (allowApi && protectedRouteRequested && !storageState) {
    throw new Error('VISUAL_QA_STORAGE_STATE is required when a live API scan includes protected routes.');
  }
  return {
    baseUrl: url.toString().replace(/\/$/, ''),
    routes,
    widths,
    outputDir,
    failOn,
    allowApi,
    storageState,
  };
};

export const shouldFailReport = (report, failOn) => {
  if (report.summary.scanErrors > 0) return true;
  const issues = report.scenarios.flatMap((scenario) => scenario.issues ?? []);
  if (failOn === 'any') return issues.length > 0;
  if (failOn === 'major') return issues.some((issue) => issue.severity === 'major');
  return false;
};

export const issueSignature = (issues) => issues
  .map((issue) => `${issue.severity}|${issue.type}|${issue.selector}|${issue.evidence ?? ''}`)
  .sort()
  .join('\n');

/** Runs inside the browser. Keep all helpers inside the function for serialization. */
export const VISUAL_QA_PROBE = () => {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const interactiveQuery = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="tab"], [role="checkbox"], [role="switch"]';
  const result = {
    pageOverflow: null,
    clipped: [],
    overlaps: [],
    smallTargets: [],
    crowdedControls: [],
    fixedObstructions: [],
    focusObscured: [],
    focusPartiallyObscured: [],
    diagnostics: {
      interactiveCandidates: 0,
      interactiveCount: 0,
      overlapComparisons: 0,
      crowdedComparisons: 0,
    },
  };

  let activeSurface = document.querySelector('[data-vqa-active-surface="true"]');
  const inActiveSurface = (element) => !activeSurface || activeSurface.contains(element);
  const ignored = (element) => element.closest('[data-vqa-ignore]') !== null;
  const overlapAllowed = (element) => element.closest('[data-vqa-overlap="allowed"]') !== null;
  const overflowAllowed = (element) => element.closest('[data-vqa-overflow="allowed"]') !== null;
  const compactTouchAllowed = (element) => element.closest('[data-vqa-touch-target="compact"]') !== null;
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity) !== 0
      && rect.bottom > 0
      && rect.top < viewportHeight;
  };
  if (!activeSurface) {
    const visibleModalSurfaces = [...document.querySelectorAll('[aria-modal="true"]')].filter(visible);
    activeSurface = visibleModalSurfaces.at(-1) ?? null;
  }
  const quote = (value) => String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const uniqueSelector = (candidate) => {
    try {
      return document.querySelectorAll(candidate).length === 1 ? candidate : null;
    } catch {
      return null;
    }
  };
  const selector = (element) => {
    if (element === document.documentElement) return 'html';
    if (element.id) {
      const candidate = uniqueSelector(`#${CSS.escape(element.id)}`);
      if (candidate) return candidate;
    }
    for (const attribute of ['data-testid', 'aria-label', 'name']) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const candidate = uniqueSelector(`${element.tagName.toLowerCase()}[${attribute}="${quote(value)}"]`);
      if (candidate) return candidate;
    }
    const parts = [];
    let node = element;
    while (node && node !== document.body) {
      let part = node.tagName.toLowerCase();
      const classNames = [...node.classList].filter((name) => /^[a-zA-Z_-][\w-]*$/.test(name)).slice(0, 2);
      if (classNames.length) part += `.${classNames.join('.')}`;
      const siblings = node.parentElement
        ? [...node.parentElement.children].filter((child) => child.tagName === node.tagName)
        : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return `body > ${parts.join(' > ')}`;
  };
  const text = (element) => (element.innerText || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const rectData = (element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  };
  const fixedLayer = (element) => {
    let node = element;
    while (node && node !== document.body) {
      if (['fixed', 'sticky'].includes(getComputedStyle(node).position)) return node;
      node = node.parentElement;
    }
    return null;
  };
  const colorAlpha = (value) => {
    if (!value || value === 'transparent') return 0;
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return 1;
    const channels = match[1].split(',').map((channel) => channel.trim());
    if (channels.length < 4) return 1;
    const alpha = Number(channels[3]);
    return Number.isFinite(alpha) ? alpha : 1;
  };
  const hasVisiblePaint = (element, style) => {
    if (colorAlpha(style.backgroundColor) > 0 || style.backgroundImage !== 'none' || style.boxShadow !== 'none') return true;
    return ['Top', 'Right', 'Bottom', 'Left'].some((side) => (
      Number.parseFloat(style[`border${side}Width`]) > 0
      && colorAlpha(style[`border${side}Color`]) > 0
    )) || (element.children.length === 0 && Boolean((element.textContent || '').trim()));
  };
  const renderedFixedLayers = () => [...document.querySelectorAll('body *')].filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return ['fixed', 'sticky'].includes(style.position)
      && rect.width > 0
      && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity) > 0.01
      && hasVisiblePaint(element, style);
  });
  const intersectingRect = (source, target) => {
    const left = Math.max(source.left, target.left);
    const top = Math.max(source.top, target.top);
    const right = Math.min(source.right, target.right);
    const bottom = Math.min(source.bottom, target.bottom);
    return right > left && bottom > top
      ? { left, top, right, bottom, width: right - left, height: bottom - top }
      : null;
  };
  const rectUnionRatio = (rects, target) => {
    const clippedRects = rects.map((rect) => intersectingRect(rect, target)).filter(Boolean);
    const targetArea = target.width * target.height;
    if (clippedRects.length === 0 || targetArea <= 0) return 0;
    const xCoordinates = [...new Set(clippedRects.flatMap((rect) => [rect.left, rect.right]))].sort((a, b) => a - b);
    let coveredArea = 0;
    for (let index = 0; index < xCoordinates.length - 1; index += 1) {
      const left = xCoordinates[index];
      const right = xCoordinates[index + 1];
      if (right <= left) continue;
      const yIntervals = clippedRects
        .filter((rect) => rect.left <= left && rect.right >= right)
        .map((rect) => [rect.top, rect.bottom])
        .sort((a, b) => a[0] - b[0]);
      let coveredHeight = 0;
      let intervalStart = null;
      let intervalEnd = null;
      for (const [top, bottom] of yIntervals) {
        if (intervalStart === null) {
          intervalStart = top;
          intervalEnd = bottom;
        } else if (top <= intervalEnd) {
          intervalEnd = Math.max(intervalEnd, bottom);
        } else {
          coveredHeight += intervalEnd - intervalStart;
          intervalStart = top;
          intervalEnd = bottom;
        }
      }
      if (intervalStart !== null) coveredHeight += intervalEnd - intervalStart;
      coveredArea += (right - left) * coveredHeight;
    }
    return Math.min(1, coveredArea / targetArea);
  };
  const isClippedByAncestor = (element, stopAt = null) => {
    let parent = element.parentElement;
    while (parent && parent !== document.documentElement) {
      if (parent === stopAt) return false;
      const style = getComputedStyle(parent);
      const rect = parent.getBoundingClientRect();
      if (rect.left >= -1 && rect.right <= viewportWidth + 1
        && ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) return true;
      parent = parent.parentElement;
    }
    return false;
  };

  // Check the element that is actually focused. Interaction-driven probes can
  // therefore prove both the passing state and a real fixed/sticky obstruction
  // without scanning every focusable node on every route.
  if (viewportWidth < 768) {
    const focusedElement = document.activeElement;
    if (focusedElement instanceof HTMLElement
      && focusedElement !== document.body
      && focusedElement !== document.documentElement
      && inActiveSurface(focusedElement)
      && !ignored(focusedElement)
      && visible(focusedElement)) {
      const focusRect = focusedElement.getBoundingClientRect();
      const inset = Math.min(4, focusRect.width / 4, focusRect.height / 4);
      const samplePoints = [
        [focusRect.left + focusRect.width / 2, focusRect.top + focusRect.height / 2],
        [focusRect.left + inset, focusRect.top + inset],
        [focusRect.right - inset, focusRect.top + inset],
        [focusRect.left + inset, focusRect.bottom - inset],
        [focusRect.right - inset, focusRect.bottom - inset],
      ].filter(([x, y]) => x >= 0 && x <= viewportWidth && y >= 0 && y <= viewportHeight);
      const coveredSamples = samplePoints
        .map(([x, y]) => {
          const topElement = document.elementFromPoint(x, y);
          const belongsToFocus = topElement === focusedElement || focusedElement.contains(topElement);
          return { layer: belongsToFocus ? null : fixedLayer(topElement) };
        })
        .filter(({ layer }) => layer !== null);
      const obstructionLayers = renderedFixedLayers().filter((layer) => (
        layer !== focusedElement
        && !layer.contains(focusedElement)
        && intersectingRect(layer.getBoundingClientRect(), focusRect)
      ));
      const obstructionRects = obstructionLayers.map((layer) => layer.getBoundingClientRect());
      const sampleCoverageRatio = samplePoints.length > 0
        ? coveredSamples.length / samplePoints.length
        : 0;
      const coveredRatio = rectUnionRatio(obstructionRects, focusRect);
      const obstruction = obstructionLayers
        .map((layer) => ({ layer, area: intersectingRect(layer.getBoundingClientRect(), focusRect) }))
        .filter(({ area }) => area !== null)
        .sort((a, b) => (b.area.width * b.area.height) - (a.area.width * a.area.height))[0]?.layer;
      if (obstruction && coveredRatio > 0) {
        const entry = {
          selector: selector(focusedElement),
          relatedSelector: selector(obstruction),
          coveredRatio,
          sampleCoverageRatio,
          coverageMethod: 'rect-union',
          focusRect: rectData(focusedElement),
          obstructionRect: rectData(obstruction),
          obstructionPosition: getComputedStyle(obstruction).position,
        };
        if (coveredRatio >= 0.999) result.focusObscured.push(entry);
        else result.focusPartiallyObscured.push(entry);
      }
    }
  }

  const overflowCandidates = activeSurface
    ? [activeSurface, ...activeSurface.querySelectorAll('*')]
    : [...document.querySelectorAll('body *')];
  const activeSurfaceRect = activeSurface?.getBoundingClientRect() ?? null;
  const measureActiveSurfaceIntrinsicOverflow = () => {
    if (!activeSurface || ignored(activeSurface) || overflowAllowed(activeSurface)) return 0;
    const exceptionRoots = [...activeSurface.querySelectorAll('[data-vqa-overflow="allowed"], [data-vqa-ignore]')]
      .filter((element) => !element.parentElement?.closest('[data-vqa-overflow="allowed"], [data-vqa-ignore]'));
    const savedStyles = exceptionRoots.map((element) => [element, element.getAttribute('style')]);
    try {
      for (const [element] of savedStyles) element.style.setProperty('display', 'none', 'important');
      return Math.max(0, activeSurface.scrollWidth - activeSurface.clientWidth);
    } finally {
      for (const [element, style] of savedStyles) {
        if (style === null) element.removeAttribute('style');
        else element.setAttribute('style', style);
      }
    }
  };
  let pageOverflowPx = activeSurface
    ? Math.round(measureActiveSurfaceIntrinsicOverflow())
    : Math.round(document.documentElement.scrollWidth - viewportWidth);
  let overflowOffender = document.documentElement;
  let widestEscape = Number.NEGATIVE_INFINITY;
  for (const element of overflowCandidates) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const rendered = rect.width > 0 && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity) !== 0;
    if (!inActiveSurface(element) || ignored(element) || overflowAllowed(element) || !rendered) continue;
    if (activeSurface ? isClippedByAncestor(element, activeSurface) : (isClippedByAncestor(element) || !visible(element))) continue;
    const escape = activeSurfaceRect
      ? Math.max(rect.right - activeSurfaceRect.right, activeSurfaceRect.left - rect.left, 0)
      : Math.max(rect.right - viewportWidth, -rect.left, 0);
    if (escape > widestEscape) {
      overflowOffender = element;
      widestEscape = escape;
    }
  }
  if (activeSurface) pageOverflowPx = Math.round(Math.max(pageOverflowPx, widestEscape, 0));
  if (pageOverflowPx > 1) {
    result.pageOverflow = { overflowPx: pageOverflowPx, selector: selector(overflowOffender) };
  }

  const clippingCandidates = document.querySelectorAll([
    '[data-vqa-watch]', 'button', 'a[href]', 'input', 'textarea', 'select',
    '[role="button"]', '[role="tab"]', 'h1', 'h2', 'h3', 'h4', '[aria-label]',
  ].join(','));
  for (const element of clippingCandidates) {
    if (result.clipped.length >= 20) break;
    if (!inActiveSurface(element) || ignored(element) || overflowAllowed(element) || !visible(element)) continue;
    const style = getComputedStyle(element);
    if (style.textOverflow === 'ellipsis' || [...element.classList].some((name) => name.startsWith('line-clamp-'))) continue;
    const clippedX = ['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth - element.clientWidth > 2;
    const clippedY = ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight - element.clientHeight > 2;
    if (!clippedX && !clippedY) continue;
    result.clipped.push({
      selector: selector(element),
      axis: clippedX ? 'x' : 'y',
      overflowPx: clippedX ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight,
      text: text(element),
    });
  }

  const interactiveCandidates = [...new Set(document.querySelectorAll(interactiveQuery))]
    .filter((element) => inActiveSurface(element) && !ignored(element) && visible(element) && !element.hasAttribute('disabled'));
  const effectiveTouchTarget = (element) => {
    if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) {
      const associatedLabel = element.labels?.[0];
      if (associatedLabel && visible(associatedLabel)) return associatedLabel;
    }
    return element;
  };
  const interactiveGeometry = interactiveCandidates
    .map((element) => ({ element, rect: rectData(effectiveTouchTarget(element)) }))
    .filter(({ rect }) => rect.right > 0 && rect.left < viewportWidth)
    .map(({ element, rect }) => ({
      element,
      rect,
      fixedLayer: fixedLayer(element),
      overlapAllowed: overlapAllowed(element),
      parent: element.parentElement,
    }));
  result.diagnostics.interactiveCandidates = interactiveCandidates.length;
  result.diagnostics.interactiveCount = interactiveGeometry.length;

  if (viewportWidth < 768) {
    for (const { element, rect } of interactiveGeometry) {
      if (result.smallTargets.length >= 20) break;
      const style = getComputedStyle(element);
      if (style.display === 'inline') continue;
      const visibleText = (element.innerText || '').trim();
      const iconLike = visibleText.length === 0 || element.querySelector('svg, img') !== null;
      const belowMinimum = rect.width < 24 || rect.height < 24;
      // 40px is the conservative automatic threshold. The report still
      // recommends 44px, but treating every established 40px icon button as a
      // defect creates repeated noise across every route.
      const belowComfortableIconTarget = !compactTouchAllowed(element)
        && iconLike
        && (rect.width < 40 || rect.height < 40);
      if (!belowMinimum && !belowComfortableIconTarget) continue;
      result.smallTargets.push({ selector: selector(element), width: rect.width, height: rect.height, text: text(element) });
    }
  }

  const intersection = (a, b) => {
    const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (width <= 0 || height <= 0) return null;
    return { width, height, area: width * height };
  };
  const spatialCellSize = 64;
  const cellsForRect = (rect, padding = 0) => {
    const left = Math.max(0, Math.min(viewportWidth, rect.left - padding));
    const right = Math.max(0, Math.min(viewportWidth, rect.right + padding));
    const top = Math.max(0, Math.min(viewportHeight, rect.top - padding));
    const bottom = Math.max(0, Math.min(viewportHeight, rect.bottom + padding));
    if (right <= left || bottom <= top) return [];
    const minX = Math.floor(left / spatialCellSize);
    const maxX = Math.floor((right - 0.001) / spatialCellSize);
    const minY = Math.floor(top / spatialCellSize);
    const maxY = Math.floor((bottom - 0.001) / spatialCellSize);
    const cells = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) cells.push(`${x}:${y}`);
    }
    return cells;
  };
  const buildSpatialBuckets = (padding = 0) => {
    const buckets = new Map();
    for (let index = 0; index < interactiveGeometry.length; index += 1) {
      for (const cell of cellsForRect(interactiveGeometry[index].rect, padding)) {
        const entries = buckets.get(cell) ?? [];
        entries.push(index);
        buckets.set(cell, entries);
      }
    }
    return buckets;
  };
  const nearbyIndexes = (buckets, rect, padding = 0) => {
    const indexes = new Set();
    for (const cell of cellsForRect(rect, padding)) {
      for (const index of buckets.get(cell) ?? []) indexes.add(index);
    }
    return indexes;
  };

  const overlapBuckets = buildSpatialBuckets();
  for (let index = 0; index < interactiveGeometry.length && result.overlaps.length < 20; index += 1) {
    const first = interactiveGeometry[index];
    for (const otherIndex of nearbyIndexes(overlapBuckets, first.rect)) {
      if (otherIndex <= index || result.overlaps.length >= 20) continue;
      result.diagnostics.overlapComparisons += 1;
      const second = interactiveGeometry[otherIndex];
      if (first.element.contains(second.element) || second.element.contains(first.element)
        || first.overlapAllowed || second.overlapAllowed) continue;
      const oneFixedLayer = (first.fixedLayer && !second.fixedLayer) || (!first.fixedLayer && second.fixedLayer);
      const contentOverlayLayer = first.fixedLayer || second.fixedLayer;
      if (oneFixedLayer && contentOverlayLayer.closest('[data-vqa-content-overlay="allowed"]')) continue;
      const overlap = intersection(first.rect, second.rect);
      if (!overlap || overlap.width < 4 || overlap.height < 4) continue;
      const overlapRatio = overlap.area / Math.min(first.rect.width * first.rect.height, second.rect.width * second.rect.height);
      if (overlapRatio < 0.12) continue;
      result.overlaps.push({
        selector: selector(first.element),
        relatedSelector: selector(second.element),
        overlapWidth: overlap.width,
        overlapHeight: overlap.height,
        overlapRatio,
      });
    }
  }

  const crowdedBuckets = buildSpatialBuckets(1);
  for (let index = 0; index < interactiveGeometry.length && result.crowdedControls.length < 12; index += 1) {
    const first = interactiveGeometry[index];
    if (first.element.getAttribute('role') === 'tab' || first.parent?.getAttribute('role') === 'tablist') continue;
    for (const otherIndex of nearbyIndexes(crowdedBuckets, first.rect, 1)) {
      if (otherIndex <= index || result.crowdedControls.length >= 12) continue;
      result.diagnostics.crowdedComparisons += 1;
      const second = interactiveGeometry[otherIndex];
      if (first.parent !== second.parent || first.overlapAllowed || second.overlapAllowed) continue;
      if (intersection(first.rect, second.rect)) continue;
      const verticalProjection = Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top);
      const horizontalProjection = Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left);
      let gap = Number.POSITIVE_INFINITY;
      if (verticalProjection > Math.min(first.rect.height, second.rect.height) * 0.5) {
        gap = Math.max(second.rect.left - first.rect.right, first.rect.left - second.rect.right);
      } else if (horizontalProjection > Math.min(first.rect.width, second.rect.width) * 0.5) {
        gap = Math.max(second.rect.top - first.rect.bottom, first.rect.top - second.rect.bottom);
      }
      // Sub-pixel contact is a useful automatic signal. Deliberate 2–4px dense
      // navigation is too common to classify without visual context.
      if (gap >= 0 && gap < 1) {
        result.crowdedControls.push({
          selector: selector(first.element),
          relatedSelector: selector(second.element),
          gapPx: gap,
        });
      }
    }
  }

  if (viewportWidth < 768) {
    for (const element of document.querySelectorAll('body *')) {
      if (result.fixedObstructions.length >= 8) break;
      if (activeSurface && !activeSurface.contains(element) && !element.contains(activeSurface)) continue;
      if (activeSurface && (element === activeSurface || element.contains(activeSurface))) continue;
      if (ignored(element) || !visible(element) || element.getAttribute('aria-hidden') === 'true') continue;
      const style = getComputedStyle(element);
      // Sticky headers remain in normal document flow while they re-wrap for
      // text zoom. Their occupied height is intentional; interactive overlap
      // and focus-obscured probes still detect a sticky layer that actually
      // covers another control.
      if (style.position !== 'fixed' || style.pointerEvents === 'none') continue;
      const rect = element.getBoundingClientRect();
      const viewportAreaRatio = (rect.width * rect.height) / (viewportWidth * viewportHeight);
      if (viewportAreaRatio < 0.18) continue;
      result.fixedObstructions.push({ selector: selector(element), viewportAreaRatio });
    }
  }

  return result;
};

const prepareAuthedContext = async (browser, options) => {
  const context = await browser.newContext({
    viewport: viewportForWidth(options.widths[0]),
    deviceScaleFactor: 1,
    ...(options.storageState ? { storageState: options.storageState } : {}),
  });
  if (!options.allowApi) await stubApi(context);
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('auth-bootstrap-hint', '1');
    } catch { /* public routes remain scannable */ }
  });
  return context;
};

const prepareLoggedOutContext = async (browser, options) => {
  const context = await browser.newContext({ viewport: viewportForWidth(options.widths[0]), deviceScaleFactor: 1 });
  if (!options.allowApi) {
    await context.route('**/api/**', (route) => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, code: 'VISUAL_QA_STUB' }),
    }));
  }
  return context;
};

const markIssueElements = async (page, issues) => {
  await page.evaluate((selectors) => {
    const style = document.createElement('style');
    style.setAttribute('data-vqa-capture-style', '');
    style.textContent = '[data-vqa-capture-hit]{outline:3px solid #ff3b30!important;outline-offset:2px!important}';
    document.head.append(style);
    for (const selector of selectors) {
      try {
        document.querySelector(selector)?.setAttribute('data-vqa-capture-hit', '');
      } catch { /* diagnostic selector may no longer resolve after rerender */ }
    }
  }, [...new Set(issues.map((issue) => issue.selector))]);
};

const normalizeRoutePathname = (pathname) => pathname === '/'
  ? '/'
  : pathname.replace(/\/+$/, '');

export const routeWasReached = (requested, actual) => (
  normalizeRoutePathname(actual) === normalizeRoutePathname(routePathname(requested))
);

export const createVisualQaOutputStage = async (outputDir, runId = randomUUID()) => {
  const resolvedOutputDir = resolve(outputDir);
  const safeRunId = String(runId).replace(/[^a-zA-Z0-9_-]+/g, '-');
  const outputName = basename(resolvedOutputDir);
  const outputParent = dirname(resolvedOutputDir);
  const stagingDir = resolve(outputParent, `.${outputName}.staging-${safeRunId}`);
  const backupDir = resolve(outputParent, `.${outputName}.backup-${safeRunId}`);
  const lockDir = resolve(outputParent, `.${outputName}.commit.lock`);
  const screenshotsDir = resolve(stagingDir, 'screenshots');
  await rm(stagingDir, { recursive: true, force: true });
  await rm(backupDir, { recursive: true, force: true });
  await mkdir(screenshotsDir, { recursive: true });
  return {
    outputDir: resolvedOutputDir,
    stagingDir,
    backupDir,
    lockDir,
    screenshotsDir,
    jsonPath: resolve(stagingDir, 'report.json'),
    htmlPath: resolve(stagingDir, 'report.html'),
  };
};

const renameIfPresent = async (source, target) => {
  try {
    await rename(source, target);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const outputArtifacts = (stage) => [
  {
    name: 'screenshots',
    source: stage.screenshotsDir,
    target: resolve(stage.outputDir, 'screenshots'),
    backup: resolve(stage.backupDir, 'screenshots'),
  },
  {
    name: 'report.json',
    source: stage.jsonPath,
    target: resolve(stage.outputDir, 'report.json'),
    backup: resolve(stage.backupDir, 'report.json'),
  },
  {
    name: 'report.html',
    source: stage.htmlPath,
    target: resolve(stage.outputDir, 'report.html'),
    backup: resolve(stage.backupDir, 'report.html'),
  },
];

const pathExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const publishVisualQaOutputStage = async (stage) => {
  await Promise.all([
    access(stage.jsonPath),
    access(stage.htmlPath),
    access(stage.screenshotsDir),
  ]);

  await mkdir(stage.outputDir, { recursive: true });
  await mkdir(stage.backupDir, { recursive: true });
  const artifacts = outputArtifacts(stage);
  const backedUp = [];
  const published = [];
  try {
    for (const artifact of artifacts) {
      if (await renameIfPresent(artifact.target, artifact.backup)) backedUp.push(artifact);
    }
    for (const artifact of artifacts) {
      await rename(artifact.source, artifact.target);
      published.push(artifact);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const artifact of published.reverse()) {
      try {
        await rm(artifact.target, { recursive: true, force: true });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const artifact of backedUp.reverse()) {
      try {
        await rename(artifact.backup, artifact.target);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length === 0) {
      try {
        await rm(stage.backupDir, { recursive: true, force: true });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], 'Visual QA output publish and rollback both failed.');
    }
    throw error;
  }
};

const outputCommitQueues = new Map();
const activeOutputLocks = new Set();

const serializeOutputCommit = (outputDir, task) => {
  const queueKey = resolve(outputDir);
  const previous = outputCommitQueues.get(queueKey) ?? Promise.resolve();
  const run = previous.then(task);
  const tail = run.then(() => undefined, () => undefined);
  outputCommitQueues.set(queueKey, tail);
  return run.finally(() => {
    if (outputCommitQueues.get(queueKey) === tail) outputCommitQueues.delete(queueKey);
  });
};

const outputLockOwnerPath = (lockDir) => resolve(lockDir, 'owner.json');
const outputLockRecoveryClaimPath = (lockDir) => resolve(lockDir, 'recovery.claim');

const processIsAlive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
};

const validateLockOwner = (owner, stage) => {
  const outputParent = dirname(stage.outputDir);
  const outputName = basename(stage.outputDir);
  const isRunPath = (value, kind) => {
    if (typeof value !== 'string') return false;
    const candidate = resolve(value);
    return dirname(candidate) === outputParent
      && basename(candidate).startsWith(`.${outputName}.${kind}-`);
  };
  const validArtifactNames = new Set(['screenshots', 'report.json', 'report.html']);
  return owner?.version === 1
    && Number.isInteger(owner.pid)
    && typeof owner.createdAt === 'string'
    && ['preparing', 'ready', 'published'].includes(owner.state)
    && resolve(owner.outputDir ?? '') === stage.outputDir
    && isRunPath(owner.stagingDir, 'staging')
    && isRunPath(owner.backupDir, 'backup')
    && Array.isArray(owner.previousArtifacts)
    && owner.previousArtifacts.every((name) => validArtifactNames.has(name));
};

const stageFromLockOwner = (owner, stage) => ({
  outputDir: stage.outputDir,
  stagingDir: resolve(owner.stagingDir),
  backupDir: resolve(owner.backupDir),
  lockDir: stage.lockDir,
  screenshotsDir: resolve(owner.stagingDir, 'screenshots'),
  jsonPath: resolve(owner.stagingDir, 'report.json'),
  htmlPath: resolve(owner.stagingDir, 'report.html'),
});

const claimOutputLockRecovery = async (lockDir) => {
  const claimPath = outputLockRecoveryClaimPath(lockDir);
  const claim = `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`;
  const tryClaim = async () => {
    const tempPath = resolve(lockDir, `.recovery-claim-${process.pid}-${randomUUID()}.tmp`);
    try {
      await writeFile(tempPath, claim, 'utf8');
      await link(tempPath, claimPath);
      return true;
    } catch (error) {
      if (error?.code === 'EEXIST') return false;
      throw error;
    } finally {
      await rm(tempPath, { force: true }).catch(() => {});
    }
  };
  if (await tryClaim()) return true;

  let removable = false;
  try {
    const existingClaim = JSON.parse(await readFile(claimPath, 'utf8'));
    if (existingClaim.pid === process.pid || processIsAlive(existingClaim.pid)) return false;
    removable = true;
  } catch { /* invalid claims use the conservative age check below */ }
  if (!removable) {
    try {
      const claimStat = await stat(claimPath);
      if (Date.now() - claimStat.mtimeMs < 60_000) return false;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  await rm(claimPath, { force: true });
  return tryClaim();
};

const retireOutputCommitLock = async (lockDir) => {
  const retiredLockDir = `${lockDir}.released-${process.pid}-${randomUUID()}`;
  await rename(lockDir, retiredLockDir);
  try {
    await rm(retiredLockDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[visual-qa] released output lock but could not remove its retired directory: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const recoverAbandonedOutputLock = async (stage) => {
  let owner;
  try {
    owner = JSON.parse(await readFile(outputLockOwnerPath(stage.lockDir), 'utf8'));
  } catch (error) {
    throw new Error(
      `Visual QA output lock metadata is missing or invalid at ${stage.lockDir}. Verify that no scan is running before removing this lock.`,
      { cause: error },
    );
  }
  if (!validateLockOwner(owner, stage)) {
    throw new Error(`Visual QA output lock metadata is not safe to recover at ${stage.lockDir}.`);
  }
  const ownedByThisCommit = owner.pid === process.pid && activeOutputLocks.has(stage.lockDir);
  if (ownedByThisCommit || (owner.pid !== process.pid && processIsAlive(owner.pid))) return false;

  if (!await claimOutputLockRecovery(stage.lockDir)) return false;

  const abandonedStage = stageFromLockOwner(owner, stage);
  const previousArtifacts = new Set(owner.previousArtifacts);
  try {
    if (owner.state === 'preparing' || owner.state === 'published') {
      await rm(abandonedStage.stagingDir, { recursive: true, force: true });
      await rm(abandonedStage.backupDir, { recursive: true, force: true });
      await retireOutputCommitLock(stage.lockDir);
      return true;
    }
    await mkdir(abandonedStage.outputDir, { recursive: true });
    for (const artifact of outputArtifacts(abandonedStage)) {
      const backupExists = await pathExists(artifact.backup);
      if (previousArtifacts.has(artifact.name)) {
        if (backupExists) {
          await rm(artifact.target, { recursive: true, force: true });
          await rename(artifact.backup, artifact.target);
        } else if (!await pathExists(artifact.target)) {
          throw new Error(`Cannot recover missing Visual QA artifact: ${artifact.name}`);
        }
      } else {
        await rm(artifact.target, { recursive: true, force: true });
      }
    }
    await rm(abandonedStage.stagingDir, { recursive: true, force: true });
    await rm(abandonedStage.backupDir, { recursive: true, force: true });
    await retireOutputCommitLock(stage.lockDir);
    return true;
  } catch (error) {
    await rm(outputLockRecoveryClaimPath(stage.lockDir), { force: true }).catch(() => {});
    throw new Error(`Failed to recover an abandoned Visual QA publish for ${stage.outputDir}.`, { cause: error });
  }
};

const writeLockOwnerAtomically = async (lockDir, owner) => {
  const tempPath = resolve(lockDir, `.owner-${process.pid}-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, `${JSON.stringify(owner, null, 2)}\n`, 'utf8');
    await rename(tempPath, outputLockOwnerPath(lockDir));
  } finally {
    await rm(tempPath, { force: true }).catch(() => {});
  }
};

const acquireOutputCommitLock = async (stage) => {
  let acquired = false;
  const owner = {
    version: 1,
    pid: process.pid,
    createdAt: new Date().toISOString(),
    state: 'preparing',
    outputDir: stage.outputDir,
    stagingDir: stage.stagingDir,
    backupDir: stage.backupDir,
    previousArtifacts: [],
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const candidateLockDir = `${stage.lockDir}.candidate-${process.pid}-${randomUUID()}`;
    try {
      await mkdir(candidateLockDir);
      await writeFile(outputLockOwnerPath(candidateLockDir), `${JSON.stringify(owner, null, 2)}\n`, 'utf8');
      await rename(candidateLockDir, stage.lockDir);
      acquired = true;
      break;
    } catch (error) {
      await rm(candidateLockDir, { recursive: true, force: true });
      if (!await pathExists(stage.lockDir)) throw error;
      const recovered = await recoverAbandonedOutputLock(stage);
      if (recovered) continue;
      throw new Error(`Another Visual QA publish is already in progress for ${stage.outputDir}.`, { cause: error });
    }
  }
  if (!acquired) throw new Error(`Could not acquire the Visual QA output lock for ${stage.outputDir}.`);

  await mkdir(stage.outputDir, { recursive: true });
  const previousArtifacts = [];
  for (const artifact of outputArtifacts(stage)) {
    if (await pathExists(artifact.target)) previousArtifacts.push(artifact.name);
  }
  try {
    const readyOwner = { ...owner, state: 'ready', previousArtifacts };
    await writeLockOwnerAtomically(stage.lockDir, readyOwner);
    activeOutputLocks.add(stage.lockDir);
    return readyOwner;
  } catch (error) {
    await retireOutputCommitLock(stage.lockDir).catch(() => {});
    throw error;
  }
};

const withOutputCommitLock = async (stage, task) => {
  const owner = await acquireOutputCommitLock(stage);
  let preserveLock = false;
  let outputReplaced = false;

  try {
    const result = await task();
    outputReplaced = true;
    await writeLockOwnerAtomically(stage.lockDir, { ...owner, state: 'published' });
    return result;
  } catch (error) {
    preserveLock = error instanceof AggregateError || outputReplaced;
    throw error;
  } finally {
    activeOutputLocks.delete(stage.lockDir);
    if (!preserveLock) {
      await retireOutputCommitLock(stage.lockDir);
    }
  }
};

export const commitVisualQaOutputStage = (stage) => serializeOutputCommit(
  stage.outputDir,
  async () => {
    await withOutputCommitLock(stage, () => publishVisualQaOutputStage(stage));
    try {
      await rm(stage.stagingDir, { recursive: true, force: true });
      await rm(stage.backupDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[visual-qa] published output but could not remove temporary files: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

export const discardVisualQaOutputStage = async (stage) => {
  await rm(stage.stagingDir, { recursive: true, force: true });
};

export const closeVisualQaResources = async ({ loggedOutContext, authedContext, browser }) => {
  const resources = [loggedOutContext, authedContext, browser].filter(Boolean);
  await Promise.allSettled(resources.map((resource) => resource.close()));
};

export const launchVisualQaBrowser = async (chromium) => {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
};

export const openVisualQaState = async (page, state, timeout = 5000) => {
  const trigger = page.locator(state.trigger).first();
  await trigger.waitFor({ state: 'visible', timeout });
  await trigger.click();
  const ready = page.locator(state.ready).first();
  await ready.waitFor({ state: 'visible', timeout });
  await ready.evaluate((element) => element.setAttribute('data-vqa-active-surface', 'true'));
  if (state.focusSelector) {
    const focusTarget = page.locator(state.focusSelector).first();
    await focusTarget.waitFor({ state: 'visible', timeout });
    await focusTarget.focus();
  }
  await page.waitForTimeout(300);
};

export const runVisualQa = async (options = parseArguments()) => {
  const outputStage = await createVisualQaOutputStage(options.outputDir);
  let outputPublished = false;
  try {
    const { chromium } = await loadPlaywright();
    let browser;
    let authedContext;
    let loggedOutContext;
    const scenarios = [];
    try {
      browser = await launchVisualQaBrowser(chromium);

      authedContext = await prepareAuthedContext(browser, options);
      loggedOutContext = await prepareLoggedOutContext(browser, options);
      const authedPage = await authedContext.newPage();
      const loggedOutPage = await loggedOutContext.newPage();

      const previousIssueSignatures = new Map();
      const scenarioRuns = buildVisualQaScenarioRuns(options);
      for (const { route, width, state } of scenarioRuns) {
        const pathname = routePathname(route);
        const loggedOut = state?.session === 'logged-out'
          || (!state && (pathname === '/' || LOGGED_OUT_ROUTES.includes(pathname)));
        const page = loggedOut ? loggedOutPage : authedPage;
        const viewport = viewportForWidth(width);
        const scenarioKey = state ? `${route}#state=${state.id}` : route;
        const label = `${route}${state ? ` (${state.name})` : ''} @ ${width}px`;
        try {
          await page.setViewportSize(viewport);
          await page.goto(resolveRouteUrl(options.baseUrl, route), { waitUntil: 'commit' });
          await settle(page);
          const actualPath = await page.evaluate(() => window.location.pathname);
          if (!routeWasReached(route, actualPath)) throw new Error(`redirected to ${actualPath}`);
          if (state) await openVisualQaState(page, state);
          const measurement = await page.evaluate(VISUAL_QA_PROBE);
          const issues = buildIssues({ route: scenarioKey, viewport, measurement });
          const scenario = {
            route,
            viewport,
            status: issues.length ? 'issues' : 'pass',
            issues,
            ...(state ? { state: { id: state.id, name: state.name } } : {}),
          };
          const signature = issueSignature(issues);
          if (issues.length && signature !== previousIssueSignatures.get(scenarioKey)) {
            const fileName = `${scenarioSlug(scenarioKey, width)}.png`;
            await markIssueElements(page, issues);
            await page.screenshot({
              path: resolve(outputStage.screenshotsDir, fileName),
              fullPage: !state,
              animations: 'disabled',
            });
            scenario.screenshot = `screenshots/${fileName}`;
          }
          previousIssueSignatures.set(scenarioKey, signature);
          scenarios.push(scenario);
          console.log(`[visual-qa] ${issues.length ? `REVIEW ${issues.length}` : 'ok'} ${label}`);
        } catch (error) {
          previousIssueSignatures.delete(scenarioKey);
          const message = error instanceof Error ? error.message : String(error);
          scenarios.push({
            route,
            viewport,
            status: 'error',
            error: message,
            issues: [],
            ...(state ? { state: { id: state.id, name: state.name } } : {}),
          });
          console.error(`[visual-qa] ERROR ${label} — ${message}`);
        }
      }
    } finally {
      await closeVisualQaResources({ loggedOutContext, authedContext, browser });
    }

    const viewports = options.widths.map(viewportForWidth);
    const states = DEFAULT_STATE_SCENARIOS
      .filter((state) => options.routes.includes(state.route))
      .map(({ id, name, route, minWidth, maxWidth }) => ({ id, name, route, minWidth, maxWidth }));
    const report = buildReport({ baseUrl: options.baseUrl, routes: options.routes, viewports, states, scenarios });
    await writeFile(outputStage.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(outputStage.htmlPath, renderHtmlReport(report), 'utf8');
    await commitVisualQaOutputStage(outputStage);
    outputPublished = true;
    const htmlPath = resolve(options.outputDir, 'report.html');
    console.log(`[visual-qa] ${report.summary.affectedScenarios}/${report.summary.scenarios} affected · ${report.summary.issues} issues · ${report.summary.scanErrors} scan errors`);
    console.log(`[visual-qa] report=${relative(PROJECT_ROOT, htmlPath)}`);
    return { report, exitCode: shouldFailReport(report, options.failOn) ? 1 : 0 };
  } finally {
    if (!outputPublished) await discardVisualQaOutputStage(outputStage);
  }
};

const printHelp = () => console.log(`Usage: node scripts/visual-qa-audit.mjs [options]

Options:
  --base-url <url>       App URL (default: http://127.0.0.1:5180)
  --routes <csv>         Routes to scan
  --widths <csv>         Viewport widths from 320 to 2560
  --output-dir <path>    Report directory (default: visual-qa)
  --storage-state <path> Playwright auth state for protected live-API routes
  --fail-on <policy>     none | major | any (default: none)

The default run stubs /api for reproducible, offline-safe screenshots.
Set VISUAL_QA_ALLOW_API=1 only when intentionally testing a trusted backend.`);

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--help')) {
    printHelp();
  } else {
    runVisualQa()
      .then(({ exitCode }) => { process.exitCode = exitCode; })
      .catch((error) => {
        console.error(`[visual-qa] FAILED: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      });
  }
}
