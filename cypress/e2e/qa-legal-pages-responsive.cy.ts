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
          cy.screenshot(`${page.id}-${viewport.id}-${theme}-bottom`, { capture: 'viewport' });
        });
      });
    });
  });
});

export {};
