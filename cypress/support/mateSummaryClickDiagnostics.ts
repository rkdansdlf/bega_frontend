/// <reference types="cypress" />

/**
 * CI-only diagnostics for the intermittent mobile summary click failure in
 * `mate-visual.cy.ts › keeps the detail page responsive across target breakpoints`.
 *
 * The scheduled Frontend Mate regression sometimes fails because clicking
 * `[data-testid="mate-detail-mobile-summary"]` leaves `aria-expanded="false"`. The failure
 * screenshot shows the button focused but the sheet closed, and the page scrolled away from
 * where Cypress positions the button. Local runs never reproduce it, so this helper records what
 * the browser saw around the click and prints it to the CI log and a JSONL report artifact.
 *
 * It only observes: no app behaviour or test assertion is changed.
 * Enabled only when the Cypress node process has CI set (task `mateVisualDiagnostics:isEnabled`).
 */

export const MATE_SUMMARY_DIAG_LOG_PREFIX = 'MATE_VISUAL_SUMMARY_DIAG';
export const MATE_SUMMARY_DIAG_REPORT_PATH = 'reports/mate-ci/mate-visual-summary-click-diagnostics.jsonl';

const SUMMARY_SELECTOR = '[data-testid="mate-detail-mobile-summary"]';
const MAX_EVENTS = 60;
const MAX_SCROLLS = 40;

type DiagWindow = Window & { __mateSummaryDiagActive?: boolean };

type DiagRecord = {
  label: string;
  attempt: number;
  viewport: { width: number; height: number };
  theme: string;
  startedAt: string;
  environment: Record<string, unknown>;
  snapshots: Record<string, unknown>;
  events: string[];
  /** `performance.now():scrollY` each time window.scrollY changed (sampled every 16ms). */
  scrolls: string[];
  /** requestAnimationFrame callbacks observed while the record was active. */
  rafTicks?: number;
  flushedFrom?: string;
};

let enabled: boolean | null = null;
let current: DiagRecord | null = null;
let currentWin: DiagWindow | null = null;

const round = (value: number) => Math.round(value * 100) / 100;

const describeElement = (element: Element | null | undefined): string | null => {
  if (!element) return null;
  const html = element as HTMLElement;
  const testId = html.getAttribute?.('data-testid');
  const id = html.id ? `#${html.id}` : '';
  const className = typeof html.className === 'string'
    ? html.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.')
    : '';
  const text = (html.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return `${html.tagName?.toLowerCase() ?? '?'}${id}${testId ? `[data-testid=${testId}]` : ''}${className ? `.${className}` : ''}${text ? ` "${text}"` : ''}`;
};

const rectOf = (element: Element | null) => {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: round(rect.top),
    bottom: round(rect.bottom),
    left: round(rect.left),
    right: round(rect.right),
    height: round(rect.height),
  };
};

const findFixedOrStickyAncestor = (win: Window, element: Element | null) => {
  let node: Element | null = element;
  while (node && node !== win.document.documentElement) {
    const { position } = win.getComputedStyle(node);
    if (position === 'fixed' || position === 'sticky') {
      return { position, element: describeElement(node), rect: rectOf(node) };
    }
    node = node.parentElement;
  }
  return null;
};

const captureClickTargetState = (win: Window) => {
  const doc = win.document;
  const button = doc.querySelector(SUMMARY_SELECTOR);
  const rect = button?.getBoundingClientRect();
  const center = rect ? { x: round(rect.left + rect.width / 2), y: round(rect.top + rect.height / 2) } : null;
  const atCenter = center ? doc.elementFromPoint(center.x, center.y) : null;
  const centerHitsButton = Boolean(button && atCenter && (atCenter === button || button.contains(atCenter)));

  // Visible fixed/sticky elements (other than the button's own ancestors) whose box overlaps the button.
  const overlappingFixedOrSticky: string[] = [];
  if (button && rect) {
    doc.querySelectorAll('body *').forEach((node) => {
      if (overlappingFixedOrSticky.length >= 10 || node === button || button.contains(node) || node.contains(button)) return;
      const style = win.getComputedStyle(node);
      if (style.position !== 'fixed' && style.position !== 'sticky') return;
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const other = node.getBoundingClientRect();
      if (other.width === 0 || other.height === 0) return;
      const overlaps = other.left < rect.right && other.right > rect.left && other.top < rect.bottom && other.bottom > rect.top;
      if (overlaps) {
        overlappingFixedOrSticky.push(`${style.position} z=${style.zIndex} ${describeElement(node)} rect=${JSON.stringify(rectOf(node))}`);
      }
    });
  }

  return {
    t: round(win.performance.now()),
    scrollY: round(win.scrollY),
    maxScrollY: round(doc.documentElement.scrollHeight - win.innerHeight),
    inner: `${win.innerWidth}x${win.innerHeight}`,
    buttonPresent: Boolean(button),
    buttonRect: rectOf(button),
    buttonCenter: center,
    elementAtCenter: describeElement(atCenter),
    centerHitsButton,
    coveredByFixedOrSticky: centerHitsButton ? null : findFixedOrStickyAncestor(win, atCenter),
    overlappingFixedOrSticky,
    ariaExpanded: button?.getAttribute('aria-expanded') ?? null,
    sheetPresent: Boolean(doc.querySelector('[data-testid="mate-detail-action-sheet"]')),
    activeElement: describeElement(doc.activeElement),
    htmlScrollBehavior: win.getComputedStyle(doc.documentElement).scrollBehavior,
    htmlInlineStyle: doc.documentElement.getAttribute('style'),
    bodyScrollBehavior: doc.body ? win.getComputedStyle(doc.body).scrollBehavior : null,
  };
};

const ensureEnabled = () => {
  if (enabled !== null) return cy.wrap(enabled, { log: false });
  return cy.task('mateVisualDiagnostics:isEnabled', null, { log: false }).then((value) => {
    enabled = value === true;
    return enabled;
  });
};

/** Starts a record for one viewport iteration and installs passive capture-phase listeners. */
export const beginSummaryClickDiagnostics = (viewport: { width: number; height: number }, theme: string) => {
  ensureEnabled().then((isEnabled) => {
    if (!isEnabled) return;
    cy.window({ log: false }).then((win) => {
      const diagWin = win as DiagWindow;
      const rootStyle = win.getComputedStyle(win.document.documentElement);
      const record: DiagRecord = {
        label: `${viewport.width}x${viewport.height}-${theme}`,
        attempt: (Cypress as unknown as { currentRetry?: number }).currentRetry ?? 0,
        viewport,
        theme,
        startedAt: new Date().toISOString(),
        environment: {
          userAgent: win.navigator.userAgent,
          devicePixelRatio: win.devicePixelRatio,
          prefersReducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)').matches,
          htmlScrollBehavior: rootStyle.scrollBehavior,
          scrollPaddingTop: rootStyle.scrollPaddingTop,
          scrollPaddingBottom: rootStyle.scrollPaddingBottom,
        },
        snapshots: {},
        events: [],
        scrolls: [],
      };
      current = record;
      currentWin = diagWin;
      diagWin.__mateSummaryDiagActive = true;
      const doc = win.document;

      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'focusin'].forEach((type) => {
        doc.addEventListener(type, (event) => {
          if (!diagWin.__mateSummaryDiagActive || record.events.length >= MAX_EVENTS) return;
          const mouse = event as MouseEvent;
          const button = doc.querySelector(SUMMARY_SELECTOR);
          const target = event.target as Element | null;
          const onButton = Boolean(button && target && (target === button || button.contains(target)));
          const coords = typeof mouse.clientX === 'number' ? ` xy=${round(mouse.clientX)},${round(mouse.clientY)}` : '';
          const buttonTop = button ? ` btnTop=${round(button.getBoundingClientRect().top)}` : '';
          record.events.push(
            `${type}@${round(win.performance.now())} scrollY=${round(win.scrollY)}${coords}${buttonTop} onButton=${onButton} target=${describeElement(target)}`,
          );
        }, true);
      });
      // scrollY sampler (timer based, so it still samples when the page produces no rendering frames).
      let lastScrollY: number | null = null;
      const sampleScroll = () => {
        if (!diagWin.__mateSummaryDiagActive) {
          win.clearInterval(samplerId);
          return;
        }
        const scrollY = round(win.scrollY);
        if (scrollY !== lastScrollY && record.scrolls.length < MAX_SCROLLS) {
          record.scrolls.push(`${round(win.performance.now())}:${scrollY}`);
        }
        lastScrollY = scrollY;
      };
      const samplerId = win.setInterval(sampleScroll, 16);
      sampleScroll();
      // Counts animation frames actually produced while the record is active (smooth scrolling needs them).
      record.rafTicks = 0;
      const countFrame = () => {
        if (!diagWin.__mateSummaryDiagActive) return;
        record.rafTicks = (record.rafTicks ?? 0) + 1;
        win.requestAnimationFrame(countFrame);
      };
      win.requestAnimationFrame(countFrame);
    });
  });
};

/** Records a named snapshot: scrollY, element at the button center, covering fixed/sticky elements, etc. */
export const snapshotSummaryClickDiagnostics = (name: string) => {
  cy.window({ log: false }).then((win) => {
    if (!current || currentWin !== win) return;
    current.snapshots[name] = captureClickTargetState(win);
  });
};

/** Prints the pending record to the CI log and appends it to the JSONL report. No-op when nothing is pending. */
export const flushSummaryClickDiagnostics = (flushedFrom: string) => {
  cy.window({ log: false }).then((win) => {
    if (!current) return;
    const record = current;
    if (currentWin === win) {
      record.snapshots[`final:${flushedFrom}`] = captureClickTargetState(win);
    }
    record.flushedFrom = flushedFrom;
    if (currentWin) currentWin.__mateSummaryDiagActive = false;
    current = null;
    currentWin = null;
    const line = JSON.stringify(record);
    cy.task('log', `${MATE_SUMMARY_DIAG_LOG_PREFIX} ${line}`, { log: false });
    cy.writeFile(MATE_SUMMARY_DIAG_REPORT_PATH, `${line}\n`, { flag: 'a+', log: false });
  });
};
