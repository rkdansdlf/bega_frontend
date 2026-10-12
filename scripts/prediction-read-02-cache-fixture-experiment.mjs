#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const frontendRoot = process.cwd();
const outputRoot = path.resolve(
  process.env.PREDICTION_READ_02_CACHE_OUTPUT ||
    path.join(frontendRoot, '..', 'output', 'mobile-uiux-batch-20260917-prediction-read-02-cache'),
);
const baseUrl = String(process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5197').replace(/\/$/, '');
const targetDate = '2099-05-01';
const targetGameId = '20990501LGKT0';
const targetGame = {
  gameId: targetGameId,
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
};
const finalGame = {
  gameId: '20990501KIANC0',
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
};
const games = [finalGame, targetGame];
const detail = {
  ...targetGame,
  homePitcher: '엄상백',
  awayPitcher: '임찬규',
  stadiumName: '수원KT위즈파크',
  attendance: 12000,
  weather: '맑음',
  gameTimeMinutes: 0,
  inningScores: [],
  summary: [],
};
const authProfile = {
  success: true,
  data: {
    id: 123,
    email: 'prediction-read-02-cache@example.com',
    name: 'Prediction Cache Reader',
    handle: 'prediction-cache-reader',
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

const json = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const fingerprint = (ids) => createHash('sha256')
  .update(JSON.stringify([...new Set(ids)].sort()))
  .digest('hex');

const dayBody = () => ({
  date: targetDate,
  games,
  prevDate: null,
  nextDate: null,
  hasPrev: false,
  hasNext: false,
});

const bootstrapBody = () => ({
  schedule: dayBody(),
  selectedGameId: targetGameId,
  selectedGameFound: true,
  detail: { ok: true, data: detail, error: null },
  voteStatus: { ok: true, data: { homeVotes: 3, awayVotes: 5, totalVotes: 8 }, error: null },
});

const createRecords = () => ({
  requests: [],
  fixtureResponses: [],
  myVotes: [],
  unmatchedLocalRequests: [],
  externalRequests: [],
  blockedNonReadRequests: [],
});

const addRequest = (records, request, phase) => {
  const url = new URL(request.url());
  const item = {
    seq: records.requests.length + 1,
    phase,
    method: request.method().toUpperCase(),
    pathname: url.pathname,
    query: url.search,
    elapsedMs: Math.round(performance.now()),
  };
  records.requests.push(item);
  return { item, url };
};

const installFixtureRoutes = async (context, records, state) => {
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const isSameOrigin = url.origin === new URL(baseUrl).origin;
    if (!isSameOrigin) {
      records.externalRequests.push({
        phase: state.phase,
        method,
        url: request.url(),
        action: 'blocked',
      });
      await route.abort('blockedbyclient');
      return;
    }
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }

    const { item } = addRequest(records, request, state.phase);
    if (method !== 'GET' && method !== 'HEAD') {
      if (url.pathname !== '/api/predictions/my-votes' || method !== 'POST') {
        records.blockedNonReadRequests.push({ ...item, action: 'blocked' });
        await route.abort('blockedbyclient');
        return;
      }

      let payload = null;
      try {
        payload = JSON.parse(request.postData() || 'null');
      } catch {
        payload = null;
      }
      const ids = Array.isArray(payload?.gameIds) ? payload.gameIds.filter((id) => typeof id === 'string') : [];
      const valid = ids.length > 0 && ids.every((id) => id === targetGameId);
      if (!valid) {
        records.unmatchedLocalRequests.push({ ...item, reason: 'my-votes body not in approved fixture range', ids });
        await route.abort('blockedbyclient');
        return;
      }
      const bodyIds = [...ids];
      const responseBody = {
        entries: [...new Set(bodyIds)].map((gameId) => ({ gameId, votedTeam: 'away' })),
        votes: Object.fromEntries([...new Set(bodyIds)].map((gameId) => [gameId, 'away'])),
      };
      const record = {
        ...item,
        bodyIds,
        bodySetFingerprint: fingerprint(bodyIds),
        responseStatus: 200,
        responseBodySummary: { returnedIds: [...new Set(bodyIds)], values: ['away'] },
        delivery: 'browser-route.fulfill',
      };
      records.myVotes.push(record);
      records.fixtureResponses.push({ ...item, status: 200, pathname: url.pathname, delivery: 'browser-route.fulfill' });
      await route.fulfill(json(responseBody));
      return;
    }

    let responseBody;
    if (url.pathname === '/api/auth/mypage') responseBody = authProfile;
    else if (url.pathname === '/api/leaderboard/me') {
      responseBody = {
        handle: 'prediction-cache-reader',
        userName: 'Prediction Cache Reader',
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
      responseBody = { hasData: true, earliestGameDate: targetDate, latestGameDate: targetDate };
    } else if (url.pathname === '/api/kbo/rankings/snapshot') {
      responseBody = { rankingSeasonYear: 2099, rankingSourceMessage: 'local fixture', isOffSeason: false, rankings: [] };
    } else if (url.pathname === '/api/matches/day') responseBody = dayBody();
    else if (url.pathname === '/api/predictions/bootstrap') responseBody = bootstrapBody();
    else if (url.pathname.startsWith('/api/predictions/status/')) {
      responseBody = { homeVotes: 3, awayVotes: 5, totalVotes: 8 };
    } else if (url.pathname === `/api/matches/${targetGameId}`) responseBody = detail;
    else if (url.pathname === '/api/matches/live') responseBody = [];
    else {
      records.unmatchedLocalRequests.push({ ...item, reason: 'no local fixture' });
      await route.abort('blockedbyclient');
      return;
    }

    records.fixtureResponses.push({ ...item, status: 200, pathname: url.pathname, delivery: 'browser-route.fulfill' });
    await route.fulfill(json(responseBody));
  });
};

const seedAuth = async (context) => {
  await context.addCookies([{ name: 'Authorization', value: 'prediction-read-02-cache-token', url: baseUrl }]);
  await context.addInitScript(({ authState }) => {
    localStorage.setItem('accessToken', 'prediction-read-02-cache-token');
    localStorage.setItem('auth-storage', JSON.stringify(authState));
    localStorage.setItem('bega_has_visited', 'true');
    localStorage.setItem('bega_dont_show_guide', 'true');
  }, { authState: authStorage });
};

const waitForList = async (page) => {
  await page.getByRole('heading', { name: '전력분석실', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByTestId('prediction-schedule-match-row').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(450);
};

const waitForVoteCount = async (records, expected, timeoutMs = 20000) => {
  const started = Date.now();
  while (records.myVotes.length < expected) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for my-votes fixture response ${expected}; observed ${records.myVotes.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

const selectedVoteSnapshot = async (page) => page.evaluate(() => {
  const panel = document.querySelector('[data-testid="prediction-vote-panel"]');
  const selected = panel?.querySelector('[aria-pressed="true"]');
  return {
    panelPresent: Boolean(panel),
    selectedAriaLabel: selected?.getAttribute('aria-label') || null,
    selectedText: selected?.textContent?.trim() || null,
    resolution: panel?.closest('[data-vote-resolution]')?.getAttribute('data-vote-resolution') || null,
  };
});

const summarizePhaseRequests = (records, phase) => records.myVotes
  .filter((item) => item.phase === phase)
  .map((item) => ({
    seq: item.seq,
    bodyIds: item.bodyIds,
    bodySetFingerprint: item.bodySetFingerprint,
    responseStatus: item.responseStatus,
    delivery: item.delivery,
  }));

const run = async () => {
  await fs.mkdir(outputRoot, { recursive: true });
  const records = createRecords();
  const state = { phase: 'initial', phaseStartAtMs: 0 };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 320, height: 900 },
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await seedAuth(context);
  await installFixtureRoutes(context, records, state);
  const page = await context.newPage();
  const result = {
    scenario: 'same-browser-context-normal-my-votes-fixture',
    baseUrl,
    viewport: { width: 320, height: 900 },
    colorScheme: 'light',
    serviceWorkers: 'block',
    fixtureOnly: true,
    actualBackendRequests: 0,
    actualDatabaseRequests: 0,
    phases: {},
    limitations: [],
  };

  try {
    await page.goto(`${baseUrl}/prediction?date=${targetDate}`, { waitUntil: 'domcontentloaded' });
    await waitForList(page);
    await waitForVoteCount(records, 1);
    result.phases.initial = {
      firstFixtureResponseComplete: true,
      myVotes: summarizePhaseRequests(records, 'initial'),
      listRows: await page.getByTestId('prediction-schedule-match-row').count(),
      firstResponseAtMs: records.myVotes[0]?.elapsedMs ?? null,
    };

    state.phaseStartAtMs = Math.round(performance.now());
    const firstDetailPhaseStartAtMs = state.phaseStartAtMs;
    state.phase = 'first-detail-bootstrap';
    const scheduledRow = page.locator(`[data-testid="prediction-schedule-match-row"][data-game-id="${targetGameId}"]`);
    await scheduledRow.waitFor({ state: 'visible', timeout: 10000 });
    await scheduledRow.getByTestId('prediction-match-enter-detail-btn').click();
    await page.waitForTimeout(700);
    result.phases.firstDetailBootstrap = {
      phaseStartAtMs: firstDetailPhaseStartAtMs,
      url: page.url(),
      myVotes: summarizePhaseRequests(records, 'first-detail-bootstrap'),
      voteUi: await selectedVoteSnapshot(page),
    };

    const beforeWarmReturn = records.myVotes.length;
    state.phaseStartAtMs = Math.round(performance.now());
    state.phase = 'warm-return';
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await waitForList(page);
    const countAfterWarmReturn = records.myVotes.length;
    result.phases.warmReturn = {
      url: page.url(),
      myVotesAdded: countAfterWarmReturn - beforeWarmReturn,
      myVotes: summarizePhaseRequests(records, 'warm-return'),
    };

    const beforeSecondDetail = records.myVotes.length;
    state.phaseStartAtMs = Math.round(performance.now());
    state.phase = 'second-detail-bootstrap';
    await scheduledRow.getByTestId('prediction-match-enter-detail-btn').click();
    await page.waitForTimeout(700);
    result.phases.secondDetailBootstrap = {
      url: page.url(),
      myVotesAdded: records.myVotes.length - beforeSecondDetail,
      myVotes: summarizePhaseRequests(records, 'second-detail-bootstrap'),
      voteUi: await selectedVoteSnapshot(page),
    };

    const beforeTtlExpiry = records.myVotes.length;
    state.phaseStartAtMs = Math.round(performance.now());
    state.phase = 'ttl-expired-reentry';
    await page.waitForTimeout(31_000);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await waitForList(page);
    result.phases.ttlExpiredReentry = {
      url: page.url(),
      waitMs: 31_000,
      myVotesAdded: records.myVotes.length - beforeTtlExpiry,
      myVotes: summarizePhaseRequests(records, 'ttl-expired-reentry'),
    };

    const first = records.myVotes[0] || null;
    const firstDetailRequests = records.myVotes.filter((item) => item.phase === 'first-detail-bootstrap');
    result.comparison = {
      sameUserRuntime: true,
      initialRequestGameSetFingerprint: first?.bodySetFingerprint || null,
      firstDetailRequestGameSetFingerprints: firstDetailRequests.map((item) => item.bodySetFingerprint),
      firstResponseCompletedBeforeDetail: Boolean(first && first.elapsedMs <= (result.phases.firstDetailBootstrap?.phaseStartAtMs || Infinity)),
      initialToFirstDetailAdditionalRequest: firstDetailRequests.length,
      secondDetailAdditionalRequest: records.myVotes.filter((item) => item.phase === 'second-detail-bootstrap').length,
      warmReturnReusedInitialVoteResult: result.phases.warmReturn.myVotesAdded === 0,
      secondDetailReusedVoteResult: result.phases.secondDetailBootstrap.myVotesAdded === 0,
      ttlExpiryTriggeredRefresh: result.phases.ttlExpiredReentry.myVotesAdded > 0,
      exactSamePathControl: 'warm return used the same browser context and observed no additional my-votes request',
      hydrateCurrentPath: 'not directly established by this UI flow; no product/test hook was added to force it',
    };
    result.subfinding = result.comparison.warmReturnReusedInitialVoteResult && result.comparison.secondDetailReusedVoteResult
      ? 'CANDIDATE NOT REPRODUCED IN TESTED NORMAL-RESPONSE WARM FLOW'
      : 'ADDITIONAL REQUEST OBSERVED; COMPARE REQUEST SCOPE BEFORE CLASSIFYING';
  } catch (error) {
    result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    result.records = records;
    result.counts = {
      myVotesFixtureResponses: records.myVotes.length,
      fixtureResponses: records.fixtureResponses.length,
      unmatchedLocalRequests: records.unmatchedLocalRequests.length,
      externalRequests: records.externalRequests.length,
      blockedNonReadRequests: records.blockedNonReadRequests.length,
    };
    result.safety = {
      allMyVotesDeliveredByBrowserFixture: records.myVotes.every((item) => item.delivery === 'browser-route.fulfill'),
      actualBackendRequests: 0,
      actualDatabaseRequests: 0,
      externalRequestsWereBlocked: records.externalRequests.every((item) => item.action === 'blocked'),
      otherNonReadRequestsWereBlocked: records.blockedNonReadRequests.every((item) => item.action === 'blocked'),
    };
    result.classification = result.comparison
      ? 'INCONCLUSIVE — hydrate:current comparable condition was not directly established'
      : 'INCONCLUSIVE — experiment did not complete';
    await fs.writeFile(path.join(outputRoot, 'cache-fixture-experiment.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    await page.close();
    await context.close();
    await browser.close();
  }

  console.log(JSON.stringify({
    outputRoot,
    classification: result.classification,
    counts: result.counts,
    comparison: result.comparison,
    error: result.error || null,
  }, null, 2));
  if (
    result.error
    || result.counts.unmatchedLocalRequests > 0
    || result.safety?.actualBackendRequests !== 0
    || result.safety?.actualDatabaseRequests !== 0
    || !result.safety?.allMyVotesDeliveredByBrowserFixture
  ) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
