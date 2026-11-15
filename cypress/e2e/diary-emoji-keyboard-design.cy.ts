/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

describe('Diary emoji rail keyboard reachability, synthetic', () => {
  for (const width of [320, 390]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / 32px / ${theme}`, () => {
      const origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const user = { id: 9221, email: 'diary-visual@example.invalid', name: 'Synthetic Diary',
        handle: 'synthetic-diary', favoriteTeam: 'HH', role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
      const observations: Array<Record<string, unknown>> = [], findings: string[] = [], writes: string[] = [];
      cy.intercept({ url: '**', middleware: true }, (req) => {
        const url = new URL(req.url);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          writes.push(`${req.method} ${url.pathname}`);
          return req.reply({ statusCode: 503, body: {} });
        }
        if (url.origin !== origin) return req.reply({ forceNetworkError: true, log: false });
      });
      cy.intercept('**/api/**', { statusCode: 503, body: {} });
      cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: user } });
      cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
      cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/diary/entries*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/diary/games*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/diary/statistics*', { statusCode: 200, body: { totalCount: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, winRate: 0, monthlyCount: 0, yearlyCount: 0, yearlyWins: 0, yearlyWinRate: 0, mostVisitedStadium: null, mostVisitedCount: 0, happiestMonth: null, happiestCount: 0, firstDiaryDate: null, cheerPostCount: 0, mateParticipationCount: 0, earnedBadges: [], opponentWinRates: {}, dayOfWeekStats: {}, monthlyVisitCounts: {}, stadiumVisitCounts: {}, currentWinStreak: 0, longestWinStreak: 0, currentLossStreak: 0 } });
      cy.clock(new Date('2024-05-15T12:00:00+09:00').getTime(), ['Date']);
      cy.viewport(width, 844);
      cy.visit('/mypage?view=diaryEditor&date=2024-05-15', { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear();
        seedCypressAuthState(win, user, undefined, { theme });
        win.document.documentElement.classList.toggle('dark', theme === 'dark');
        win.document.documentElement.style.fontSize = '32px';
        win.document.documentElement.style.scrollBehavior = 'auto';
      } });
      cy.get('[data-testid="diary-edit-runtime-ready"]', { timeout: 20000 }).should('exist');
      cy.get('.diary-emoji-rail button').should('have.length.greaterThan', 1).then(($buttons) => {
        const first = $buttons[0]; first.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); first.focus();
      });
      cy.get('.diary-emoji-rail button').then(($buttons) => {
        for (let i = 1; i < $buttons.length; i++) {
          cy.press(Cypress.Keyboard.Keys.TAB);
          cy.wait(350, { log: false });
          cy.get('.diary-emoji-rail button').eq(i).then(($button) => {
            const el = $button[0], doc = el.ownerDocument, rail = el.closest('.diary-emoji-rail')!;
            const r = el.getBoundingClientRect(), box = rail.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            const focused = doc.activeElement === el, centerClear = hit === el || Boolean(hit && el.contains(hit));
            const insideRail = r.left >= box.left - 1 && r.right <= box.right + 1;
            observations.push({ index: i, text: el.textContent, focused, centerClear, insideRail, left: r.left, right: r.right, railLeft: box.left, railRight: box.right, scrollLeft: rail.scrollLeft });
            if (!focused || !centerClear || !insideRail) findings.push(`item ${i}: focus/visibility`);
          });
        }
      });
      cy.screenshot(`diary-emoji-${width}-32-${theme}`, { capture: 'viewport' });
      cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/diary-emoji-${width}-32-${theme}.json`, { width, theme, observations, findings, writes }));
      cy.then(() => { expect(writes).to.deep.equal([]); expect(findings).to.deep.equal([]); });
    });
  }
});
