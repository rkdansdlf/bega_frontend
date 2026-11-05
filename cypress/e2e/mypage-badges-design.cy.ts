/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('My Page badge read states with non-production diary fixtures', () => {
  const pressureOnly = Cypress.expose('badgePressureOnly') === true;
  for (const width of pressureOnly ? [320, 390] : [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const viewer = { id: 990120, email: 'badges-ui@example.invalid', name: '합성 작성자', handle: 'synthetic_badge_viewer',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
      const catalog = '[data-testid="mypage-badge-catalog"]', showcase = '[data-testid="mypage-badge-showcase"]';
      const badges = `${showcase} .mypage-season-badge`, values = `${catalog} .mypage-season-stat-value`;
      const badgeIds = ['ticket', 'flame', 'map-pin', 'sparkles', 'crown'], names = ['첫 직관', '불꽃 응원단', '구장 마스터', '승리요정', '레전드'];
      // Fictional diary records only; these are not real games, teams, venues or baseball facts.
      const fixture = (count: number, wins: number, earnedBadges: string[]) => {
        const entries = Array.from({ length: count }, (_, index) => ({ id: 990500 + index,
          date: new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10), type: 'attended', emoji: 'SYNTHETIC', emojiName: '최고',
          winningName: index < wins ? 'WIN' : 'LOSE', gameId: 990600 + index, memo: '합성 UI 기록', photos: [],
          team: 'SYNTH_TEAM', stadium: `SYNTH_STADIUM_${index % 3}`, gameScope: 'home' }));
        const stadiumVisitCounts = entries.reduce<Record<string, number>>((acc, entry) => { acc[entry.stadium] = (acc[entry.stadium] ?? 0) + 1; return acc; }, {});
        const statistics = { totalCount: count, totalWins: wins, totalLosses: count - wins, totalDraws: 0, winRate: count ? wins / count * 100 : 0,
          monthlyCount: 0, yearlyCount: 0, yearlyWins: 0, yearlyWinRate: 0, mostVisitedStadium: count ? 'SYNTH_STADIUM_0' : null,
          mostVisitedCount: count ? stadiumVisitCounts.SYNTH_STADIUM_0 : 0, monthlyVisitCounts: count ? { '2020-01': Math.min(31, count), ...(count > 31 ? { '2020-02': count - 31 } : {}) } : {},
          stadiumVisitCounts, homeVisitCount: count, awayVisitCount: 0, scheduledCount: 0, happiestMonth: count ? '2020-01' : null,
          happiestCount: Math.min(31, count), firstDiaryDate: count ? '2020-01-01' : null, cheerPostCount: 0, mateParticipationCount: 0,
          currentWinStreak: 0, longestWinStreak: wins, currentLossStreak: count - wins, opponentWinRates: {}, bestOpponent: '', worstOpponent: '',
          dayOfWeekStats: {}, luckyDay: '', earnedBadges };
        return { entries, statistics };
      };
      const empty = fixture(0, 0, []), partial = fixture(10, 5, badgeIds.slice(0, 3)), full = fixture(50, 30, badgeIds);
      const reads: string[] = [], mutations: string[] = [], unexpected: string[] = [], findings: string[] = [];
      const observations: Array<Record<string, unknown>> = [];
      let mode: 'error' | 'empty' | 'partial' | 'full' = 'error', foreignBlocked = 0, profileReads = 0, finished = false, release!: () => void;
      const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/badges-${id}.json`, {
        width, font, theme, pressureOnly, reads, mutations, unexpected, findings, observations, foreignBlocked, profileReads, finished,
      }));
      cy.intercept({ url: '**', middleware: true }, (req) => {
        const url = new URL(req.url);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          mutations.push(`${req.method} ${url.href}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
        }
        if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
        if (!['/mypage', '/offline.html'].includes(url.pathname) && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
          && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
          unexpected.push(`route:${url.pathname}`); return req.reply({ statusCode: 503, body: {} });
        }
      });
      cy.intercept('**/api/**', (req) => { unexpected.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
      cy.intercept('**/auth/**', (req) => { unexpected.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
      cy.intercept('GET', `${origin}/api/auth/mypage`, (req) => { profileReads++; req.reply({ body: { success: true, data: toAuthApiUser(viewer) } }); });
      cy.intercept('GET', `${origin}/api/users/me/follow-counts`, { body: { followerCount: 0, followingCount: 0 } });
      cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
      cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
      cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
      cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
      for (const endpoint of ['entries', 'statistics']) cy.intercept('GET', `${origin}/api/diary/${endpoint}`, (req) => {
        reads.push(`${mode}:${endpoint}`); req.alias = endpoint;
        if (mode === 'error') return gate.then(() => req.reply(endpoint === 'entries'
          ? { body: [] } : { statusCode: 503, body: { message: '합성 배지 통계 조회 실패' } }));
        const data = mode === 'empty' ? empty : mode === 'partial' ? partial : full;
        return req.reply({ body: endpoint === 'entries' ? data.entries : data.statistics });
      });
      const visit = () => cy.visit('/mypage?view=badges', { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
      } });
      const align = (selector: string) => cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
      const sample = (selector: string, state: string) => {
        align(selector); cy.get(selector).then(async ($el) => { await $el[0].ownerDocument.fonts.ready; });
        cy.get(selector).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          const outer = doc.querySelector('.mypage-season-view-scope')!.getBoundingClientRect();
          const escaped = Array.from(el.querySelectorAll<HTMLElement>('.mypage-season-stat-card,.mypage-season-badge,.mypage-season-list-row')).flatMap((node) => {
            const nr = node.getBoundingClientRect(); return nr.left < r.left - 1 || nr.right > r.right + 1 ? [{ className: node.className, width: nr.width }] : [];
          });
          observations.push({ state, panelLeft: r.left, panelRight: r.right, outerLeft: outer.left, outerRight: outer.right, escaped });
          if (r.left < outer.left - 1 || r.right > outer.right + 1 || escaped.length) findings.push(`${state}: horizontal overflow`);
        }); persist(); cy.screenshot(`badges-${id}-${state}`, { capture: 'viewport' });
      };
      const assertBadges = (data: typeof empty) => {
        const earned = data.statistics.earnedBadges;
        cy.get(badges).should(($cards) => {
          expect($cards).to.have.length(5);
          Array.from($cards).forEach((card, index) => {
            const expected = earned.includes(badgeIds[index]);
            expect(card.getAttribute('data-earned')).to.equal(String(expected));
            expect(card.querySelector('.mypage-season-badge-name')?.textContent).to.equal(names[index]);
            expect(card.querySelector('.mypage-season-badge-state')?.textContent?.trim()).to.equal(expected ? '획득 완료' : '미획득');
            expect(card.querySelectorAll('.mypage-season-badge-lock')).to.have.length(expected ? 0 : 1);
          });
        });
        cy.get(values).should(($values) => expect(Array.from($values).map((node) => node.textContent?.replace(/\s+/g, ''))).to.deep.equal([
          `${earned.length / 5 * 100}%`, `${data.statistics.totalCount}회`, `${Object.keys(data.statistics.stadiumVisitCounts).length}곳`, `${data.statistics.winRate.toFixed(0)}%`,
        ]));
      };
      const criteria = (state: string) => cy.get(`${badges} .mypage-season-badge-desc`).should('have.length', 5).then(($nodes) => {
        const clipped = Array.from($nodes).flatMap((el, index) => el.scrollHeight > el.clientHeight + 1
          ? [{ index, text: el.textContent, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, width: el.getBoundingClientRect().width }] : []);
        const fragments: Array<{ index: number; word: string; lines: number }> = [];
        let wordCount = 0;
        Array.from($nodes).forEach((el, index) => {
          const doc = el.ownerDocument, walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let localWords = 0;
          while (walker.nextNode()) for (const match of (walker.currentNode.textContent ?? '').matchAll(/\S+/gu)) {
            localWords++; wordCount++;
            const range = doc.createRange(); range.setStart(walker.currentNode, match.index!); range.setEnd(walker.currentNode, match.index! + match[0].length);
            const lines = new Set(Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0).map((r) => Math.round(r.top * 10)));
            if (lines.size !== 1) fragments.push({ index, word: match[0], lines: lines.size });
          }
          expect(localWords).to.be.greaterThan(0);
        });
        observations.push({ state: `${state}-criteria`, clipped, fragments, wordCount });
        if (clipped.length) findings.push(`${state}: clipped badge criteria`);
        if (fragments.length) findings.push(`${state}: fragmented badge criteria`);
      });
      cy.viewport(width, width === 1280 ? 900 : 844); visit();
      cy.contains('배지 도감을 불러오는 중...').should('exist'); cy.get(catalog).should('not.exist'); sample('.mypage-season-view-scope', 'held');
      cy.then(() => release()); cy.wait('@entries'); cy.wait('@statistics'); cy.wait('@statistics');
      cy.get(catalog).should('exist'); assertBadges(empty); sample(catalog, 'failed-overview');
      cy.get(catalog).then(($el) => {
        const hasFailure = /불러오지 못|실패|오류/.test($el.text()); observations.push({ state: 'failure-status', hasFailure, earned: 0 });
        if (!hasFailure) findings.push('statistics503: zero/unearned catalogue without failure message');
      });
      for (const [nextMode, data] of [['empty', empty], ['partial', partial], ['full', full]] as const) {
        cy.then(() => { mode = nextMode; }); visit(); cy.wait('@entries'); cy.wait('@statistics'); assertBadges(data);
        sample(catalog, `${nextMode}-overview`); sample(showcase, `${nextMode}-badges`); criteria(nextMode);
      }
      const tail = `${catalog} .mypage-season-list-row`;
      sample(tail, 'full-tail'); cy.get(tail).then(($el) => {
        const el = $el[0], doc = el.ownerDocument, r = el.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const clear = Boolean(hit && (hit === el || el.contains(hit)));
        observations.push({ state: 'tail-reach', clear, copy: el.textContent }); if (!clear) findings.push('tail: aligned center occluded');
      });
      cy.then(() => {
        expect(reads.filter((value) => value.endsWith(':entries'))).to.deep.equal(['error:entries','empty:entries','partial:entries','full:entries']);
        expect(reads.filter((value) => value.endsWith(':statistics'))).to.deep.equal(['error:statistics','error:statistics','empty:statistics','partial:statistics','full:statistics']);
        expect(mutations).to.deep.equal([]); expect(unexpected).to.deep.equal([]); finished = true;
      }); persist(); cy.then(() => expect(findings, 'bounded design findings').to.deep.equal([]));
    });
  }
});
