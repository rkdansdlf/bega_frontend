#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const frontendRoot = process.cwd();
const outputRoot = path.resolve(
  process.env.PREDICTION_READ_AUDIT_OUTPUT || path.join(frontendRoot, '..', 'output', 'mobile-uiux-batch-20260917-prediction-read-01'),
);
const baseUrl = String(process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5197').replace(/\/$/, '');
const targetDate = '2099-05-01';
const selectedDate = '2099-05-02';
const targetGameId = '20990501KIANC0';
const selectedGameId = '20990502LGKT0';

const games = {
  [targetDate]: [
    {
      gameId: targetGameId,
      gameDate: targetDate,
      awayTeam: 'KIA',
      homeTeam: 'NC',
      stadium: '창원',
      startTime: '18:30:00',
      gameStatus: 'FINAL',
      gameStatusKr: '경기 종료',
      awayScore: 3,
      homeScore: 2,
      winner: 'KIA',
      leagueType: 'REGULAR',
    },
    {
      gameId: '20990501LGKT0',
      gameDate: targetDate,
      awayTeam: 'LG',
      homeTeam: 'KT',
      stadium: '수원',
      startTime: '18:30:00',
      gameStatus: 'SCHEDULED',
      gameStatusKr: '경기 예정',
      awayScore: null,
      homeScore: null,
      winner: null,
      leagueType: 'REGULAR',
    },
  ],
  [selectedDate]: [
    {
      gameId: selectedGameId,
      gameDate: selectedDate,
      awayTeam: '두산',
      homeTeam: '삼성',
      stadium: '대구',
      startTime: '18:30:00',
      gameStatus: 'FINAL',
      gameStatusKr: '경기 종료',
      awayScore: 1,
      homeScore: 4,
      winner: '삼성',
      leagueType: 'REGULAR',
    },
  ],
  '2099-05-03': [],
};

const detailByGameId = {
  [targetGameId]: {
    ...games[targetDate][0],
    homePitcher: '구창모',
    awayPitcher: '양현종',
    stadiumName: '창원NC파크',
    attendance: 12000,
    weather: '맑음',
    gameTimeMinutes: 180,
    inningScores: [
      { inning: 1, teamSide: 'away', teamCode: 'KIA', runs: 2 },
      { inning: 1, teamSide: 'home', teamCode: 'NC', runs: 0 },
      { inning: 2, teamSide: 'away', teamCode: 'KIA', runs: 1 },
      { inning: 2, teamSide: 'home', teamCode: 'NC', runs: 2 },
    ],
    summary: [
      { gameId: targetGameId, type: '결승타', playerName: '김도영', detail: '2회초 1타점 적시타' },
    ],
  },
  [selectedGameId]: {
    ...games[selectedDate][0],
    homePitcher: '원태인',
    awayPitcher: '곽빈',
    stadiumName: '대구 삼성 라이온즈 파크',
    attendance: 10000,
    weather: '맑음',
    gameTimeMinutes: 170,
    inningScores: [],
    summary: [],
  },
};

const authProfile = {
  success: true,
  data: {
    id: 123,
    email: 'prediction-read-01@example.com',
    name: 'Prediction Reader',
    handle: 'prediction-reader',
    favoriteTeam: 'KIA',
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
    cheerPoints: 0,
  },
};

const authStorage = {
  state: {
    user: authProfile.data,
    isLoggedIn: true,
    isAdmin: false,
  },
  version: 0,
};

const json = (body, status = 200, extra = {}) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
  ...extra,
});

const dayBody = (date) => {
  const dateGames = games[date] || [];
  const dates = Object.keys(games).sort();
  const index = dates.indexOf(date);
  const prevDate = index > 0 ? dates[index - 1] : null;
  const nextDate = index >= 0 && index < dates.length - 1 ? dates[index + 1] : null;
  return {
    date,
    games: dateGames,
    prevDate,
    nextDate,
    hasPrev: Boolean(prevDate),
    hasNext: Boolean(nextDate),
  };
};

const bootstrapBody = (date, gameId = null) => {
  const dateGames = games[date] || [];
  const selectedGame = dateGames.find((game) => game.gameId === gameId) || null;
  return {
    schedule: dayBody(date),
    selectedGameId: gameId,
    selectedGameFound: Boolean(selectedGame),
    detail: selectedGame
      ? { ok: true, data: detailByGameId[selectedGame.gameId] || null, error: null }
      : null,
    voteStatus: selectedGame
      ? { ok: true, data: { homeVotes: 3, awayVotes: 5, totalVotes: 8 }, error: null }
      : null,
  };
};

const pathnameOf = (request) => new URL(request.url()).pathname;

const createFixtureRouter = (records, scenario) => async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const isApi = url.pathname.startsWith('/api/');
  const isSameOrigin = url.origin === new URL(baseUrl).origin;

  if (!isSameOrigin) {
    records.externalRequests.push({ method, url: request.url(), action: 'blocked' });
    await route.abort('blockedbyclient');
    return;
  }

  if (!isApi) {
    await route.continue();
    return;
  }

  records.apiRequests.push({ method, pathname: url.pathname, query: url.search });
  if (method !== 'GET' && method !== 'HEAD') {
    records.nonReadRequests.push({ method, pathname: url.pathname, query: url.search, action: 'blocked' });
    await route.abort('blockedbyclient');
    return;
  }

  if (scenario === 'bootstrap-error' && url.pathname === '/api/predictions/bootstrap') {
    await route.fulfill(json({ message: 'fixture bootstrap failure', code: 'PREDICTION_FIXTURE_503' }, 503));
    return;
  }

  if (scenario === 'day-error' && url.pathname === '/api/matches/day') {
    await route.fulfill(json({ message: 'fixture day failure', code: 'PREDICTION_FIXTURE_503' }, 503));
    return;
  }

  if (url.pathname === '/api/auth/mypage') {
    await route.fulfill(json(authProfile));
    return;
  }
  if (url.pathname === '/api/leaderboard/me') {
    await route.fulfill(json({ handle: 'prediction-reader', userName: 'Prediction Reader', rank: 1, totalScore: 0, seasonScore: 0, monthlyScore: 0, weeklyScore: 0, level: 1, rankTitle: 'ROOKIE', currentStreak: 0, maxStreak: 0, experiencePoints: 0, nextLevelExp: 100 }));
    return;
  }
  if (url.pathname === '/api/chat/my/unread-counts') {
    await route.fulfill(json({ success: true, data: 0 }));
    return;
  }
  if (url.pathname === '/api/dm/rooms/my') {
    await route.fulfill(json({ success: true, data: [] }));
    return;
  }
  if (url.pathname === '/api/notifications/my/unread-count') {
    await route.fulfill(json(0));
    return;
  }
  if (url.pathname === '/api/notifications/my') {
    await route.fulfill(json([]));
    return;
  }
  if (url.pathname === '/api/parties/my' || url.pathname === '/api/applications/my') {
    await route.fulfill(json([]));
    return;
  }
  if (url.pathname.startsWith('/api/parties/search-terms/popular')) {
    await route.fulfill(json([]));
    return;
  }
  if (url.pathname === '/api/matches/bounds') {
    await route.fulfill(json({ hasData: true, earliestGameDate: '2099-05-01', latestGameDate: '2099-05-03' }));
    return;
  }
  if (url.pathname === '/api/kbo/rankings/snapshot') {
    await route.fulfill(json({ rankingSeasonYear: 2099, rankingSourceMessage: 'local fixture', isOffSeason: false, rankings: [] }));
    return;
  }
  if (url.pathname === '/api/predictions/bootstrap') {
    const date = url.searchParams.get('date') || targetDate;
    const gameId = url.searchParams.get('gameId');
    await route.fulfill(json(bootstrapBody(date, gameId)));
    return;
  }
  if (url.pathname === '/api/matches/day') {
    const date = url.searchParams.get('date') || targetDate;
    await route.fulfill(json(dayBody(date)));
    return;
  }
  if (url.pathname === '/api/predictions/my-votes') {
    await route.fulfill(json({ votes: {} }));
    return;
  }
  if (url.pathname.startsWith('/api/predictions/status/')) {
    await route.fulfill(json({ homeVotes: 3, awayVotes: 5, totalVotes: 8 }));
    return;
  }
  if (url.pathname.startsWith('/api/matches/')) {
    const gameId = url.pathname.split('/').pop();
    if (scenario === 'detail-delay') {
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }
    const detail = detailByGameId[gameId] || detailByGameId[targetGameId];
    await route.fulfill(json(detail));
    return;
  }

  records.unmatchedLocalRequests.push({ method, pathname: url.pathname, query: url.search });
  await route.abort('blockedbyclient');
};

const metricScript = () => {
  const rect = (element) => {
    if (!element) return null;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      rect: { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom },
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      position: style.position,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
    };
  };
  const byTestId = (id) => rect(document.querySelector(`[data-testid="${id}"]`));
  const overflowingDescendants = (id) => {
    const container = document.querySelector(`[data-testid="${id}"]`);
    if (!container) return [];
    const containerRect = container.getBoundingClientRect();
    return [...container.querySelectorAll('*')]
      .map((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          tag: element.tagName,
          testid: element.getAttribute('data-testid'),
          text: element.textContent?.trim().slice(0, 80),
          className: typeof element.className === 'string' ? element.className : '',
          left: box.left,
          right: box.right,
          width: box.width,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          overflowX: style.overflowX,
        };
      })
      .filter((item) => item.width > 0 && (item.left < containerRect.left - 1 || item.right > containerRect.right + 1 || item.scrollWidth > item.clientWidth + 1))
      .slice(0, 40);
  };
  const textMetric = (text) => {
    const element = [...document.querySelectorAll('body *')].find((candidate) => candidate.children.length === 0 && candidate.textContent?.trim() === text);
    return element ? { text, ...rect(element) } : null;
  };
  const fixed = [...document.querySelectorAll('body *')]
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return (style.position === 'fixed' || style.position === 'sticky') && box.width > 0 && box.height > 0;
    })
    .slice(0, 30)
    .map((element) => ({ tag: element.tagName, testid: element.getAttribute('data-testid'), text: element.textContent?.trim().slice(0, 100), ...rect(element) }));
  const interactiveOverlaps = [...document.querySelectorAll('button, a, input, select, textarea, [role="button"]')]
    .filter((element) => !element.closest('[data-testid="public-mobile-bottom-nav"]'))
    .flatMap((element) => {
      const box = element.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return [];
      return [...document.querySelectorAll('[data-testid="public-mobile-bottom-nav"]')]
        .map((fixedElement) => {
          const fixedBox = fixedElement.getBoundingClientRect();
          const overlapWidth = Math.max(0, Math.min(box.right, fixedBox.right) - Math.max(box.left, fixedBox.left));
          const overlapHeight = Math.max(0, Math.min(box.bottom, fixedBox.bottom) - Math.max(box.top, fixedBox.top));
          return overlapWidth > 0 && overlapHeight > 0
            ? {
              testid: element.getAttribute('data-testid'),
              text: element.textContent?.trim().slice(0, 80),
              rect: { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom },
              fixedTestid: fixedElement.getAttribute('data-testid'),
              overlap: { width: overlapWidth, height: overlapHeight },
            }
            : null;
        })
        .filter(Boolean);
    });
  return {
    viewport: { width: innerWidth, height: innerHeight },
    document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, clientHeight: document.documentElement.clientHeight, scrollHeight: document.documentElement.scrollHeight },
    root: { inlineFontSize: document.documentElement.style.fontSize, computedFontSize: getComputedStyle(document.documentElement).fontSize },
    metrics: {
      preview: byTestId('prediction-match-preview-root'),
      schedule: byTestId('prediction-schedule-preview'),
      list: byTestId('prediction-schedule-match-list'),
      firstRow: byTestId('prediction-schedule-match-row'),
      scoreboard: byTestId('prediction-scoreboard'),
      detail: byTestId('prediction-match-detail-root'),
      dateSheet: rect(document.querySelector('#prediction-mobile-date-sheet')),
      detailButton: byTestId('prediction-match-enter-detail-btn'),
      selectedDateButton: rect(document.querySelector('[data-testid="prediction-schedule-mobile-date-button"][aria-pressed="true"]')),
      mobileToday: byTestId('prediction-schedule-mobile-today-btn'),
      mobileDateTrigger: byTestId('prediction-schedule-mobile-date-trigger'),
      title: textMetric('전력분석실'),
      league: textMetric('KBO리그'),
      status: textMetric('경기 종료'),
    },
    overflowing: {
      matchList: overflowingDescendants('prediction-schedule-match-list'),
      schedule: overflowingDescendants('prediction-schedule-preview'),
    },
    interactiveOverlaps,
    fixed,
  };
};

const seedAuth = async (context) => {
  await context.addCookies([{ name: 'Authorization', value: 'prediction-read-01-token', url: baseUrl }]);
  await context.addInitScript(({ authState }) => {
    localStorage.setItem('accessToken', 'prediction-read-01-token');
    localStorage.setItem('auth-storage', JSON.stringify(authState));
    localStorage.setItem('bega_has_visited', 'true');
    localStorage.setItem('bega_dont_show_guide', 'true');
  }, { authState: authStorage });
};

const waitForInitialRender = async (page) => {
  await page.getByRole('heading', { name: '전력분석실', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(500);
};

const runMatrixScenario = async ({ width, theme, rootScale, scenario = 'normal' }) => {
  const records = { apiRequests: [], unmatchedLocalRequests: [], externalRequests: [], nonReadRequests: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, serviceWorkers: 'block' });
  await seedAuth(context);
  await context.route('**/*', createFixtureRouter(records, scenario));
  const page = await context.newPage();
  const slug = `${scenario}-${width}-${theme}-root${rootScale}`;
  const entry = { scenario, width, theme, rootScale, slug, records };
  try {
    const initialDate = scenario === 'empty' ? '2099-05-03' : targetDate;
    await page.goto(`${baseUrl}/prediction?date=${initialDate}`, { waitUntil: 'domcontentloaded' });
    await waitForInitialRender(page);
    await page.evaluate((scale) => {
      document.documentElement.style.fontSize = `${scale * 16}px`;
    }, rootScale);
    await page.waitForTimeout(150);
    entry.initialUrl = page.url();
    entry.initial = await page.evaluate(metricScript);
    await page.screenshot({ path: path.join(outputRoot, `${slug}-initial.png`), fullPage: true });

    if (scenario === 'normal') {
      const dateTrigger = page.getByTestId('prediction-schedule-mobile-date-trigger');
      if (await dateTrigger.count()) {
        await dateTrigger.click();
        await page.locator('#prediction-mobile-date-sheet').waitFor({ state: 'visible' });
        entry.dateSheetOpen = await page.evaluate(metricScript);
        await page.screenshot({ path: path.join(outputRoot, `${slug}-date-sheet.png`), fullPage: true });
        const alternative = page.locator(`[data-testid="prediction-schedule-mobile-date-button"][data-date="${selectedDate}"]`);
        if (await alternative.count()) {
          await alternative.click();
          await page.waitForTimeout(500);
          entry.afterDateSelection = await page.evaluate(metricScript);
          entry.selectedDateUrl = page.url();
        } else {
          await page.keyboard.press('Escape');
        }
      }

      const detailButton = page.getByTestId('prediction-match-enter-detail-btn').first();
      if (await detailButton.count()) {
        await detailButton.scrollIntoViewIfNeeded();
        await detailButton.click();
        await page.waitForTimeout(500);
        entry.detailUrl = page.url();
        entry.detail = await page.evaluate(metricScript);
        await page.screenshot({ path: path.join(outputRoot, `${slug}-detail.png`), fullPage: true });
      }
    }
    if (scenario === 'empty' || scenario === 'bootstrap-error' || scenario === 'day-error') {
      await page.screenshot({ path: path.join(outputRoot, `${slug}-state.png`), fullPage: true });
      entry.stateText = (await page.locator('body').innerText()).slice(0, 5000);
      entry.state = await page.evaluate(metricScript);
    }
    if (scenario === 'detail-delay') {
      const detailButton = page.getByTestId('prediction-match-enter-detail-btn').first();
      await detailButton.click();
      await page.waitForTimeout(400);
      entry.loading = await page.evaluate(metricScript);
      entry.loadingText = (await page.locator('body').innerText()).slice(0, 3000);
      await page.screenshot({ path: path.join(outputRoot, `${slug}-loading.png`), fullPage: true });
      await page.waitForTimeout(1900);
      entry.afterDelay = await page.evaluate(metricScript);
    }
  } catch (error) {
    entry.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
  return entry;
};

const main = async () => {
  await fs.mkdir(outputRoot, { recursive: true });
  const entries = [];
  for (const theme of ['light', 'dark']) {
    for (const rootScale of [1, 2]) {
      for (const width of [320, 390]) {
        entries.push(await runMatrixScenario({ width, theme, rootScale }));
      }
    }
  }
  for (const theme of ['light', 'dark']) {
    entries.push(await runMatrixScenario({ width: 320, theme, rootScale: 2, scenario: 'empty' }));
    entries.push(await runMatrixScenario({ width: 320, theme, rootScale: 2, scenario: 'day-error' }));
    entries.push(await runMatrixScenario({ width: 320, theme, rootScale: 2, scenario: 'detail-delay' }));
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    route: '/prediction',
    browser: 'Chromium via Playwright',
    serviceWorkers: 'block',
    fixturePolicy: 'local route fixtures; unmatched local API and all external requests are blocked',
    methods: 'GET/HEAD allowed; non-GET/HEAD blocked',
    realBrowserZoom: 'not executed in this batch; root font-size injection is layout stress only',
    entries,
    counts: {
      entryCount: entries.length,
      errors: entries.filter((entry) => entry.error).length,
      unmatchedLocalRequests: entries.reduce((sum, entry) => sum + entry.records.unmatchedLocalRequests.length, 0),
      externalRequests: entries.reduce((sum, entry) => sum + entry.records.externalRequests.length, 0),
      nonReadRequests: entries.reduce((sum, entry) => sum + entry.records.nonReadRequests.length, 0),
    },
  };
  await fs.writeFile(path.join(outputRoot, 'audit.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outputRoot, 'audit.md'), [
    '# PREDICTION-READ-01 audit',
    '',
    `- Generated: ${summary.generatedAt}`,
    `- Route: ${summary.route}`,
    `- Browser: ${summary.browser}`,
    `- Matrix entries: ${summary.counts.entryCount}`,
    `- Unmatched local API requests: ${summary.counts.unmatchedLocalRequests}`,
    `- External requests blocked: ${summary.counts.externalRequests}`,
    `- Non-read requests blocked: ${summary.counts.nonReadRequests}`,
    `- Root injection is not real browser zoom; real browser zoom: ${summary.realBrowserZoom}`,
    '',
    '| Scenario | Width | Theme | Root | URL | Error | Document scroll/client | Detail |',
    '| --- | ---: | --- | ---: | --- | --- | --- | --- |',
    ...entries.map((entry) => {
      const metrics = entry.initial || entry.state || {};
      const doc = metrics.document || {};
      return `| ${entry.scenario} | ${entry.width} | ${entry.theme} | ${entry.rootScale} | ${entry.detailUrl || entry.initialUrl || ''} | ${entry.error || ''} | ${doc.scrollWidth ?? ''}/${doc.clientWidth ?? ''} | ${entry.detail ? 'observed' : 'not reached'} |`;
    }),
    '',
    'Real Chromium zoom was deliberately not re-run; root32 results above are a separate CSS root override stress condition.',
  ].join('\n') + '\n', 'utf8');
  console.log(JSON.stringify({ outputRoot, counts: summary.counts }, null, 2));
  if (summary.counts.errors > 0 || summary.counts.unmatchedLocalRequests > 0 || summary.counts.nonReadRequests > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
