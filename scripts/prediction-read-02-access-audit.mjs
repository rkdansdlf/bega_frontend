#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const frontendRoot = process.cwd();
const outputRoot = path.resolve(
  process.env.PREDICTION_READ_02_OUTPUT ||
    path.join(frontendRoot, '..', 'output', 'mobile-uiux-batch-20260917-prediction-read-02'),
);
const baseUrl = String(process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5197').replace(/\/$/, '');
const targetDate = '2099-05-01';
const selectedDate = '2099-05-02';
const targetGameId = '20990501KIANC0';
const selectedGameId = '20990502DOSAM0';

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
    inningScores: [],
    summary: [],
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
    email: 'prediction-read-02@example.com',
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
  state: { user: authProfile.data, isLoggedIn: true, isAdmin: false },
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
    detail: selectedGame ? { ok: true, data: detailByGameId[selectedGame.gameId] || null, error: null } : null,
    voteStatus: selectedGame
      ? { ok: true, data: { homeVotes: 3, awayVotes: 5, totalVotes: 8 }, error: null }
      : null,
  };
};

const fixtureSummary = (pathname, body) => ({
  pathname,
  date: body?.date || body?.schedule?.date || null,
  gameId: body?.selectedGameId || body?.gameId || body?.detail?.data?.gameId || null,
  awayTeam: body?.games?.[0]?.awayTeam || body?.schedule?.games?.[0]?.awayTeam || body?.awayTeam || null,
  homeTeam: body?.games?.[0]?.homeTeam || body?.schedule?.games?.[0]?.homeTeam || body?.homeTeam || null,
  awayScore: body?.games?.[0]?.awayScore ?? body?.schedule?.games?.[0]?.awayScore ?? body?.awayScore ?? null,
  homeScore: body?.games?.[0]?.homeScore ?? body?.schedule?.games?.[0]?.homeScore ?? body?.homeScore ?? null,
  gameStatus: body?.games?.[0]?.gameStatusKr || body?.schedule?.games?.[0]?.gameStatusKr || body?.gameStatusKr || null,
});

const createFixtureRouter = (records) => async (route) => {
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

  let responseBody;
  if (url.pathname === '/api/auth/mypage') responseBody = authProfile;
  else if (url.pathname === '/api/leaderboard/me') {
    responseBody = {
      handle: 'prediction-reader',
      userName: 'Prediction Reader',
      rank: 1,
      totalScore: 0,
      seasonScore: 0,
      monthlyScore: 0,
      weeklyScore: 0,
      level: 1,
      rankTitle: 'ROOKIE',
      currentStreak: 0,
      maxStreak: 0,
      experiencePoints: 0,
      nextLevelExp: 100,
    };
  } else if (url.pathname === '/api/chat/my/unread-counts') responseBody = { success: true, data: 0 };
  else if (url.pathname === '/api/dm/rooms/my') responseBody = { success: true, data: [] };
  else if (url.pathname === '/api/notifications/my/unread-count') responseBody = 0;
  else if (url.pathname === '/api/notifications/my') responseBody = [];
  else if (url.pathname === '/api/parties/my' || url.pathname === '/api/applications/my') responseBody = [];
  else if (url.pathname.startsWith('/api/parties/search-terms/popular')) responseBody = [];
  else if (url.pathname === '/api/matches/bounds') {
    responseBody = { hasData: true, earliestGameDate: targetDate, latestGameDate: '2099-05-03' };
  } else if (url.pathname === '/api/kbo/rankings/snapshot') {
    responseBody = { rankingSeasonYear: 2099, rankingSourceMessage: 'local fixture', isOffSeason: false, rankings: [] };
  } else if (url.pathname === '/api/predictions/bootstrap') {
    const date = url.searchParams.get('date') || targetDate;
    const gameId = url.searchParams.get('gameId');
    responseBody = bootstrapBody(date, gameId);
  } else if (url.pathname === '/api/matches/day') {
    responseBody = dayBody(url.searchParams.get('date') || targetDate);
  } else if (url.pathname === '/api/predictions/my-votes') {
    responseBody = { votes: {} };
  } else if (url.pathname.startsWith('/api/predictions/status/')) {
    responseBody = { homeVotes: 3, awayVotes: 5, totalVotes: 8 };
  } else if (url.pathname.startsWith('/api/matches/')) {
    const gameId = url.pathname.split('/').pop();
    responseBody = detailByGameId[gameId] || detailByGameId[targetGameId];
  } else {
    records.unmatchedLocalRequests.push({ method, pathname: url.pathname, query: url.search });
    await route.abort('blockedbyclient');
    return;
  }

  records.fixtureResponses.push({
    method,
    pathname: url.pathname,
    query: url.search,
    status: 200,
    summary: fixtureSummary(url.pathname, responseBody),
  });
  await route.fulfill(json(responseBody));
};

const box = (element) => {
  if (!element) return null;
  const value = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return {
    rect: { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom },
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    overflowX: style.overflowX,
    overflowY: style.overflowY,
    position: style.position,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    text: element.textContent?.trim().slice(0, 120) || '',
  };
};

const overlap = (a, b) => {
  if (!a?.rect || !b?.rect) return null;
  const width = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x));
  const height = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y));
  return { width, height, intersects: width > 0 && height > 0 };
};

const metricScript = () => {
  const box = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      rect: { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom },
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      position: style.position,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      text: element.textContent?.trim().slice(0, 120) || '',
    };
  };
  const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
  const rect = (element) => box(element);
  const overlap = (a, b) => {
    if (!a?.rect || !b?.rect) return null;
    const width = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x));
    const height = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y));
    return { width, height, intersects: width > 0 && height > 0 };
  };
  const nav = rect(testid('public-mobile-bottom-nav'));
  const rowMetrics = [...document.querySelectorAll('[data-testid="prediction-schedule-match-row"]')].map((row) => {
    const matchup = row.querySelector('[data-testid="prediction-schedule-matchup"]');
    const action = row.querySelector('[data-testid="prediction-match-enter-detail-btn"]');
    const actionWrapper = action?.parentElement || null;
    const fields = [...(matchup?.querySelectorAll('p') || [])].map((field) => ({
      visibleText: field.textContent?.trim() || '',
      ariaLabel: field.getAttribute('aria-label'),
      box: rect(field),
      clipped: field.scrollWidth > field.clientWidth + 1,
    }));
    return {
      gameId: row.getAttribute('data-game-id'),
      ariaLabel: row.getAttribute('aria-label'),
      row: rect(row),
      matchup: rect(matchup),
      actionWrapper: rect(actionWrapper),
      action: rect(action),
      teamFields: fields,
      score: rect(matchup?.querySelector('[aria-label*="경기"]')),
      actionNavOverlap: overlap(rect(action), nav),
    };
  });
  const buttons = [...document.querySelectorAll('[data-testid="prediction-match-enter-detail-btn"]')].map((button) => {
    const buttonBox = rect(button);
    const buttonOverlap = overlap(buttonBox, nav);
    return {
      gameId: button.closest('[data-game-id]')?.getAttribute('data-game-id') || null,
      button: buttonBox,
      navOverlap: buttonOverlap,
      centerCoveredByNav: Boolean(
        buttonBox?.rect &&
          nav?.rect &&
          buttonBox.rect.x + buttonBox.rect.width / 2 >= nav.rect.x &&
          buttonBox.rect.x + buttonBox.rect.width / 2 <= nav.rect.right &&
          buttonBox.rect.y + buttonBox.rect.height / 2 >= nav.rect.y &&
          buttonBox.rect.y + buttonBox.rect.height / 2 <= nav.rect.bottom,
      ),
      fullyAboveNav: Boolean(buttonBox?.rect && nav?.rect && buttonBox.rect.bottom <= nav.rect.y),
    };
  });
  return {
    viewport: { width: innerWidth, height: innerHeight },
    scrollY: window.scrollY,
    document: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
    },
    root: {
      inlineFontSize: document.documentElement.style.fontSize,
      computedFontSize: getComputedStyle(document.documentElement).fontSize,
    },
    toolbar: rect(testid('prediction-schedule-preview')),
    list: rect(testid('prediction-schedule-match-list')),
    listScrollTop: testid('prediction-schedule-match-list')?.scrollTop || 0,
    listScrollHeight: testid('prediction-schedule-match-list')?.scrollHeight || 0,
    listClientHeight: testid('prediction-schedule-match-list')?.clientHeight || 0,
    fixedNav: nav,
    rows: rowMetrics,
    detailButtons: buttons,
    clippedFields: rowMetrics.flatMap((row) => row.teamFields.filter((field) => field.clipped)),
    keyText: {
      league: [...document.querySelectorAll('body *')].some((element) => element.children.length === 0 && element.textContent?.trim() === 'KBO리그'),
      detailTitle: [...document.querySelectorAll('body *')].some((element) => element.children.length === 0 && element.textContent?.trim() === '전력분석실'),
    },
  };
};

const focusScript = () => {
  const box = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      rect: { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom },
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      position: style.position,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      text: element.textContent?.trim().slice(0, 120) || '',
    };
  };
  const overlap = (a, b) => {
    if (!a?.rect || !b?.rect) return null;
    const width = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x));
    const height = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y));
    return { width, height, intersects: width > 0 && height > 0 };
  };
  const active = document.activeElement;
  const nav = document.querySelector('[data-testid="public-mobile-bottom-nav"]');
  const button = active?.matches('[data-testid="prediction-match-enter-detail-btn"]') ? active : null;
  const activeBox = box(active);
  const navBox = box(nav);
  const activeOverlap = overlap(activeBox, navBox);
  return {
    tag: active?.tagName || null,
    testid: active?.getAttribute('data-testid') || null,
    gameId: active?.closest('[data-game-id]')?.getAttribute('data-game-id') || null,
    text: active?.textContent?.trim().slice(0, 100) || '',
    active: activeBox,
    nav: navBox,
    navOverlap: activeOverlap,
    centerCoveredByNav: Boolean(
      button &&
        activeBox?.rect &&
        navBox?.rect &&
        activeBox.rect.x + activeBox.rect.width / 2 >= navBox.rect.x &&
        activeBox.rect.x + activeBox.rect.width / 2 <= navBox.rect.right &&
        activeBox.rect.y + activeBox.rect.height / 2 >= navBox.rect.y &&
        activeBox.rect.y + activeBox.rect.height / 2 <= navBox.rect.bottom,
    ),
    fullyAboveNav: Boolean(button && activeBox?.rect && navBox?.rect && activeBox.rect.bottom <= navBox.rect.y),
    focusVisible: Boolean(active?.matches(':focus-visible')),
    outline: active ? getComputedStyle(active).outline : null,
    boxShadow: active ? getComputedStyle(active).boxShadow : null,
    scrollY: window.scrollY,
  };
};

const seedAuth = async (context) => {
  await context.addCookies([{ name: 'Authorization', value: 'prediction-read-02-token', url: baseUrl }]);
  await context.addInitScript(({ authState }) => {
    localStorage.setItem('accessToken', 'prediction-read-02-token');
    localStorage.setItem('auth-storage', JSON.stringify(authState));
    localStorage.setItem('bega_has_visited', 'true');
    localStorage.setItem('bega_dont_show_guide', 'true');
  }, { authState: authStorage });
};

const createEmptyRecords = () => ({
  apiRequests: [],
  fixtureResponses: [],
  unmatchedLocalRequests: [],
  externalRequests: [],
  nonReadRequests: [],
});

const combineSessionRecords = (sessionRecords) => {
  const collect = (key) => sessionRecords.flatMap(({ label, records }) => (
    records[key].map((record) => ({ session: label, ...record }))
  ));

  return {
    apiRequests: collect('apiRequests'),
    fixtureResponses: collect('fixtureResponses'),
    unmatchedLocalRequests: collect('unmatchedLocalRequests'),
    externalRequests: collect('externalRequests'),
    nonReadRequests: collect('nonReadRequests'),
    bySession: sessionRecords.map(({ label, records }) => ({
      label,
      ...records,
    })),
  };
};

const waitForInitialRender = async (page) => {
  await page.getByRole('heading', { name: '전력분석실', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(500);
};

const newSession = async ({ width, theme }) => {
  const records = createEmptyRecords();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
    serviceWorkers: 'block',
  });
  await seedAuth(context);
  await context.route('**/*', createFixtureRouter(records));
  const page = await context.newPage();
  return { browser, context, page, records };
};

const injectRoot = async (page, rootScale) => {
  await page.evaluate((scale) => {
    document.documentElement.style.fontSize = String(scale * 16) + 'px';
  }, rootScale);
  await page.waitForTimeout(150);
};

const runScenario = async ({ width, theme, rootScale }) => {
  const sessionRecords = [];
  const registerSession = (label, records) => {
    sessionRecords.push({ label, records });
  };
  const session = await newSession({ width, theme });
  registerSession('last-action', session.records);
  const slug = 'matrix-' + width + '-' + theme + '-root' + rootScale;
  const entry = {
    scenario: 'normal',
    width,
    height: 900,
    theme,
    rootScale,
    slug,
    rootOverrideIsNotBrowserZoom: true,
    records: session.records,
  };
  const { browser, context, page } = session;
  try {
    await page.goto(baseUrl + '/prediction?date=' + targetDate, { waitUntil: 'domcontentloaded' });
    await waitForInitialRender(page);
    await injectRoot(page, rootScale);
    entry.initialUrl = page.url();
    entry.initial = await page.evaluate(metricScript);
    await page.screenshot({ path: path.join(outputRoot, slug + '-initial.png'), fullPage: true });

    const rows = page.getByTestId('prediction-schedule-match-row');
    entry.initialRows = await rows.count();
    const lastButton = page.getByTestId('prediction-match-enter-detail-btn').last();
    const beforeScroll = await page.evaluate(metricScript);
    entry.lastAction = { beforeScroll };
    await lastButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    entry.lastAction.afterNormalScroll = await page.evaluate(metricScript);
    entry.lastAction.listScrollDelta =
      entry.lastAction.afterNormalScroll.listScrollTop - entry.lastAction.beforeScroll.listScrollTop;
    entry.lastAction.windowScrollDelta =
      entry.lastAction.afterNormalScroll.scrollY - entry.lastAction.beforeScroll.scrollY;
    await lastButton.click();
    await page.waitForTimeout(450);
    entry.lastAction.clicked = true;
    entry.lastAction.afterClickUrl = page.url();
    await page.screenshot({ path: path.join(outputRoot, slug + '-last-action-detail.png'), fullPage: true });

    const selection = await newSession({ width, theme });
    registerSession('date-selection-detail', selection.records);
    try {
      await selection.page.goto(baseUrl + '/prediction?date=' + targetDate, { waitUntil: 'domcontentloaded' });
      await waitForInitialRender(selection.page);
      await injectRoot(selection.page, rootScale);
      const dateTrigger = selection.page.getByTestId('prediction-schedule-mobile-date-trigger');
      await dateTrigger.click();
      await selection.page.locator('#prediction-mobile-date-sheet').waitFor({ state: 'visible' });
      const selectedDateButton = selection.page.locator(
        '[data-testid="prediction-schedule-mobile-date-button"][data-date="' + selectedDate + '"]',
      );
      await selectedDateButton.click();
      await selection.page.waitForTimeout(550);
      const clickedRow = selection.page.getByTestId('prediction-schedule-match-row').first();
      const clickedButton = selection.page.getByTestId('prediction-match-enter-detail-btn').first();
      entry.selection = {
        selectedDate,
        clickedRow: {
          gameId: await clickedRow.getAttribute('data-game-id'),
          ariaLabel: await clickedRow.getAttribute('aria-label'),
          text: (await clickedRow.innerText()).slice(0, 1000),
        },
        afterDateUrl: selection.page.url(),
        afterDateMetrics: await selection.page.evaluate(metricScript),
        fixtureResponsesAfterDateSelection: selection.records.fixtureResponses.slice(),
      };
      await clickedButton.click();
      await selection.page.waitForTimeout(450);
      const pathname = new URL(selection.page.url()).pathname;
      const detailPathGameId = pathname.split('/').pop() || null;
      const bodyText = await selection.page.locator('body').innerText();
      entry.selection.detailUrl = selection.page.url();
      entry.selection.detailPathGameId = detailPathGameId;
      entry.selection.fixtureResponsesAfterDetail = selection.records.fixtureResponses.slice();
      entry.selection.rendered = {
        awayTeam: bodyText.includes('두산'),
        homeTeam: bodyText.includes('삼성'),
        awayPitcher: bodyText.includes('곽빈'),
        homePitcher: bodyText.includes('원태인'),
        score: bodyText.includes('1') && bodyText.includes('4'),
        status: bodyText.includes('경기 종료'),
      };
      await selection.page.screenshot({ path: path.join(outputRoot, slug + '-selected-detail.png'), fullPage: true });
      entry.selection.sameGameId =
        entry.selection.clickedRow.gameId === selectedGameId &&
        entry.selection.detailPathGameId === selectedGameId;
    } finally {
      await selection.page.close();
      await selection.context.close();
      await selection.browser.close();
    }

    const focus = await newSession({ width, theme });
    registerSession('keyboard-focus', focus.records);
    try {
      await focus.page.goto(baseUrl + '/prediction?date=' + targetDate, { waitUntil: 'domcontentloaded' });
      await waitForInitialRender(focus.page);
      await injectRoot(focus.page, rootScale);
      await focus.page.evaluate(() => window.scrollTo(0, 0));
      const focusSteps = [];
      let detailFocusCount = 0;
      for (let step = 0; step < 80; step += 1) {
        await focus.page.keyboard.press('Tab');
        await focus.page.waitForTimeout(50);
        const snapshot = await focus.page.evaluate(focusScript);
        focusSteps.push({ step: step + 1, ...snapshot });
        if (snapshot.testid === 'prediction-match-enter-detail-btn') detailFocusCount += 1;
        if (detailFocusCount >= 2) break;
      }
      entry.keyboard = {
        steps: focusSteps,
        detailFocusCount,
        detailFocuses: focusSteps.filter((item) => item.testid === 'prediction-match-enter-detail-btn'),
        tabReachedBothActions: detailFocusCount >= 2,
      };
      await focus.page.screenshot({ path: path.join(outputRoot, slug + '-keyboard-focus.png'), fullPage: true });
    } finally {
      await focus.page.close();
      await focus.context.close();
      await focus.browser.close();
    }
  } catch (error) {
    entry.error = error instanceof Error ? error.name + ': ' + error.message : String(error);
  } finally {
    entry.records = combineSessionRecords(sessionRecords);
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
        entries.push(await runScenario({ width, theme, rootScale }));
      }
    }
  }

  const sessionCounts = {};
  entries.forEach((entry) => {
    entry.records.bySession.forEach((session) => {
      const current = sessionCounts[session.label] || {
        sessions: 0,
        apiRequests: 0,
        externalRequests: 0,
        nonReadRequests: 0,
      };
      current.sessions += 1;
      current.apiRequests += session.apiRequests.length;
      current.externalRequests += session.externalRequests.length;
      current.nonReadRequests += session.nonReadRequests.length;
      sessionCounts[session.label] = current;
    });
  });

  const counts = {
    entryCount: entries.length,
    errors: entries.filter((entry) => entry.error).length,
    unmatchedLocalRequests: entries.reduce(
      (sum, entry) =>
        sum +
        entry.records.unmatchedLocalRequests.length +
        (entry.selection?.fixtureResponsesAfterDateSelection || []).filter((item) => item.status !== 200).length,
      0,
    ),
    externalRequests: entries.reduce((sum, entry) => sum + entry.records.externalRequests.length, 0),
    nonReadRequests: entries.reduce((sum, entry) => sum + entry.records.nonReadRequests.length, 0),
    sameGameIdFailures: entries.filter((entry) => entry.selection && !entry.selection.sameGameId).length,
    lastActionClickFailures: entries.filter((entry) => entry.lastAction && !entry.lastAction.clicked).length,
    keyboardBothActionFailures: entries.filter((entry) => !entry.keyboard?.tabReachedBothActions).length,
    sessionCounts,
  };
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    route: '/prediction',
    browser: 'Chromium via Playwright',
    serviceWorkers: 'block',
    viewport: { widths: [320, 390], height: 900 },
    themes: ['light', 'dark'],
    rootScales: [1, 2],
    realBrowserZoom: 'not executed; root font-size injection is a separate layout-stress condition',
    fixturePolicy: 'corrected local fixtures; unmatched local API and all external requests are blocked',
    methods: 'GET/HEAD allowed; non-GET/HEAD blocked',
    fixtureIdentity: {
      targetDate,
      selectedDate,
      selectedGameId,
      selectedTeams: '두산–삼성',
      note: 'The prior READ-01 audit used 20990502LGKT0 while its selected-date fixture rendered 두산–삼성. This audit uses 20990502DOSAM0 and records the full chain.',
    },
    entries,
    counts,
  };
  await fs.writeFile(path.join(outputRoot, 'access-audit.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  const rows = entries.map((entry) => {
    const initial = entry.initial || {};
    const last = entry.lastAction?.afterNormalScroll || {};
    const keyboard = entry.keyboard?.detailFocuses || [];
    return [
      '| ' + entry.width,
      entry.theme,
      entry.rootScale,
      initial.rows?.length || 0,
      initial.document?.scrollWidth + '/' + initial.document?.clientWidth,
      last.listScrollTop ?? '',
      entry.lastAction?.clicked ? 'PASS' : 'FAIL',
      keyboard.filter((item) => !item.navOverlap?.intersects).length + '/' + keyboard.length,
      entry.selection?.sameGameId ? 'PASS' : 'FAIL',
      '|',
    ].join(' | ');
  });
  const report = [
    '# PREDICTION-READ-02 access audit',
    '',
    '- This output is a new audit; the READ-01 raw audit and verdict are preserved.',
    '- Root 200% is CSS root-font injection only, not browser zoom.',
    '- Browser: Chromium via Playwright; viewport height: 900px; service workers: block.',
    '- GET/HEAD are allowed. Non-read requests are blocked and remain a failure signal.',
    '- Corrected fixture selected game: 20990502DOSAM0 (두산–삼성).',
    '- Network records are aggregated across the last-action, date-selection-detail, and keyboard-focus browser sessions; each request carries its session label.',
    '',
    '| Width | Theme | Root | Rows | Document scroll/client | List scrollTop | Last action | Focus visible above nav | Selected/detail identity |',
    '| --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |',
    ...rows,
    '',
    'Counts:',
    '',
    JSON.stringify(counts, null, 2),
    '',
    'The raw overlap data is in access-audit.json. A button overlap at the initial viewport is not classified as a defect unless normal scroll/click or keyboard focus remains obstructed.',
    '',
  ].join('\n');
  await fs.writeFile(path.join(outputRoot, 'access-audit.md'), report, 'utf8');
  console.log(JSON.stringify({ outputRoot, counts }, null, 2));
  if (
    counts.errors > 0 ||
    counts.unmatchedLocalRequests > 0 ||
    counts.externalRequests > 0 ||
    counts.nonReadRequests > 0 ||
    counts.sameGameIdFailures > 0 ||
    counts.lastActionClickFailures > 0 ||
    counts.keyboardBothActionFailures > 0
  ) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
