/// <reference types="cypress" />

export {};

type Theme = 'light' | 'dark';

const viewports = [
  { id: 'mobile', width: 390, height: 844 },
  { id: 'desktop', width: 1400, height: 900 },
] as const;

const themes: Theme[] = ['light', 'dark'];

const syntheticNotice = (index: number) => ({
  id: 9000 + index,
  teamId: '',
  content: `합성 공지 QA ${String(index + 1).padStart(2, '0')}\n운영 자료가 아닌 화면 검증용 문구입니다.`,
  author: 'QA 운영자',
  createdAt: '2026-10-09T00:00:00.000Z',
  postType: 'NOTICE',
  comments: 0,
  likes: 0,
});

const syntheticPage = (content: ReturnType<typeof syntheticNotice>[]) => ({
  content,
  last: true,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  size: 100,
  number: 0,
});

const stubPublicChrome = () => {
  cy.intercept('**/api/**', {
    statusCode: 503,
    body: { success: false, code: 'SYNTHETIC_UNSTUBBED_API' },
  });
  cy.intercept('**/auth/mypage*', {
    statusCode: 401,
    body: { success: false, code: 'UNAUTHORIZED' },
  });
  cy.intercept('**/auth/reissue*', {
    statusCode: 401,
    body: { success: false, code: 'UNAUTHORIZED' },
  });
  cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
  cy.intercept('GET', '**/api/dm/rooms/my', { statusCode: 200, body: { success: true, data: [] } });
  cy.intercept('GET', '**/api/notifications/my/unread-count', { statusCode: 200, body: 0 });
  cy.intercept('GET', '**/api/notifications/my', { statusCode: 200, body: [] });
  cy.intercept('https://**', { forceNetworkError: true });
};

const seedTheme = (win: Window, theme: Theme) => {
  win.localStorage.clear();
  win.sessionStorage.clear();
  win.localStorage.setItem('kbo-theme', theme);
  win.document.documentElement.classList.toggle('dark', theme === 'dark');
};

const assertNoHorizontalOverflow = (width: number) => {
  cy.document().should((document) => {
    expect(Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
      .to.be.at.most(width);
  });
};

describe('Notice route responsive state QA', () => {
  for (const viewport of viewports) {
    for (const theme of themes) {
      it(`renders a paginated synthetic notice list at ${viewport.id} in ${theme} theme`, () => {
        cy.viewport(viewport.width, viewport.height);
        stubPublicChrome();
        cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, {
          statusCode: 200,
          body: syntheticPage(Array.from({ length: 16 }, (_, index) => syntheticNotice(index))),
        }).as('noticePosts');

        cy.visit('/notice', { onBeforeLoad: (win) => seedTheme(win, theme) });
        cy.wait('@noticePosts').its('request.url').should('include', 'postType=NOTICE');
        cy.window().should((win) => {
          expect(win.innerWidth).to.equal(viewport.width);
          expect(win.innerHeight).to.equal(viewport.height);
        });
        cy.get('html').should(($html) => {
          expect($html.hasClass('dark')).to.equal(theme === 'dark');
        });
        cy.get('[data-testid="notice-page-runtime"]').should('be.visible');
        cy.get('h1').should('contain.text', '공지사항');
        cy.contains('합성 공지 QA 01').should('be.visible');
        cy.contains('합성 공지 QA 15').should('be.visible');
        cy.contains('합성 공지 QA 16').should('not.exist');
        assertNoHorizontalOverflow(viewport.width);
        cy.screenshot(`notice-populated-top-${viewport.id}-${theme}`, { capture: 'viewport' });

        cy.get('[data-testid="notice-page-next"]').scrollIntoView().click();
        cy.get('[data-testid="notice-page-2"]').should('have.attr', 'aria-current', 'page');
        cy.contains('합성 공지 QA 16').should('be.visible');
        assertNoHorizontalOverflow(viewport.width);
        cy.get('[data-testid="notice-page-next"]').scrollIntoView();
        cy.screenshot(`notice-populated-pagination-${viewport.id}-${theme}`, { capture: 'viewport' });
      });

      it(`renders the empty state at ${viewport.id} in ${theme} theme`, () => {
        cy.viewport(viewport.width, viewport.height);
        stubPublicChrome();
        cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, {
          statusCode: 200,
          body: syntheticPage([]),
        }).as('noticePosts');

        cy.visit('/notice', { onBeforeLoad: (win) => seedTheme(win, theme) });
        cy.wait('@noticePosts');
        cy.contains('등록된 공지사항이 없습니다.').should('be.visible');
        cy.get('[data-testid="notice-page-next"]').should('not.exist');
        assertNoHorizontalOverflow(viewport.width);
        cy.screenshot(`notice-empty-${viewport.id}-${theme}`, { capture: 'viewport' });
      });

      it(`renders the API error state at ${viewport.id} in ${theme} theme`, () => {
        cy.viewport(viewport.width, viewport.height);
        stubPublicChrome();
        cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, {
          statusCode: 503,
          body: { success: false, code: 'SYNTHETIC_NOTICE_FAILURE' },
        }).as('noticePosts');

        cy.visit('/notice', { onBeforeLoad: (win) => seedTheme(win, theme) });
        cy.wait('@noticePosts');
        cy.contains('공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', { timeout: 15000 })
          .should('be.visible');
        cy.get('[data-testid="notice-page-refresh"]').should('be.enabled');
        assertNoHorizontalOverflow(viewport.width);
        cy.screenshot(`notice-error-${viewport.id}-${theme}`, { capture: 'viewport' });
      });
    }
  }
});
