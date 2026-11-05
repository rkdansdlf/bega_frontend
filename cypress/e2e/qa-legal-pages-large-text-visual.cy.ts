/// <reference types="cypress" />

type Theme = 'light' | 'dark';

const legalPages = [
  { id: 'terms', path: '/terms', heading: '이용약관', marker: '제1조 (목적)' },
  { id: 'privacy', path: '/privacy', heading: '개인정보처리방침', marker: '개인정보' },
] as const;

const viewports = [
  { id: 'mobile-320-large', width: 320, height: 844, rootTextSize: 32, mobile: true },
  { id: 'mobile-390-large', width: 390, height: 844, rootTextSize: 32, mobile: true },
  { id: 'desktop-1280-normal', width: 1280, height: 900, rootTextSize: 16, mobile: false },
  { id: 'desktop-1280-large', width: 1280, height: 900, rootTextSize: 32, mobile: false },
] as const;

const themes: Theme[] = ['light', 'dark'];

const finalRenderedTextLineRect = (doc: Document, contentBlock: Element): DOMRect => {
  const range = doc.createRange();
  range.selectNodeContents(contentBlock);
  const rectangles = range.getClientRects();

  expect(rectangles.length, 'final legal text has a rendered line').to.be.greaterThan(0);
  return rectangles.item(rectangles.length - 1)!;
};

describe('legal pages at large text and narrow viewports', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept('https://**', { forceNetworkError: true });
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 401,
      body: { success: false, code: 'UNAUTHORIZED' },
    });
    cy.intercept('**/auth/reissue*', {
      statusCode: 401,
      body: { success: false, code: 'UNAUTHORIZED' },
    });
  });

  legalPages.forEach((page) => {
    viewports.forEach((viewport) => {
      themes.forEach((theme) => {
        it(`${page.id} at ${viewport.id}, ${theme}`, () => {
          cy.viewport(viewport.width, viewport.height);
          cy.visit(page.path, {
            onBeforeLoad(win) {
              win.localStorage.setItem('kbo-theme', theme);
              win.localStorage.removeItem('bega-theme');
              win.localStorage.removeItem('theme');
              win.document.documentElement.classList.toggle('dark', theme === 'dark');
              win.document.documentElement.style.fontSize = `${viewport.rootTextSize}px`;
            },
          });

          cy.get('h1').should('contain.text', page.heading);
          cy.contains(page.marker).should('be.visible');
          cy.document().should((doc) => {
            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
            expect(doc.documentElement.style.fontSize).to.equal(`${viewport.rootTextSize}px`);
            expect(Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth))
              .to.be.at.most(viewport.width);
          });
          cy.screenshot(`${page.id}-${viewport.id}-${theme}-top`, { capture: 'viewport' });

          if (viewport.mobile) {
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

              expect(requestedScrollY, 'final legal text can be moved above the dock')
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

              const finalTextLine = finalRenderedTextLineRect(doc, finalLegalBlock!);
              expect(finalTextLine.top, 'final legal line clears sticky header by 8px')
                .to.be.at.least(stickyHeader!.getBoundingClientRect().bottom + 8);
              expect(finalTextLine.bottom, 'final legal line clears bottom navigation by 8px')
                .to.be.at.most(bottomNav!.getBoundingClientRect().top - 8);
            });
            cy.screenshot(`${page.id}-${viewport.id}-${theme}-final-line-clear`, { capture: 'viewport' });
          }
        });
      });
    });
  });
});

export {};
