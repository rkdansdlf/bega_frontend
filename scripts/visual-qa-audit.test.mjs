import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  DEFAULT_ROUTES,
  DEFAULT_STATE_SCENARIOS,
  DEFAULT_WIDTHS,
  buildVisualQaScenarioRuns,
  closeVisualQaResources,
  commitVisualQaOutputStage,
  createVisualQaOutputStage,
  discardVisualQaOutputStage,
  issueSignature,
  launchVisualQaBrowser,
  parseArguments,
  resolveRouteUrl,
  routeWasReached,
  shouldFailReport,
  VISUAL_QA_PROBE,
  viewportForWidth,
} from './visual-qa-audit.mjs';
import { DEFAULT_ROUTES as REFLOW_DEFAULT_ROUTES } from './reflow-320-audit.mjs';
import { findFixture } from './reflow-320-fixtures.mjs';

test('default coverage targets every auditable user route and breakpoint edge', () => {
  assert.deepEqual(DEFAULT_ROUTES, REFLOW_DEFAULT_ROUTES);
  assert.equal(DEFAULT_ROUTES.length, 33);
  for (const width of [320, 390, 430, 600, 767, 768, 1024, 1040, 1160, 1280, 1440]) {
    assert.ok(DEFAULT_WIDTHS.includes(width), `${width}px must be sampled`);
  }
});

test('default state coverage opens non-route UI surfaces at their responsive widths', () => {
  assert.deepEqual(
    DEFAULT_STATE_SCENARIOS.map(({ id, route, minWidth, maxWidth }) => ({ id, route, minWidth, maxWidth })),
    [
      { id: 'public-mobile-menu', route: '/home', minWidth: 320, maxWidth: 767 },
      { id: 'authenticated-mobile-menu', route: '/mypage', minWidth: 320, maxWidth: 767 },
      { id: 'mate-filter-sheet', route: '/mate', minWidth: 320, maxWidth: 1023 },
      { id: 'mypage-ticket-upload', route: '/mypage', minWidth: 320, maxWidth: 1440 },
      { id: 'authenticated-chatbot', route: '/mypage', minWidth: 320, maxWidth: 1440 },
      { id: 'stadium-seat-map-route', route: '/stadium', minWidth: 320, maxWidth: 390 },
      { id: 'mypage-stats-tab-route', route: '/mypage', minWidth: 320, maxWidth: 390 },
    ],
  );
  for (const state of DEFAULT_STATE_SCENARIOS) {
    assert.ok(state.trigger, `${state.id} needs a stable trigger`);
    assert.ok(state.ready, `${state.id} needs a visible ready target`);
  }
});

test('scenario expansion combines every route-width pair with applicable interaction states', () => {
  const runs = buildVisualQaScenarioRuns({
    routes: DEFAULT_ROUTES,
    widths: DEFAULT_WIDTHS,
  });
  const routeRuns = runs.filter((run) => run.state === null);
  const stateRuns = runs.filter((run) => run.state !== null);

  assert.equal(routeRuns.length, 33 * 14);
  assert.equal(stateRuns.length, 57);
  assert.equal(runs.length, 519);
  assert.ok(stateRuns.some((run) => run.state.id === 'mate-filter-sheet' && run.width === 834));
  assert.ok(!stateRuns.some((run) => run.state.id === 'mate-filter-sheet' && run.width === 1024));
  assert.ok(!stateRuns.some((run) => run.state.id === 'public-mobile-menu' && run.width === 768));

  const customRuns = buildVisualQaScenarioRuns({ routes: ['/home'], widths: [320, 768] });
  assert.deepEqual(
    customRuns.map((run) => [run.route, run.width, run.state?.id ?? null]),
    [
      ['/home', 320, null],
      ['/home', 768, null],
      ['/home', 320, 'public-mobile-menu'],
    ],
  );
});

test('parameterized detail routes render populated UI instead of only error fallbacks', () => {
  const cases = [
    ['http://audit.local/api/parties/1', 'mate party detail'],
    ['http://audit.local/api/chat/party/1?limit=50', 'mate chat messages'],
    ['http://audit.local/api/cheer/posts/1', 'cheer post detail'],
    ['http://audit.local/api/users/profile/testuser', 'public profile'],
    ['http://audit.local/api/stadiums', 'stadium guide list'],
    ['http://audit.local/api/diary/statistics', 'my page diary statistics'],
  ];

  for (const [url, expectedName] of cases) {
    const fixture = findFixture(url);
    assert.equal(fixture?.name, expectedName);
    assert.ok(fixture?.body(url), `${expectedName} must provide populated data`);
  }

  const partyFixture = findFixture(cases[0][0]);
  const party = partyFixture?.body(cases[0][0], { pagePathname: '/mate/1/manage' });
  assert.equal(party?.id, 1);
  assert.equal(party?.hostId, 123);
  assert.equal(party?.status, 'CHECKED_IN');
  assert.ok(Array.isArray(party?.members) && party.members.length >= 2);

  const applicationParty = partyFixture?.body(cases[0][0], { pagePathname: '/mate/1/apply' });
  assert.notEqual(applicationParty?.hostId, 123);
  assert.equal(applicationParty?.status, 'PENDING');
  assert.equal(applicationParty?.gameDate, '2026-09-20');

  const chat = findFixture(cases[1][0])?.body(cases[1][0]);
  assert.ok(Array.isArray(chat) && chat.length >= 2);
  assert.ok(chat.every((message) => message.partyId === 1 && message.message));

  const cheer = findFixture(cases[2][0])?.body(cases[2][0]);
  assert.equal(cheer?.id, 1);
  assert.equal(cheer?.isOwner, true);
  assert.ok(cheer?.content.length > 80);

  const profile = findFixture(cases[3][0])?.body(cases[3][0]);
  assert.equal(profile?.success, true);
  assert.equal(profile?.data?.handle, 'testuser');
  assert.ok(profile?.data?.bio.length > 40);
});

test('viewport heights follow mobile, tablet, and desktop review frames', () => {
  assert.deepEqual(viewportForWidth(390), { width: 390, height: 844 });
  assert.deepEqual(viewportForWidth(768), { width: 768, height: 1024 });
  assert.deepEqual(viewportForWidth(1440), { width: 1440, height: 900 });
});

test('CLI overrides routes, widths, output, and fail policy without network defaults', () => {
  const options = parseArguments([
    '--base-url', 'http://127.0.0.1:9999',
    '--routes', '/home,/cheer',
    '--widths', '320,390',
    '--output-dir', 'tmp/vqa',
    '--fail-on', 'major',
  ], {});

  assert.equal(options.baseUrl, 'http://127.0.0.1:9999');
  assert.deepEqual(options.routes, ['/home', '/cheer']);
  assert.deepEqual(options.widths, [320, 390]);
  assert.match(options.outputDir, /tmp\/vqa$/);
  assert.equal(options.failOn, 'major');
  assert.equal(options.allowApi, false);
});

test('invalid fail policy is rejected', () => {
  assert.throws(() => parseArguments(['--fail-on', 'sometimes'], {}), /none, major, or any/);
});

test('live API scans require an operator-provided session for protected routes', () => {
  assert.throws(
    () => parseArguments(['--routes', '/mypage'], { VISUAL_QA_ALLOW_API: '1' }),
    /VISUAL_QA_STORAGE_STATE/,
  );
  const options = parseArguments(['--routes', '/mypage'], {
    VISUAL_QA_ALLOW_API: '1',
    VISUAL_QA_STORAGE_STATE: 'tmp/visual-qa-auth.json',
  });
  assert.match(options.storageState, /tmp\/visual-qa-auth\.json$/);
});

test('routes are constrained to same-origin path references', () => {
  assert.throws(() => parseArguments(['--routes', '//example.com'], {}), /same-origin path/);
  assert.throws(() => parseArguments(['--routes', '/\\example.com'], {}), /same-origin path/);
  assert.throws(() => parseArguments(['--routes', 'https://example.com/home'], {}), /same-origin path/);
  assert.deepEqual(parseArguments(['--routes', '/prediction?tab=ranking'], {}).routes, ['/prediction?tab=ranking']);
  assert.equal(resolveRouteUrl('http://127.0.0.1:5180', '/prediction?tab=ranking'), 'http://127.0.0.1:5180/prediction?tab=ranking');
  assert.throws(() => resolveRouteUrl('http://127.0.0.1:5180', '//example.com'), /same-origin path/);
});

test('route verification accepts only the requested pathname and an optional trailing slash', () => {
  assert.equal(routeWasReached('/mate', '/mate'), true);
  assert.equal(routeWasReached('/mate/', '/mate'), true);
  assert.equal(routeWasReached('/prediction?tab=ranking', '/prediction'), true);
  assert.equal(routeWasReached('/mate', '/mate/1'), false);
  assert.equal(routeWasReached('/cheer', '/cheer/write'), false);
});

test('staged output keeps the last complete report until a successful publish', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bega-visual-qa-'));
  const outputDir = join(root, 'visual-qa');
  try {
    await mkdir(join(outputDir, 'screenshots'), { recursive: true });
    await writeFile(join(outputDir, 'report.json'), 'old-json');
    await writeFile(join(outputDir, 'report.html'), 'old-html');
    await writeFile(join(outputDir, 'screenshots', 'old.png'), 'old-image');
    await writeFile(join(outputDir, 'operator-note.txt'), 'keep-me');

    const failedStage = await createVisualQaOutputStage(outputDir, 'failed-run');
    await writeFile(failedStage.jsonPath, 'partial-json');
    await discardVisualQaOutputStage(failedStage);

    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'old-json');
    assert.deepEqual(await readdir(join(outputDir, 'screenshots')), ['old.png']);

    const incompleteStage = await createVisualQaOutputStage(outputDir, 'incomplete-run');
    await assert.rejects(commitVisualQaOutputStage(incompleteStage), /ENOENT/);
    await discardVisualQaOutputStage(incompleteStage);
    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'old-json');

    const rollbackStage = await createVisualQaOutputStage(outputDir, 'rollback-run');
    await writeFile(rollbackStage.htmlPath, 'partial-html');
    await writeFile(join(rollbackStage.screenshotsDir, 'partial.png'), 'partial-image');
    rollbackStage.jsonPath = rollbackStage.screenshotsDir;
    await assert.rejects(commitVisualQaOutputStage(rollbackStage), /ENOENT/);
    await discardVisualQaOutputStage(rollbackStage);

    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'old-json');
    assert.equal(await readFile(join(outputDir, 'report.html'), 'utf8'), 'old-html');
    assert.deepEqual(await readdir(join(outputDir, 'screenshots')), ['old.png']);
    await assert.rejects(readdir(rollbackStage.backupDir), /ENOENT/);

    const completedStage = await createVisualQaOutputStage(outputDir, 'completed-run');
    await writeFile(completedStage.jsonPath, 'new-json');
    await writeFile(completedStage.htmlPath, 'new-html');
    await writeFile(join(completedStage.screenshotsDir, 'new.png'), 'new-image');
    await commitVisualQaOutputStage(completedStage);

    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'new-json');
    assert.equal(await readFile(join(outputDir, 'report.html'), 'utf8'), 'new-html');
    assert.deepEqual(await readdir(join(outputDir, 'screenshots')), ['new.png']);
    assert.equal(await readFile(join(outputDir, 'operator-note.txt'), 'utf8'), 'keep-me');

    const concurrentA = await createVisualQaOutputStage(outputDir, 'concurrent-a');
    const concurrentB = await createVisualQaOutputStage(outputDir, 'concurrent-b');
    await writeFile(concurrentA.jsonPath, 'a-json');
    await writeFile(concurrentA.htmlPath, 'a-html');
    await writeFile(join(concurrentA.screenshotsDir, 'a.png'), 'a-image');
    await writeFile(concurrentB.jsonPath, 'b-json');
    await writeFile(concurrentB.htmlPath, 'b-html');
    await writeFile(join(concurrentB.screenshotsDir, 'b.png'), 'b-image');

    await Promise.all([
      commitVisualQaOutputStage(concurrentA),
      commitVisualQaOutputStage(concurrentB),
    ]);

    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'b-json');
    assert.equal(await readFile(join(outputDir, 'report.html'), 'utf8'), 'b-html');
    assert.deepEqual(await readdir(join(outputDir, 'screenshots')), ['b.png']);
    assert.equal(await readFile(join(outputDir, 'operator-note.txt'), 'utf8'), 'keep-me');

    const externallyLocked = await createVisualQaOutputStage(outputDir, 'externally-locked');
    await writeFile(externallyLocked.jsonPath, 'locked-json');
    await writeFile(externallyLocked.htmlPath, 'locked-html');
    await mkdir(externallyLocked.lockDir);
    await writeFile(join(externallyLocked.lockDir, 'owner.json'), JSON.stringify({
      version: 1,
      pid: 1,
      createdAt: new Date().toISOString(),
      state: 'ready',
      outputDir: externallyLocked.outputDir,
      stagingDir: externallyLocked.stagingDir,
      backupDir: externallyLocked.backupDir,
      previousArtifacts: ['screenshots', 'report.json', 'report.html'],
    }));
    await assert.rejects(
      commitVisualQaOutputStage(externallyLocked),
      /already in progress/,
    );
    await rm(externallyLocked.lockDir, { recursive: true, force: true });
    await discardVisualQaOutputStage(externallyLocked);
    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'b-json');

    const abandoned = await createVisualQaOutputStage(outputDir, 'abandoned');
    await writeFile(abandoned.jsonPath, 'abandoned-json');
    await writeFile(abandoned.htmlPath, 'abandoned-html');
    await writeFile(join(abandoned.screenshotsDir, 'abandoned.png'), 'abandoned-image');
    await mkdir(abandoned.backupDir);
    await rename(join(outputDir, 'screenshots'), join(abandoned.backupDir, 'screenshots'));
    await rename(join(outputDir, 'report.json'), join(abandoned.backupDir, 'report.json'));
    await rename(join(outputDir, 'report.html'), join(abandoned.backupDir, 'report.html'));
    await rename(abandoned.screenshotsDir, join(outputDir, 'screenshots'));
    await mkdir(abandoned.lockDir);
    await writeFile(join(abandoned.lockDir, 'owner.json'), JSON.stringify({
      version: 1,
      pid: 99999999,
      createdAt: new Date().toISOString(),
      state: 'ready',
      outputDir: abandoned.outputDir,
      stagingDir: abandoned.stagingDir,
      backupDir: abandoned.backupDir,
      previousArtifacts: ['screenshots', 'report.json', 'report.html'],
    }));
    await writeFile(join(abandoned.lockDir, 'recovery.claim'), JSON.stringify({
      pid: 99999998,
      createdAt: new Date().toISOString(),
    }));

    const recoveryProbe = await createVisualQaOutputStage(outputDir, 'recovery-probe');
    await assert.rejects(commitVisualQaOutputStage(recoveryProbe), /ENOENT/);
    await discardVisualQaOutputStage(recoveryProbe);
    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'b-json');
    assert.equal(await readFile(join(outputDir, 'report.html'), 'utf8'), 'b-html');
    assert.deepEqual(await readdir(join(outputDir, 'screenshots')), ['b.png']);
    await assert.rejects(readdir(abandoned.lockDir), /ENOENT/);
    await assert.rejects(readdir(abandoned.backupDir), /ENOENT/);

    const preparing = await createVisualQaOutputStage(outputDir, 'preparing');
    await mkdir(preparing.lockDir);
    await writeFile(join(preparing.lockDir, 'owner.json'), JSON.stringify({
      version: 1,
      pid: 99999997,
      createdAt: new Date().toISOString(),
      state: 'preparing',
      outputDir: preparing.outputDir,
      stagingDir: preparing.stagingDir,
      backupDir: preparing.backupDir,
      previousArtifacts: [],
    }));
    const invalidClaimPath = join(preparing.lockDir, 'recovery.claim');
    await writeFile(invalidClaimPath, '{');
    const staleTime = new Date(Date.now() - 120_000);
    await utimes(invalidClaimPath, staleTime, staleTime);

    const preparingProbe = await createVisualQaOutputStage(outputDir, 'preparing-probe');
    await assert.rejects(commitVisualQaOutputStage(preparingProbe), /ENOENT/);
    await discardVisualQaOutputStage(preparingProbe);
    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'b-json');
    assert.deepEqual(await readdir(join(outputDir, 'screenshots')), ['b.png']);
    await assert.rejects(readdir(preparing.lockDir), /ENOENT/);

    const published = await createVisualQaOutputStage(outputDir, 'published');
    await mkdir(join(published.backupDir, 'screenshots'), { recursive: true });
    await writeFile(join(published.backupDir, 'report.json'), 'previous-json');
    await writeFile(join(published.backupDir, 'report.html'), 'previous-html');
    await writeFile(join(published.backupDir, 'screenshots', 'previous.png'), 'previous-image');
    await mkdir(published.lockDir);
    await writeFile(join(published.lockDir, 'owner.json'), JSON.stringify({
      version: 1,
      pid: 99999996,
      createdAt: new Date().toISOString(),
      state: 'published',
      outputDir: published.outputDir,
      stagingDir: published.stagingDir,
      backupDir: published.backupDir,
      previousArtifacts: ['screenshots', 'report.json', 'report.html'],
    }));

    const publishedProbe = await createVisualQaOutputStage(outputDir, 'published-probe');
    await assert.rejects(commitVisualQaOutputStage(publishedProbe), /ENOENT/);
    await discardVisualQaOutputStage(publishedProbe);
    assert.equal(await readFile(join(outputDir, 'report.json'), 'utf8'), 'b-json');
    assert.equal(await readFile(join(outputDir, 'report.html'), 'utf8'), 'b-html');
    assert.deepEqual(await readdir(join(outputDir, 'screenshots')), ['b.png']);
    await assert.rejects(readdir(published.lockDir), /ENOENT/);
    await assert.rejects(readdir(published.backupDir), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('browser cleanup attempts every resource even when one close fails', async () => {
  const closed = [];
  const resource = (name, shouldFail = false) => ({
    close: async () => {
      closed.push(name);
      if (shouldFail) throw new Error(`${name} close failed`);
    },
  });
  await closeVisualQaResources({
    loggedOutContext: resource('logged-out', true),
    authedContext: resource('authed'),
    browser: resource('browser'),
  });
  assert.deepEqual(closed.sort(), ['authed', 'browser', 'logged-out']);
});

test('browser launcher falls back to bundled Chromium when system Chrome is unavailable', async () => {
  const attempts = [];
  const fallbackBrowser = { close: async () => {} };
  const chromium = {
    launch: async (options) => {
      attempts.push(options);
      if (options.channel === 'chrome') throw new Error('Chrome missing');
      return fallbackBrowser;
    },
  };
  assert.equal(await launchVisualQaBrowser(chromium), fallbackBrowser);
  assert.deepEqual(attempts, [
    { channel: 'chrome', headless: true },
    { headless: true },
  ]);
});

test('probe keeps late DOM controls and fixed-to-content overlap in scope', () => {
  const source = VISUAL_QA_PROBE.toString();
  assert.doesNotMatch(source, /\.slice\(0,\s*140\)/);
  assert.doesNotMatch(source, /Boolean\(firstFixedLayer\)\s*!==\s*Boolean\(secondFixedLayer\)/);
  assert.match(source, /rect\.width < 40 \|\| rect\.height < 40/);
  assert.match(source, /focusObscured/);
  assert.match(source, /focusPartiallyObscured/);
  assert.match(source, /elementFromPoint/);
  assert.match(source, /rectUnionRatio/);
  assert.match(source, /pointerEvents/);
  assert.match(source, /Sticky headers remain in normal document flow/);
});

test('report failure policy keeps human-review mode non-blocking but never hides scan errors', () => {
  const report = {
    summary: { scanErrors: 0 },
    scenarios: [{ issues: [{ severity: 'minor' }, { severity: 'major' }] }],
  };
  assert.equal(shouldFailReport(report, 'none'), false);
  assert.equal(shouldFailReport(report, 'major'), true);
  assert.equal(shouldFailReport(report, 'any'), true);
  assert.equal(shouldFailReport({ ...report, summary: { scanErrors: 1 } }, 'none'), true);
});

test('issue signatures select one representative screenshot per contiguous anomaly shape', () => {
  const first = issueSignature([
    { type: 'small-touch-target', severity: 'minor', selector: 'button.menu' },
    { type: 'element-overlap', severity: 'major', selector: 'button.chat' },
  ]);
  const reordered = issueSignature([
    { type: 'element-overlap', severity: 'major', selector: 'button.chat' },
    { type: 'small-touch-target', severity: 'minor', selector: 'button.menu' },
  ]);
  const changed = issueSignature([{ type: 'element-overlap', severity: 'major', selector: 'button.chat' }]);
  const changedEvidence = issueSignature([
    {
      type: 'element-overlap', severity: 'major', selector: 'button.chat', evidence: 'button.menu와 12×12px 겹칩니다.',
    },
  ]);
  const changedAgain = issueSignature([
    {
      type: 'element-overlap', severity: 'major', selector: 'button.chat', evidence: 'button.dock과 42×42px 겹칩니다.',
    },
  ]);

  assert.equal(first, reordered);
  assert.notEqual(first, changed);
  assert.notEqual(changedEvidence, changedAgain);
  assert.equal(issueSignature([]), '');
});

test('intentional marquee and segmented control geometry declare narrow Visual QA exceptions', () => {
  const ticker = readFileSync(new URL('../src/components/landing/LandingTicker.tsx', import.meta.url), 'utf8');
  const prediction = readFileSync(new URL('../src/components/prediction/PredictionRuntime.tsx', import.meta.url), 'utf8');
  const navbar = readFileSync(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');
  const cheerNav = readFileSync(new URL('../src/components/CheerMobileBottomNav.tsx', import.meta.url), 'utf8');

  assert.match(ticker, /data-testid="landing-score-ticker"[\s\S]{0,120}data-vqa-overflow="allowed"/);
  assert.doesNotMatch(ticker, /<aside[^>]+data-vqa-ignore/);
  assert.match(prediction, /data-vqa-overlap="allowed"[\s\S]{0,1200}data-testid="prediction-tab-match"/);
  assert.match(navbar, /data-testid="auth-mobile-bottom-nav"[\s\S]{0,120}data-vqa-content-overlay="allowed"/);
  assert.match(cheerNav, /data-testid="cheer-mobile-bottom-nav"[\s\S]{0,120}data-vqa-content-overlay="allowed"/);
});

test('season heatmap cells satisfy the 24px target-and-spacing baseline', () => {
  const runtime = readFileSync(new URL('../src/components/mypage/MyPageSeasonLogRuntime.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/components/mypage/MyPageSeason.css', import.meta.url), 'utf8');

  assert.equal((runtime.match(/minmax\(24px, 1fr\)/g) ?? []).length, 2);
  assert.match(runtime, /className="mypage-season-heat-grid"[\s\S]{0,120}data-vqa-touch-target="compact"/);
  assert.match(styles, /grid-template-rows:\s*repeat\(7, 24px\)/);
  assert.match(styles, /grid-auto-columns:\s*24px/);
  assert.match(styles, /\.mypage-season-heat-grid[\s\S]{0,300}gap:\s*4px/);
});

test('mate filter panel is not a large sticky obstruction on mobile', () => {
  const controls = readFileSync(new URL('../src/components/MateListControlsRuntime.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(controls, /className="sticky top-16/);
  assert.match(controls, /className="[^"]*md:sticky md:top-16/);
});

test('interaction-state controls keep mobile touch targets and tab semantics', () => {
  const filterSheet = readFileSync(new URL('../src/components/MateFilterBottomSheet.tsx', import.meta.url), 'utf8');
  const dialog = readFileSync(new URL('../src/components/ui/plain-dialog.tsx', import.meta.url), 'utf8');
  const chatbotPanel = readFileSync(new URL('../src/components/chatbot/ChatBotConversationPanel.tsx', import.meta.url), 'utf8');
  const chatbotTabs = readFileSync(new URL('../src/components/chatbot/ChatBotSessionStateRuntime.tsx', import.meta.url), 'utf8');

  assert.match(filterSheet, /inline-flex min-h-11 items-center rounded-full/);
  assert.match(dialog, /aria-label="닫기"[\s\S]{0,160}size="iconTouch"/);
  assert.match(chatbotPanel, /sm:absolute sm:-right-2 sm:-top-2/);
  assert.match(chatbotPanel, /min-h-11 min-w-11[\s\S]{0,500}aria-label="메시지 복사"/);
  assert.match(chatbotPanel, /flex min-h-11 w-full items-center[\s\S]{0,400}팀 심층 분석/);
  assert.match(chatbotTabs, /role="tablist"[\s\S]{0,900}role="tab"[\s\S]{0,80}aria-selected=\{isActive\}/);
  assert.match(chatbotTabs, /tabIndex=\{isActive \? 0 : -1\}/);
  assert.match(chatbotTabs, /onKeyDown=\{\(event\) => handleTabKeyDown\(event, index\)\}/);
});

test('first-pass visual findings keep touch targets and mobile fixed layers separated', () => {
  const mateDetail = readFileSync(new URL('../src/components/MateDetailRuntime.tsx', import.meta.url), 'utf8');
  const cheerBookmarks = readFileSync(new URL('../src/components/CheerBookmarks.tsx', import.meta.url), 'utf8');
  const offseason = readFileSync(new URL('../src/components/OffSeasonList.tsx', import.meta.url), 'utf8');
  const mateFlowUi = readFileSync(new URL('../src/utils/mateFlowUi.ts', import.meta.url), 'utf8');
  const mateDetailContent = readFileSync(new URL('../src/components/MateDetailContentRuntime.tsx', import.meta.url), 'utf8');

  assert.equal((mateDetail.match(/size="touch"/g) ?? []).length >= 2, true);
  assert.match(cheerBookmarks, /bottom-6 right-24[\s\S]{0,180}md:flex lg:hidden/);
  assert.match(offseason, /lg:sticky lg:top-4/);
  assert.doesNotMatch(mateFlowUi, /mateMobileBarClass\s*=\s*\n\s*'fixed/);
  assert.match(mateFlowUi, /mateMobileBarClass\s*=\s*\n\s*'relative/);
  assert.doesNotMatch(mateDetailContent, /mb-\[calc\(7rem/);
  assert.match(mateDetail, /min-h-screen bg-gray-50 pb-0 dark:bg-background lg:pb-16/);
});

test('review star radios implement roving keyboard selection', () => {
  const reviewDialog = readFileSync(new URL('../src/components/ReviewDialog.tsx', import.meta.url), 'utf8');

  assert.match(reviewDialog, /role="radiogroup"/);
  assert.match(reviewDialog, /tabIndex=\{rating === num \|\| \(rating === 0 && num === 1\) \? 0 : -1\}/);
  assert.match(reviewDialog, /onKeyDown=\{\(event\) => handleRatingKeyDown\(event, num\)\}/);
  assert.match(reviewDialog, /event\.key === 'ArrowRight' \|\| event\.key === 'ArrowDown'/);
  assert.match(reviewDialog, /event\.key === 'ArrowLeft' \|\| event\.key === 'ArrowUp'/);
});
