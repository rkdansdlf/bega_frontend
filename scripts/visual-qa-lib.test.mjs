import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildIssues,
  buildReport,
  parseViewportWidths,
  renderHtmlReport,
  scenarioSlug,
} from './visual-qa-lib.mjs';

test('turns detector evidence into stable AI-review issue records', () => {
  const issues = buildIssues({
    route: '/cheer',
    viewport: { width: 390, height: 844 },
    measurement: {
      pageOverflow: { overflowPx: 28, selector: 'main.feed' },
      clipped: [{ selector: 'button.team-filter', axis: 'x', overflowPx: 12, text: '한화 이글스' }],
      overlaps: [{
        selector: 'button.chatbot',
        relatedSelector: 'nav.mobile-dock',
        overlapWidth: 42,
        overlapHeight: 42,
        overlapRatio: 0.81,
      }],
      smallTargets: [{ selector: 'button.icon-only', width: 20, height: 20, text: '메뉴' }],
      crowdedControls: [{ selector: 'button.previous', relatedSelector: 'button.next', gapPx: 2 }],
      fixedObstructions: [{ selector: 'div.promo-badge', viewportAreaRatio: 0.24 }],
      focusObscured: [{
        selector: 'button.focus-target',
        relatedSelector: 'header.mobile-header',
        coveredRatio: 1,
        obstructionPosition: 'fixed',
        focusRect: { width: 120, height: 44 },
        obstructionRect: { width: 390, height: 64 },
      }],
      focusPartiallyObscured: [{
        selector: 'button.focus-target',
        relatedSelector: 'header.mobile-header',
        coveredRatio: 0.4,
        sampleCoverageRatio: 0.6,
        obstructionPosition: 'fixed',
      }],
    },
  });

  assert.deepEqual(issues.map((issue) => issue.type), [
    'horizontal-overflow',
    'content-clipping',
    'element-overlap',
    'small-touch-target',
    'crowded-controls',
    'viewport-obstruction',
    'focus-obscured',
    'focus-partially-obscured',
  ]);
  assert.equal(issues[0].severity, 'major');
  assert.deepEqual(issues[0].viewport, { width: 390, height: 844 });
  assert.equal(issues[2].selector, 'button.chatbot');
  assert.match(issues[2].evidence, /nav\.mobile-dock/);
  assert.match(issues[2].suggestedFix, /safe-area|간격|위치/);
  assert.match(issues[6].evidence, /mobile-header.*완전히 가려졌습니다/);
  assert.match(issues[7].evidence, /일부가.*mobile-header/);
  assert.equal(typeof issues[0].confidence, 'number');
});

test('deduplicates identical evidence emitted by nested detector passes', () => {
  const issues = buildIssues({
    route: '/home',
    viewport: { width: 360, height: 800 },
    measurement: {
      clipped: [
        { selector: '.headline', axis: 'x', overflowPx: 8, text: '긴 제목' },
        { selector: '.headline', axis: 'x', overflowPx: 8, text: '긴 제목' },
      ],
    },
  });

  assert.equal(issues.length, 1);
  assert.equal(issues[0].type, 'content-clipping');
});

test('parses and validates custom viewport widths', () => {
  assert.deepEqual(parseViewportWidths('390, 320,390, 768'), [320, 390, 768]);
  assert.throws(() => parseViewportWidths('200,390'), /between 320 and 2560/);
  assert.throws(() => parseViewportWidths('mobile,390'), /positive integer/);
});

test('report summary counts severities, types, and affected scenarios', () => {
  const report = buildReport({
    baseUrl: 'http://127.0.0.1:5180',
    routes: ['/home'],
    viewports: [{ width: 390, height: 844 }, { width: 768, height: 1024 }],
    states: [{ id: 'public-mobile-menu', name: '공개 모바일 메뉴', route: '/home' }],
    scenarios: [
      {
        route: '/home', viewport: { width: 390, height: 844 }, status: 'issues', screenshot: 'screenshots/home-390.png',
        issues: [
          { type: 'element-overlap', severity: 'major' },
          { type: 'small-touch-target', severity: 'minor' },
        ],
      },
      { route: '/home', viewport: { width: 768, height: 1024 }, status: 'pass', issues: [] },
    ],
    generatedAt: '2026-08-09T00:00:00.000Z',
  });

  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.coverage.states, [
    { id: 'public-mobile-menu', name: '공개 모바일 메뉴', route: '/home' },
  ]);
  assert.deepEqual(report.summary, {
    scenarios: 2,
    affectedScenarios: 1,
    issues: 2,
    severity: { major: 1, minor: 1 },
    types: { 'element-overlap': 1, 'small-touch-target': 1 },
    scanErrors: 0,
  });
});

test('HTML report is self-contained, escaped, and links only captured problem screens', () => {
  const report = buildReport({
    baseUrl: 'http://127.0.0.1:5180',
    routes: ['/<unsafe>'],
    viewports: [{ width: 390, height: 844 }],
    generatedAt: '2026-08-09T00:00:00.000Z',
    scenarios: [{
      route: '/<unsafe>',
      state: { id: 'unsafe-state', name: '<열린 메뉴>' },
      viewport: { width: 390, height: 844 },
      status: 'issues',
      screenshot: 'screenshots/unsafe-390.png',
      issues: [{
        id: 'vqa-1',
        severity: 'major',
        type: 'content-clipping',
        selector: 'button[aria-label="<close>"]',
        description: '<잘림>',
        evidence: '12px',
        likelyCause: '고정 폭',
        suggestedFix: 'min-width: 0',
        confidence: 0.94,
      }],
    }],
  });

  const html = renderHtmlReport(report);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /&lt;unsafe&gt;/);
  assert.match(html, /&lt;열린 메뉴&gt;/);
  assert.doesNotMatch(html, /<잘림>/);
  assert.match(html, /screenshots\/unsafe-390\.png/);
  assert.match(html, /content-clipping/);
});

test('scenario slugs are filesystem-safe and distinguish route variants', () => {
  assert.equal(scenarioSlug('/', 320), 'root-320');
  assert.notEqual(scenarioSlug('/', 390), scenarioSlug('/root', 390));
  assert.match(scenarioSlug('/messages/@testuser', 390), /^messages-testuser-[a-z0-9]+-390$/);
  assert.notEqual(
    scenarioSlug('/prediction?tab=ranking', 390),
    scenarioSlug('/prediction/tab/ranking', 390),
  );

  const longRoute = `/prediction?tab=${'가'.repeat(120)}`;
  const longSlug = scenarioSlug(longRoute, 2560);
  assert.ok(Buffer.byteLength(`${longSlug}.png`, 'utf8') <= 255);
  assert.notEqual(longSlug, scenarioSlug(`${longRoute}나`, 2560));
});
