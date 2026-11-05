/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

const viewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
] as const;
const themes = ['light', 'dark'] as const;
const rootFontSizes = [16, 32] as const;
const syntheticUser = {
  id: 9217,
  email: 'visual-chatbot@example.invalid',
  name: 'Visual Chatbot User',
  handle: 'visual-chatbot-user',
  favoriteTeam: 'HH',
  role: 'ROLE_USER',
  hasPassword: true,
  profileImageUrl: null,
};
const emptyScopedStatistics = {
  totalCount: 0,
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  winRate: 0,
  mostVisitedStadium: null,
  mostVisitedCount: 0,
  monthlyVisitCounts: {},
  homeVisitCount: 0,
  awayVisitCount: 0,
  scheduledCount: 0,
  emojiCounts: {},
  opponentWinRates: {},
};

describe('My Page chatbot tab responsive layout', () => {
  for (const viewport of viewports) {
    for (const theme of themes) {
      for (const rootFontSize of rootFontSizes) {
        it(`keeps all three tabs visible at ${viewport.width}px, ${rootFontSize}px text, ${theme} theme`, () => {
          cy.viewport(viewport.width, viewport.height);
          const appUrl = new URL(String(Cypress.config('baseUrl')));
          expect(['127.0.0.1', 'host.docker.internal']).to.include(appUrl.hostname);
          expect(appUrl.protocol, 'responsive visual test uses local HTTP').to.eq('http:');
          expect(appUrl.port, 'responsive visual test uses an explicit local port').to.match(/^\d+$/);
          const appOrigin = appUrl.origin;

          cy.intercept({ url: '**', middleware: true }, (request) => {
            if (new URL(request.url).origin !== appOrigin) {
              request.reply({ statusCode: 204, body: '', log: false });
            }
          });
          cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 200,
            body: { success: true, data: syntheticUser },
          });
          cy.intercept('GET', '**/api/diary/entries*', { statusCode: 200, body: [] });
          cy.intercept('GET', '**/api/diary/statistics*', {
            statusCode: 200,
            body: {
              totalCount: 0,
              totalWins: 0,
              totalLosses: 0,
              totalDraws: 0,
              winRate: 0,
              monthlyCount: 0,
              yearlyCount: 0,
              yearlyWins: 0,
              yearlyWinRate: 0,
              mostVisitedStadium: null,
              mostVisitedCount: 0,
              monthlyVisitCounts: {},
              stadiumVisitCounts: {},
              homeVisitCount: 0,
              awayVisitCount: 0,
              scheduledCount: 0,
              happiestMonth: null,
              happiestCount: 0,
              firstDiaryDate: null,
              cheerPostCount: 0,
              mateParticipationCount: 0,
              emojiCounts: {},
              scopedStatistics: {
                all: emptyScopedStatistics,
                home: emptyScopedStatistics,
                away: emptyScopedStatistics,
              },
              currentWinStreak: 0,
              longestWinStreak: 0,
              currentLossStreak: 0,
              opponentWinRates: {},
              bestOpponent: '',
              worstOpponent: '',
              dayOfWeekStats: {},
              luckyDay: '',
              earnedBadges: [],
            },
          });
          cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
          cy.intercept('GET', '**/api/notifications/my/unread-count', { statusCode: 200, body: 0 });
          cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
          cy.intercept('GET', '**/ai/chat/sessions*', { statusCode: 200, body: { success: true, data: [] } });
          cy.intercept('GET', '**/ai/chat/favorites*', { statusCode: 200, body: { success: true, data: [] } });

          visitHomePage({
            path: '/mypage',
            authenticated: true,
            resetStorage: true,
            user: syntheticUser,
          });
          cy.window().then((win) => {
            win.localStorage.setItem('kbo-theme', theme);
            win.document.documentElement.classList.toggle('dark', theme === 'dark');
            win.document.documentElement.style.fontSize = `${rootFontSize}px`;
          });

          const launcher = viewport.width <= 768
            ? '[data-testid="auth-mobile-chatbot-tab"]'
            : '[data-testid="chatbot-request-launcher"]';
          cy.get(launcher, { timeout: 20000 }).should('be.visible').click({ force: true });
          cy.get('[data-testid="chatbot-panel"]', { timeout: 20000 }).should('be.visible');
          cy.get('[data-testid="chatbot-session-state"]').should(($header) => {
            const header = $header[0] as HTMLElement;
            const document = header.ownerDocument;
            const closeButton = header.querySelector<HTMLButtonElement>(
              '[data-testid="chatbot-session-close"]',
            );
            const brandTitle = header.querySelector<HTMLElement>('h3');
            const sessionTitle = header.querySelector<HTMLElement>('[data-testid="chatbot-session-title"]');
            const betaBadge = Array.from(header.querySelectorAll<HTMLElement>('span'))
              .find((element) => element.textContent?.trim() === 'Beta');
            expect(closeButton, 'chatbot close button is present').not.to.equal(null);
            expect(brandTitle, 'chatbot brand title is present').not.to.equal(null);
            expect(sessionTitle, 'chatbot session subtitle is present').not.to.equal(null);
            expect(betaBadge, 'chatbot Beta badge is present').not.to.equal(undefined);

            const headerRect = header.getBoundingClientRect();
            const closeRect = closeButton!.getBoundingClientRect();
            const betaRect = betaBadge!.getBoundingClientRect();
            const panel = header.closest<HTMLElement>('[data-testid="chatbot-panel"]');
            const panelRect = panel?.getBoundingClientRect();
            const ancestorGeometry: string[] = [];
            for (let element: HTMLElement | null = header; element; element = element.parentElement) {
              const rect = element.getBoundingClientRect();
              ancestorGeometry.push(
                `${element.tagName}.${element.className}(${rect.left},${rect.width};sx=${element.scrollLeft}/${element.scrollWidth};transform=${getComputedStyle(element).transform})`,
              );
              if (element === panel) break;
            }
            const geometryContext = `header left=${headerRect.left}, width=${headerRect.width}; panel left=${panelRect?.left}, width=${panelRect?.width}; scrollX=${document.defaultView?.scrollX}, documentWidth=${document.documentElement.scrollWidth}, viewportWidth=${document.documentElement.clientWidth}; ancestors=${ancestorGeometry.join(' > ')}`;
            expect(headerRect.left, `chatbot header starts inside the viewport (${geometryContext})`).to.be.at.least(-1);
            expect(headerRect.right, 'chatbot header ends inside the viewport')
              .to.be.at.most(document.documentElement.clientWidth + 1);
            expect(closeRect.left, 'chatbot close button is not clipped on the left')
              .to.be.at.least(headerRect.left - 1);
            expect(closeRect.right, 'chatbot close button is fully inside the header')
              .to.be.at.most(headerRect.right + 1);
            expect(betaRect.left, 'chatbot Beta badge is fully inside the header')
              .to.be.at.least(headerRect.left - 1);
            expect(betaRect.right, 'chatbot Beta badge is fully inside the header')
              .to.be.at.most(headerRect.right + 1);

            if (rootFontSize === 32 && viewport.width <= 390) {
              const titleRange = document.createRange();
              titleRange.selectNodeContents(brandTitle!);
              const titleLineCount = Array.from(titleRange.getClientRects())
                .filter((rect) => rect.width > 0 && rect.height > 0).length;
              expect(brandTitle!.textContent?.trim(), 'full brand title remains available')
                .to.equal('야구 가이드 BEGA');
              expect(titleLineCount, `brand title uses no more than two lines (${geometryContext})`)
                .to.be.at.most(2);
              expect(sessionTitle!.scrollWidth, 'session subtitle is not ellipsized at large text')
                .to.be.at.most(sessionTitle!.clientWidth + 1);
            }
          });
          cy.get('[role="tablist"][aria-label="챗봇 보기"]', { timeout: 20000 }).should(($tablist) => {
            const list = $tablist[0] as HTMLElement;
            const document = list.ownerDocument;
            const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

            expect(tabs, 'all chatbot tabs are rendered together').to.have.length(3);
            expect(list.scrollWidth, 'tablist has no horizontal overflow').to.be.at.most(list.clientWidth + 1);

            const listRect = list.getBoundingClientRect();
            expect(listRect.left, 'tablist stays inside the viewport').to.be.at.least(-1);
            expect(listRect.right, 'tablist stays inside the viewport')
              .to.be.at.most(document.documentElement.clientWidth + 1);
            tabs.forEach((tab) => {
              const tabRect = tab.getBoundingClientRect();
              const label = tab.querySelector('span');
              expect(tabRect.left, `${tab.dataset.testid} stays inside the tablist`).to.be.at.least(listRect.left - 1);
              expect(tabRect.right, `${tab.dataset.testid} stays inside the tablist`).to.be.at.most(listRect.right + 1);
              expect(label, `${tab.dataset.testid} has its text label`).not.to.equal(null);
              expect(label!.scrollWidth, `${tab.dataset.testid} label is not clipped`)
                .to.be.at.most(label!.clientWidth + 1);
              expect(label!.scrollHeight, `${tab.dataset.testid} label is not vertically clipped`)
                .to.be.at.most(label!.clientHeight + 1);
            });

            expect(document.documentElement.scrollWidth, 'document has no horizontal overflow')
              .to.be.at.most(document.documentElement.clientWidth);
          });

          for (const tabId of [
            'chatbot-tab-conversation',
            'chatbot-tab-history',
            'chatbot-tab-favorites',
          ]) {
            cy.getBySel(tabId).should('be.visible').click({ force: true })
              .should('have.attr', 'aria-selected', 'true');
          }
          if (rootFontSize === 32) {
            cy.screenshot(`mypage-chatbot-tabs/${viewport.width}px-${theme}-32px`, { capture: 'viewport' });
          }
        });
      }
    }
  }
});
