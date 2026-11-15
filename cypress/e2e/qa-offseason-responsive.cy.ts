/// <reference types="cypress" />

type Theme = 'light' | 'dark';

const viewports: Array<{ id: string; width: number; height: number; rootFontSize?: number }> = [
  { id: 'mobile', width: 390, height: 844 },
  { id: 'mobile-320-200-text', width: 320, height: 844, rootFontSize: 32 },
  { id: 'desktop', width: 1400, height: 900 },
];

const themes: Theme[] = ['light', 'dark'];

const scrollToCenterAndExpectHit = (element: HTMLElement) => {
  const document = element.ownerDocument;
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';

  try {
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });

    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const viewportHeight = document.defaultView?.innerHeight ?? 0;

    expect(rect.left, 'target left edge').to.be.at.least(0);
    expect(rect.right, 'target right edge').to.be.at.most(document.documentElement.clientWidth);
    expect(rect.top, 'target top edge').to.be.at.least(0);
    expect(rect.bottom, 'target bottom edge').to.be.at.most(viewportHeight);
    expect(hit === element || element.contains(hit), 'target center receives pointer hit').to.eq(true);
  } finally {
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  }
};

describe('offseason home empty-data responsive visual QA', () => {
  viewports.forEach((viewport) => {
    themes.forEach((theme) => {
      it(`renders the route at ${viewport.id} in ${theme} theme without layout overflow`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.intercept('GET', '**/auth/mypage*', {
          statusCode: 401,
          body: { success: false, code: 'UNAUTHORIZED' },
        });
        cy.intercept('**/auth/reissue*', {
          statusCode: 401,
          body: { success: false, code: 'UNAUTHORIZED' },
        });
        cy.intercept('https://**', { forceNetworkError: true });

        // Empty fixtures keep the check focused on layout, not baseball facts.
        cy.intercept('GET', '**/kbo/offseason/movements*', {
          statusCode: 200,
          body: [],
        }).as('offseasonMovements');
        cy.intercept('GET', '**/kbo/offseason/metadata*', {
          statusCode: 200,
          body: { awards: [] },
        }).as('offseasonMetadata');
        cy.intercept('GET', '**/kbo/rankings/2025*', {
          statusCode: 200,
          body: [],
        }).as('offseasonRankings');

        cy.visit('/offseason', {
          onBeforeLoad(win) {
            win.localStorage.setItem('kbo-theme', theme);
            win.localStorage.removeItem('bega-theme');
            win.localStorage.removeItem('theme');
            win.document.documentElement.classList.toggle('dark', theme === 'dark');
            if (viewport.rootFontSize) {
              win.document.documentElement.style.fontSize = `${viewport.rootFontSize}px`;
            }
          },
        });

        cy.wait('@offseasonMovements');
        cy.wait('@offseasonMetadata');
        cy.wait('@offseasonRankings');
        cy.get('[data-testid="offseason-home-primary-runtime"]').should('be.visible');
        cy.contains('h2', '스토브리그 하이라이트').should('be.visible');
        cy.screenshot(`offseason-home-${viewport.id}-${theme}-top`, { capture: 'viewport' });
        if (viewport.rootFontSize === 32) {
          cy.window().then((win) => win.scrollTo(0, 0));
          cy.contains('h2', '스토브리그 하이라이트').then(($heading) => {
            const heading = $heading[0] as HTMLElement;
            const document = heading.ownerDocument;
            const range = document.createRange();
            range.selectNodeContents(heading);
            const titleLineCount = Array.from(range.getClientRects())
              .filter((rect) => rect.width > 0 && rect.height > 0).length;
            const intro = heading.nextElementSibling as HTMLElement | null;
            const dock = document.querySelector<HTMLElement>('[data-testid="public-mobile-bottom-nav"]');

            expect(dock, 'Offseason fixed public dock').not.to.equal(null);
            expect(intro, 'Offseason hero intro copy').not.to.equal(null);
            expect(titleLineCount, 'Offseason hero title stays within two lines at 200% text').to.be.at.most(2);
            if (!intro || !dock) return;

            expect(
              intro.getBoundingClientRect().bottom,
              'Offseason hero intro remains above the fixed dock at 320px / 32px',
            ).to.be.at.most(dock.getBoundingClientRect().top - 8);
          });
        }
        cy.document().should((doc) => {
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          expect(Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth))
            .to.be.at.most(viewport.width);
        });

        cy.window().then((win) => {
          win.scrollTo(0, win.document.documentElement.scrollHeight);
        });
        cy.window().should((win) => {
          expect(win.scrollY + win.innerHeight)
            .to.be.at.least(win.document.documentElement.scrollHeight - 2);
        });
        cy.screenshot(`offseason-home-${viewport.id}-${theme}-bottom`, { capture: 'viewport' });

        if (viewport.rootFontSize) {
          cy.get('[data-testid="offseason-home-list-link"]').should('be.visible').then(($target) => {
            scrollToCenterAndExpectHit($target[0] as HTMLButtonElement);
          });
          cy.screenshot(`offseason-home-${viewport.id}-${theme}-list-link-centered`, { capture: 'viewport' });
          cy.get('[data-testid="offseason-home-list-link"]').click();
          cy.location('pathname').should('eq', '/offseason/list');
        }
      });
    });
  });

  viewports.forEach((viewport) => {
    themes.forEach((theme) => {
      it(`renders the movement list at ${viewport.id} in ${theme} theme without layout overflow`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.intercept('GET', '**/auth/mypage*', {
          statusCode: 401,
          body: { success: false, code: 'UNAUTHORIZED' },
        });
        cy.intercept('**/auth/reissue*', {
          statusCode: 401,
          body: { success: false, code: 'UNAUTHORIZED' },
        });
        cy.intercept('https://**', { forceNetworkError: true });
        cy.intercept('GET', '**/kbo/offseason/movements*', {
          statusCode: 200,
          body: [],
        }).as('offseasonListMovements');

        cy.visit('/offseason/list', {
          onBeforeLoad(win) {
            win.localStorage.setItem('kbo-theme', theme);
            win.localStorage.removeItem('bega-theme');
            win.localStorage.removeItem('theme');
            win.document.documentElement.classList.toggle('dark', theme === 'dark');
            if (viewport.rootFontSize) {
              win.document.documentElement.style.fontSize = `${viewport.rootFontSize}px`;
            }
          },
        });

        cy.wait('@offseasonListMovements');
        cy.get('[data-testid="offseason-list-runtime"]').should('be.visible');
        cy.contains('h1', 'KBO 스토브리그').should('be.visible');
        cy.contains('h2', '이적 타임라인').should('be.visible');
        cy.document().should((doc) => {
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          expect(Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth))
            .to.be.at.most(viewport.width);
        });
        cy.screenshot(`offseason-list-${viewport.id}-${theme}-top`, { capture: 'viewport' });

        cy.window().then((win) => {
          win.scrollTo(0, win.document.documentElement.scrollHeight);
        });
        cy.window().should((win) => {
          expect(win.scrollY + win.innerHeight)
            .to.be.at.least(win.document.documentElement.scrollHeight - 2);
        });
        cy.screenshot(`offseason-list-${viewport.id}-${theme}-bottom`, { capture: 'viewport' });

        if (viewport.rootFontSize) {
          cy.get('[data-testid="offseason-big-only"]').click();
          cy.contains('button', '필터 초기화').should('be.visible').then(($target) => {
            scrollToCenterAndExpectHit($target[0] as HTMLButtonElement);
          });
          cy.screenshot(`offseason-list-${viewport.id}-${theme}-empty-reset-centered`, { capture: 'viewport' });
          cy.contains('button', '필터 초기화').click();
          cy.get('[data-testid="offseason-big-only"]').should('have.attr', 'aria-pressed', 'false');
        }
      });
    });
  });
});

export {};
