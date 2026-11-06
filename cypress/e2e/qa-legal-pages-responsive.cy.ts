/// <reference types="cypress" />

type Theme = 'light' | 'dark';

const legalPages = [
  { id: 'terms', path: '/terms', heading: '이용약관', marker: '제1조 (목적)' },
  { id: 'privacy', path: '/privacy', heading: '개인정보처리방침', marker: '개인정보' },
] as const;

const viewports = [
  { id: 'mobile', width: 390, height: 844 },
  { id: 'desktop', width: 1440, height: 900 },
] as const;

const themes: Theme[] = ['light', 'dark'];

const finalRenderedTextLineRect = (doc: Document, contentBlock: Element): DOMRect => {
  const range = doc.createRange();
  range.selectNodeContents(contentBlock);
  const rectangles = range.getClientRects();

  expect(rectangles.length, 'final legal text has a rendered line').to.be.greaterThan(0);
  return rectangles.item(rectangles.length - 1)!;
};

describe('static legal pages responsive acceptance', () => {
  legalPages.forEach((page) => {
    viewports.forEach((viewport) => {
      themes.forEach((theme) => {
        it(`${page.id} renders at ${viewport.id} in ${theme} theme`, () => {
          cy.viewport(viewport.width, viewport.height);
          cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 401,
            body: { success: false, code: 'UNAUTHORIZED' },
          });
          cy.intercept('**/auth/reissue*', {
            statusCode: 401,
            body: { success: false, code: 'UNAUTHORIZED' },
          });

          cy.visit(page.path, {
            onBeforeLoad(win) {
              win.localStorage.setItem('kbo-theme', theme);
              win.localStorage.removeItem('bega-theme');
              win.localStorage.removeItem('theme');
              win.document.documentElement.classList.toggle('dark', theme === 'dark');
            },
          });

          cy.get('h1').should('contain.text', page.heading);
          cy.contains(page.marker).should('be.visible');
          cy.document().should((doc) => {
            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
            expect(Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth))
              .to.be.at.most(viewport.width);
          });
          cy.screenshot(`${page.id}-${viewport.id}-${theme}-top`, { capture: 'viewport' });

          cy.window().then((win) => {
            win.scrollTo(0, win.document.documentElement.scrollHeight);
          });
          cy.window().should((win) => {
            expect(win.scrollY + win.innerHeight)
              .to.be.at.least(win.document.documentElement.scrollHeight - 2);
          });
          if (viewport.id === 'mobile') {
            cy.document().then((doc) => {
              const legalContent = doc.querySelector('.simple-markdown-content');
              const legalTextBlocks = legalContent?.querySelectorAll('p, li');
              const finalLegalBlock = legalTextBlocks?.item((legalTextBlocks.length ?? 0) - 1);
              const stickyHeader = doc.querySelector('header');
              const bottomNav = doc.querySelector('[data-testid="public-mobile-bottom-nav"]');
              const win = doc.defaultView!;

              expect(finalLegalBlock, 'final legal content block').not.to.equal(null);
              expect(stickyHeader, 'sticky site header').not.to.equal(null);
              expect(bottomNav, 'mobile bottom navigation').not.to.equal(null);

              const finalTextLineBottom = finalRenderedTextLineRect(doc, finalLegalBlock!).bottom;
              const bottomNavTop = bottomNav!.getBoundingClientRect().top;
              const requestedScrollY = win.scrollY + finalTextLineBottom - (bottomNavTop - 16);
              const maxScrollY = Math.max(0, doc.documentElement.scrollHeight - win.innerHeight);

              expect(requestedScrollY, 'final legal text can be scrolled above the dock')
                .to.be.within(0, maxScrollY);
              doc.documentElement.style.scrollBehavior = 'auto';
              doc.body.style.scrollBehavior = 'auto';
              win.scrollTo(0, requestedScrollY);
            });

            cy.document().should((doc) => {
              const legalContent = doc.querySelector('.simple-markdown-content');
              const legalTextBlocks = legalContent?.querySelectorAll('p, li');
              const finalLegalBlock = legalTextBlocks?.item((legalTextBlocks.length ?? 0) - 1);
              const stickyHeader = doc.querySelector('header');
              const bottomNav = doc.querySelector('[data-testid="public-mobile-bottom-nav"]');

              expect(finalLegalBlock, 'final legal content block').not.to.equal(null);
              expect(stickyHeader, 'sticky site header').not.to.equal(null);
              expect(bottomNav, 'mobile bottom navigation').not.to.equal(null);

              const finalTextLineRect = finalRenderedTextLineRect(doc, finalLegalBlock!);
              const stickyHeaderBottom = stickyHeader!.getBoundingClientRect().bottom;
              const bottomNavTop = bottomNav!.getBoundingClientRect().top;
              expect(finalTextLineRect.top, 'final legal text line clears the sticky header by 8px')
                .to.be.at.least(stickyHeaderBottom + 8);
              expect(finalTextLineRect.bottom, 'final legal text line clears the fixed bottom navigation by 8px')
                .to.be.at.most(bottomNavTop - 8);
            });
            cy.screenshot(`${page.id}-${viewport.id}-${theme}-final-line-clear`, { capture: 'viewport' });
            cy.window().then((win) => {
              win.scrollTo(0, win.document.documentElement.scrollHeight);
            });
            cy.window().should((win) => {
              expect(win.scrollY + win.innerHeight)
                .to.be.at.least(win.document.documentElement.scrollHeight - 2);
            });
          }
          cy.screenshot(`${page.id}-${viewport.id}-${theme}-bottom`, { capture: 'viewport' });
        });
      });
    });
  });
});

export {};
