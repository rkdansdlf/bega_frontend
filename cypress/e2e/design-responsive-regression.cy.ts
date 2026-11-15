/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

const viewportWidths = [320, 390, 1280] as const;
const rootTextScales = [100, 200] as const;
const initialDate = '2026-10-07';

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function visitRoute(path: string) {
  visitHomePage({ path, authenticated: false, resetStorage: true });
}

function findLastBodyTextNode(container: HTMLElement) {
  const document = container.ownerDocument;
  const window = document.defaultView;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  let lastBodyTextNode: Node | null = null;

  while ((current = walker.nextNode())) {
    const text = current.textContent?.trim() ?? '';
    const parent = current.parentElement;
    if (!text || !parent || !parent.getClientRects().length) continue;
    if (parent.closest('button, a[href], input, select, textarea, [role="button"], [aria-hidden="true"], header, nav, svg, script, style')) {
      continue;
    }
    const style = window?.getComputedStyle(parent);
    if (!style || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') <= 0.01) {
      continue;
    }
    lastBodyTextNode = current;
  }

  return lastBodyTextNode;
}

describe('Approved Home and Stadium responsive regressions', () => {
  beforeEach(() => {
    const base = new URL(String(Cypress.config('baseUrl')));
    expect(base.hostname).to.eq('127.0.0.1');

    cy.intercept({ url: '**', middleware: true }, (request) => {
      if (new URL(request.url).origin !== base.origin) {
        request.reply({ statusCode: 204, log: false });
      }
    });
    cy.intercept('GET', '/api/**', {
      statusCode: 503,
      body: { code: 'TEST_ONLY_UNMOCKED_REQUEST' },
      log: false,
    });

    cy.intercept('GET', '/api/home/bootstrap*', (request) => {
      const date = String(request.query.date || initialDate);
      request.reply({
        statusCode: 200,
        body: {
          selectedDate: date,
          leagueStartDates: {
            regularSeasonStart: '2026-03-22',
            postseasonStart: '2026-10-06',
            koreanSeriesStart: '2026-10-26',
          },
          navigation: {
            hasPrev: true,
            hasNext: true,
            prevGameDate: shiftDate(date, -1),
            nextGameDate: shiftDate(date, 1),
          },
          games: [],
          scheduledGamesWindow: [],
          loadState: {
            isFallback: false,
            timedOut: false,
            timedOutSections: [],
            failedSections: [],
          },
        },
      });
    }).as('homeBootstrap');

    cy.intercept('GET', '/api/home/navigation*', (request) => {
      const date = String(request.query.date || initialDate);
      request.reply({
        statusCode: 200,
        body: {
          resolvedDate: date,
          prevGameDate: shiftDate(date, -1),
          nextGameDate: shiftDate(date, 1),
          hasPrev: true,
          hasNext: true,
        },
      });
    });
    cy.intercept('GET', '/api/home/widgets*', {
      statusCode: 200,
      body: {
        hotCheerPosts: [],
        featuredMates: [],
        rankingSnapshot: {
          rankingSeasonYear: 2026,
          rankingSourceMessage: 'synthetic responsive-layout fixture',
          isOffSeason: false,
          rankings: [],
        },
      },
    });
    cy.intercept('GET', '/api/stadiums', { statusCode: 200, body: [] }).as('stadiums');
    cy.intercept('GET', '/api/stadiums/*/places*', { statusCode: 200, body: [] });
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`measures first-fold Home date-control reachability at 320px / 200% text / ${theme}`, () => {
      cy.viewport(320, 844);
      visitRoute(`/home?date=${initialDate}&tab=regular`);
      cy.wait('@homeBootstrap');
      cy.document().then((document) => {
        document.documentElement.style.fontSize = '32px';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.defaultView?.scrollTo({ top: 0, behavior: 'instant' });
      });
      cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');
      cy.screenshot(`home-date-dock-first-fold-${theme}`, { capture: 'viewport' });

      cy.contains('button', '날짜 변경').should('exist').then(($button) => {
        const button = $button[0] as HTMLButtonElement;
        const document = button.ownerDocument;
        const window = document.defaultView;
        const dock = document.querySelector<HTMLElement>('[data-testid="public-mobile-bottom-nav"]');
        expect(window, 'browser window').not.to.equal(null);
        expect(dock, 'fixed mobile dock').not.to.equal(null);
        if (!window || !dock) throw new Error('browser window and fixed mobile dock are required');

        const targetRect = button.getBoundingClientRect();
        const dockRect = dock.getBoundingClientRect();
        const centerX = targetRect.left + targetRect.width / 2;
        const centerY = targetRect.top + targetRect.height / 2;
        const hitTarget = document.elementFromPoint(centerX, centerY);
        const centerReceivesTarget = hitTarget === button || button.contains(hitTarget);
        const overlapHeight = Math.max(
          0,
          Math.min(targetRect.bottom, dockRect.bottom) - Math.max(targetRect.top, dockRect.top),
        );
        const measurements = {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          rootFontSize: window.getComputedStyle(document.documentElement).fontSize,
          buttonRect: {
            top: targetRect.top,
            right: targetRect.right,
            bottom: targetRect.bottom,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          },
          dockTop: dockRect.top,
          overlapHeight,
          centerReceivesTarget,
        };

        return cy.writeFile(
          `${Cypress.config('screenshotsFolder')}/home-date-dock-reachability-${theme}.json`,
          measurements,
        ).then(() => measurements);
      }).then((measurements) => {
        expect(measurements, 'Home date-control measurements').not.to.equal(null);
        if (!measurements) return;
        expect(measurements.rootFontSize, '200% root text').to.equal('32px');
        expect(measurements.centerReceivesTarget, 'date-change target center must not be covered by the fixed dock')
          .to.equal(true);
      });
    });
  }

  for (const width of viewportWidths) {
    for (const rootTextScale of rootTextScales) {
      it(`Home keeps its title clear of the sticky navbar after date navigation at ${width}px / ${rootTextScale}% text`, () => {
        cy.viewport(width, width < 768 ? 844 : 900);
        visitRoute(`/home?date=${initialDate}&tab=regular`);
        cy.document().then((document) => {
          document.documentElement.style.fontSize = `${16 * rootTextScale / 100}px`;
        });

        cy.get('[data-testid="navbar-capsule"]', { timeout: 15000 }).should('be.visible');
        cy.get('main h1').should('be.visible');
        cy.get('[data-testid="home-date-next"]', { timeout: 15000 })
          .should('be.enabled')
          .then(($nextDate) => cy.window().then((win) => {
            const title = win.document.querySelector<HTMLElement>('main h1');
            const navbar = win.document.querySelector<HTMLElement>('[data-testid="navbar-capsule"]');
            expect(title, 'Home title').to.exist;
            expect(navbar, 'sticky navbar capsule').to.exist;

            const titleRect = title!.getBoundingClientRect();
            const navbarRect = navbar!.getBoundingClientRect();
            const maxScroll = Math.max(0, win.document.documentElement.scrollHeight - win.innerHeight);
            const overlapScrollTop = Math.min(
              maxScroll,
              Math.max(0, win.scrollY + titleRect.top - navbarRect.bottom + 2),
            );
            win.scrollTo({ top: overlapScrollTop, behavior: 'instant' });

            const overlappedTitleRect = title!.getBoundingClientRect();
            const overlapsBeforeDateNavigation = overlappedTitleRect.top < navbarRect.bottom
              && overlappedTitleRect.bottom > navbarRect.top;
            expect(overlapsBeforeDateNavigation, 'setup must reproduce title/navbar overlap').to.eq(true);
            ($nextDate[0] as HTMLButtonElement).click();
          }));
        cy.location('search').should('include', `date=${shiftDate(initialDate, 1)}`);
        cy.get('[data-testid="navbar-capsule"]', { timeout: 10000 }).should('be.visible');

        cy.get('main h1').should('be.visible').should(($title) => {
          const titleRect = $title[0].getBoundingClientRect();
          const document = $title[0].ownerDocument;
          const navbar = document.querySelector<HTMLElement>(
            '[data-testid="navbar-capsule"]',
          );
          expect(navbar, 'sticky navbar capsule').to.exist;
          const navbarRect = navbar!.getBoundingClientRect();
          const intersectsNavbar = titleRect.top < navbarRect.bottom
            && titleRect.bottom > navbarRect.top;
          expect(intersectsNavbar, 'Home title must not be obscured by the navbar').to.eq(false);
          expect(
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
            'Home has no horizontal overflow',
          ).to.be.at.most(document.defaultView!.innerWidth);
        });

        if (rootTextScale === 200) {
          cy.screenshot(`home-date-navigation-${width}-200-text`, { capture: 'viewport' });
        }
      });

      it(`Stadium Guide title and description wrap inside the page at ${width}px / ${rootTextScale}% text`, () => {
        cy.viewport(width, width < 768 ? 844 : 900);
        visitRoute('/stadium');
        cy.document().then((document) => {
          document.documentElement.style.fontSize = `${16 * rootTextScale / 100}px`;
        });
        cy.wait('@stadiums');

        cy.get('[data-testid="stadium-guide-title"]').should('be.visible');
        cy.get('[data-testid="stadium-guide-description"]').should('be.visible').then(($description) => {
          const document = $description[0].ownerDocument;
          const title = document.querySelector<HTMLElement>('[data-testid="stadium-guide-title"]')!;
          const description = $description[0];
          const hero = document.querySelector<HTMLElement>('.stadium-hero-container')!;
          const titleRect = title.getBoundingClientRect();
          const descriptionRect = description.getBoundingClientRect();
          const heroRect = hero.getBoundingClientRect();
          const viewportWidth = document.defaultView!.innerWidth;

          expect(titleRect.left, 'title stays within the hero').to.be.at.least(heroRect.left - 1);
          expect(titleRect.right, 'title stays within the hero').to.be.at.most(heroRect.right + 1);
          expect(descriptionRect.left, 'description stays within the hero').to.be.at.least(heroRect.left - 1);
          expect(descriptionRect.right, 'description stays within the hero').to.be.at.most(heroRect.right + 1);
          expect(title.scrollWidth, 'title text wraps rather than overflowing').to.be.at.most(title.clientWidth + 1);
          expect(description.scrollWidth, 'description text wraps rather than overflowing')
            .to.be.at.most(description.clientWidth + 1);
          if (width === 320) {
            const categoryIcons = Array.from(document.querySelectorAll<HTMLElement>(
              '[data-testid="stadium-guide-mobile-panels"] .stadium-guide-category-button > div:first-child',
            ));
            expect(categoryIcons.length, 'category icons are rendered for the narrow-screen check').to.be.greaterThan(0);
            const escapedCategoryIcons = categoryIcons.filter((icon) => {
              const iconRect = icon.getBoundingClientRect();
              const buttonRect = icon.parentElement!.getBoundingClientRect();
              return iconRect.left < buttonRect.left - 1 || iconRect.right > buttonRect.right + 1;
            });
            expect(escapedCategoryIcons, 'category icons stay inside their buttons on narrow screens').to.deep.equal([]);
          }
          const root = document.documentElement;
          const assertNoHorizontalOverflow = () => {
            expect(root.scrollWidth, 'document has no horizontal overflow').to.be.at.most(root.clientWidth);
          };
          if (root.scrollWidth > root.clientWidth) {
            const overflowCandidates = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
              .map((element) => {
                const rect = element.getBoundingClientRect();
                const style = document.defaultView!.getComputedStyle(element);
                const ancestors: Array<{ tag: string; className: string; left: number; right: number; width: number }> = [];
                let ancestor = element.parentElement;
                while (ancestor && ancestor !== document.body && ancestors.length < 4) {
                  const ancestorRect = ancestor.getBoundingClientRect();
                  ancestors.push({
                    tag: ancestor.tagName.toLowerCase(),
                    className: typeof ancestor.className === 'string' ? ancestor.className : '',
                    left: Math.round(ancestorRect.left * 100) / 100,
                    right: Math.round(ancestorRect.right * 100) / 100,
                    width: Math.round(ancestorRect.width * 100) / 100,
                  });
                  ancestor = ancestor.parentElement;
                }
                return {
                  tag: element.tagName.toLowerCase(),
                  testId: element.dataset.testid,
                  className: typeof element.className === 'string' ? element.className : '',
                  text: (element.innerText || '').replace(/\s+/g, ' ').slice(0, 48),
                  left: Math.round(rect.left * 100) / 100,
                  right: Math.round(rect.right * 100) / 100,
                  width: Math.round(rect.width * 100) / 100,
                  overflowX: style.overflowX,
                  position: style.position,
                  transform: style.transform,
                  ancestors,
                };
              })
              .filter((element) => element.right > root.clientWidth + 0.5)
              .sort((left, right) => right.right - left.right)
              .slice(0, 20);
            return cy.task('log', `[stadium-reflow-overflow] ${JSON.stringify({
              viewportWidth,
              clientWidth: root.clientWidth,
              scrollWidth: root.scrollWidth,
              overflowCandidates,
            })}`).then(assertNoHorizontalOverflow);
          }
          assertNoHorizontalOverflow();
        });

        if (rootTextScale === 200) {
          cy.screenshot(`stadium-guide-wrap-${width}-200-text`, { capture: 'viewport' });
        }
      });

      if (width <= 390) {
        for (const route of ['Home', 'Stadium'] as const) {
          it(`${route} keeps interactive content clear of the fixed mobile dock at ${width}px / ${rootTextScale}% text`, () => {
            cy.viewport(width, 844);
            visitRoute(route === 'Home' ? `/home?date=${initialDate}&tab=regular` : '/stadium');
            if (route === 'Home') {
              cy.wait('@homeBootstrap');
            } else {
              cy.wait('@stadiums');
            }
            cy.document().then((document) => {
              document.documentElement.style.fontSize = `${16 * rootTextScale / 100}px`;
            });
            cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');
            cy.window().then((win) => {
              win.scrollTo({ top: win.document.documentElement.scrollHeight, behavior: 'instant' });
            });
            cy.wait(100);
            cy.window().then((win) => {
              win.scrollTo({ top: win.document.documentElement.scrollHeight, behavior: 'instant' });
            });
            cy.wait(100);
            cy.window().then((win) => {
              const dock = win.document.querySelector<HTMLElement>('[data-testid="public-mobile-bottom-nav"]');
              const main = win.document.querySelector('main');
              expect(dock, 'visible fixed mobile dock').not.to.equal(null);
              expect(main, `${route} main content`).not.to.equal(null);
              if (!dock || !main) return;

              const dockRect = dock.getBoundingClientRect();
              const hiddenInteractiveElements = Array.from(
                main.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="button"]'),
              ).filter((element) => {
                const style = win.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                const visible = style.display !== 'none'
                  && style.visibility !== 'hidden'
                  && Number(style.opacity || '1') > 0.01
                  && rect.width > 0
                  && rect.height > 0
                  && rect.bottom > 0
                  && rect.top < win.innerHeight;

                return visible
                  && rect.left < dockRect.right
                  && rect.right > dockRect.left
                  && rect.top < dockRect.bottom
                  && rect.bottom > dockRect.top;
              }).map((element) => (
                element.innerText || element.getAttribute('aria-label') || element.tagName
              ).replace(/\s+/g, ' ').trim());

              expect(hiddenInteractiveElements, `${route} interactive elements under fixed dock at page end`)
                .to.deep.equal([]);
            });
          });

          for (const theme of ['dark', 'light'] as const) {
            it(`${route} final footer text clears the fixed mobile dock at ${width}px / ${rootTextScale}% text / ${theme}`, () => {
              cy.viewport(width, 844);
              visitRoute(route === 'Home' ? `/home?date=${initialDate}&tab=regular` : '/stadium');
              if (route === 'Home') {
                cy.wait('@homeBootstrap');
              } else {
                cy.wait('@stadiums');
              }
              cy.document().then((document) => {
                document.documentElement.style.fontSize = `${16 * rootTextScale / 100}px`;
                if (document.documentElement.classList.contains('dark') !== (theme === 'dark')) {
                  cy.get('header button[aria-label="메뉴 열기"]').click();
                  const themeAction = theme === 'dark' ? '다크 모드로 변경' : '라이트 모드로 변경';
                  cy.get('#mobile-menu-popup').should('be.visible')
                    .find(`button[aria-label="${themeAction}"]`).click();
                  cy.get('header button[aria-label="메뉴 닫기"]')
                    .should('have.attr', 'aria-expanded', 'true').click();
                }
              });
              cy.document().should((document) => {
                expect(document.documentElement.classList.contains('dark'), 'requested theme is active')
                  .to.equal(theme === 'dark');
              });
              cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');

              cy.window().then((win) => {
                const scroller = win.document.scrollingElement ?? win.document.documentElement;
                win.scrollTo({ top: Math.max(0, scroller.scrollHeight - win.innerHeight), behavior: 'instant' });
              });
              cy.wait(100);
              cy.get('[data-testid="site-footer"]', { timeout: 15000 }).should('be.visible').then(($footer) => {
                const lastBodyTextNode = findLastBodyTextNode($footer[0]);
                expect(lastBodyTextNode, `${route} rendered footer copy`).not.to.equal(null);
                lastBodyTextNode?.parentElement?.scrollIntoView({
                  block: 'end',
                  inline: 'nearest',
                  behavior: 'instant',
                });
              });
              cy.wait(50);
              cy.window().then((win) => {
                const scroller = win.document.scrollingElement ?? win.document.documentElement;
                const maxScroll = scroller.scrollHeight - win.innerHeight;
                win.scrollTo({ top: Math.max(0, maxScroll), behavior: 'instant' });
              });
              cy.wait(50);
              cy.window().then((win) => {
                const dock = win.document.querySelector<HTMLElement>('[data-testid="public-mobile-bottom-nav"]');
                const footer = win.document.querySelector<HTMLElement>('[data-testid="site-footer"]');
                expect(dock, 'visible fixed mobile dock').not.to.equal(null);
                expect(footer, `${route} site footer`).not.to.equal(null);
                if (!dock || !footer) return;
                const lastBodyTextNode = findLastBodyTextNode(footer);
                expect(lastBodyTextNode, `${route} final footer text`).not.to.equal(null);
                if (!lastBodyTextNode) return;

                const range = win.document.createRange();
                range.selectNodeContents(lastBodyTextNode);
                const fragments = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
                const finalTextLine = fragments.at(-1);
                expect(finalTextLine, `${route} final body-text line is measurable`).not.to.equal(undefined);
                if (!finalTextLine) return;

                expect(finalTextLine.bottom, `${route} final footer line remains inside the viewport`)
                  .to.be.greaterThan(0);
                expect(finalTextLine.top, `${route} final footer line remains inside the viewport`)
                  .to.be.lessThan(win.innerHeight);
                const clearance = dock.getBoundingClientRect().top - finalTextLine.bottom;
                const measurement = {
                  route,
                  theme,
                  viewportWidth: win.innerWidth,
                  rootTextScale,
                  rootFontSize: win.getComputedStyle(win.document.documentElement).fontSize,
                  scrollY: win.scrollY,
                  documentScrollHeight: (win.document.scrollingElement ?? win.document.documentElement).scrollHeight,
                  finalTextLineTop: finalTextLine.top,
                  finalTextLineBottom: finalTextLine.bottom,
                  dockTop: dock.getBoundingClientRect().top,
                  clearance,
                };
                expect(clearance, `${route} final footer line clears the dock by at least 8px`)
                  .to.be.at.least(8);
                cy.writeFile(
                  `${Cypress.config('screenshotsFolder')}/bottom-clearance-${route.toLowerCase()}-${width}-${rootTextScale}-${theme}.json`,
                  measurement,
                );
                if (rootTextScale === 200) {
                  cy.screenshot(`bottom-clearance-${route.toLowerCase()}-${width}-${theme}-200-text`, { capture: 'viewport' });
                }
              });
            });
          }
        }
      }
    }
  }
});
