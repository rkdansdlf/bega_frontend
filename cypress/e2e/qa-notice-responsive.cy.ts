/// <reference types="cypress" />

export {};

type Theme = 'light' | 'dark';

const viewports = [
  { id: 'mobile-320', width: 320, height: 844, rootFontSize: 16 },
  { id: 'mobile-320-large-text', width: 320, height: 844, rootFontSize: 32 },
  { id: 'mobile', width: 390, height: 844, rootFontSize: 16 },
  { id: 'mobile-large-text', width: 390, height: 844, rootFontSize: 32 },
  { id: 'desktop', width: 1400, height: 900, rootFontSize: 16 },
  { id: 'desktop-large-text', width: 1400, height: 900, rootFontSize: 32 },
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

const seedTheme = (win: Window, theme: Theme, rootFontSize: number) => {
  win.localStorage.clear();
  win.sessionStorage.clear();
  win.localStorage.setItem('kbo-theme', theme);
  win.document.documentElement.classList.toggle('dark', theme === 'dark');
  win.document.documentElement.style.fontSize = `${rootFontSize}px`;
  win.document.documentElement.style.scrollBehavior = 'auto';
};

const assertNoHorizontalOverflow = (width: number, rootFontSize: number) => {
  cy.document().then((document) => {
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    if (scrollWidth <= width) return;
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const evidenceName = `notice-overflow-${width}-${rootFontSize}-${theme}`;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          testId: element.dataset.testid,
          className: typeof element.className === 'string' ? element.className : '',
          left: rect.left,
          right: rect.right,
          width: rect.width,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        };
      })
      .filter((element) => element.left < -1 || element.right > width + 1);
    cy.writeFile(`${Cypress.config('screenshotsFolder')}/${evidenceName}.json`, {
      width, rootFontSize, theme, scrollWidth, offenders,
    });
    cy.screenshot(evidenceName, { capture: 'viewport' });
  });
  cy.document().should((document) => {
    expect(document.defaultView!.getComputedStyle(document.documentElement).fontSize)
      .to.equal(`${rootFontSize}px`);
    expect(Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
      .to.be.at.most(width);
  });
};

const assertReachable = (selector: string, control = false) => {
  cy.get(selector).then(($target) => {
    $target[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  }).should(($target) => {
    const target = $target[0];
    const document = target.ownerDocument;
    const win = document.defaultView!;
    const rect = target.getBoundingClientRect();
    const headerBottom = document.querySelector('header')!.getBoundingClientRect().bottom;
    const dock = document.querySelector('[data-testid="public-mobile-bottom-nav"]');
    const visibleBottom = dock?.getClientRects().length ? dock.getBoundingClientRect().top : win.innerHeight;
    expect(rect.left, `${selector} left edge`).to.be.at.least(0);
    expect(rect.right, `${selector} right edge`).to.be.at.most(document.documentElement.clientWidth);
    if (control) {
      expect(rect.height, `${selector} touch height`).to.be.at.least(44);
      expect(rect.width, `${selector} touch width`).to.be.at.least(44);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      expect(centerY, `${selector} center clears header`).to.be.greaterThan(headerBottom);
      expect(centerY, `${selector} center clears dock`).to.be.lessThan(visibleBottom);
      const hit = document.elementFromPoint(centerX, centerY);
      expect(hit === target || Boolean(hit && target.contains(hit)), `${selector} receives pointer`)
        .to.equal(true);
    } else {
      const range = document.createRange();
      range.selectNodeContents(target);
      const lines = Array.from(range.getClientRects()).filter((line) => line.width > 0 && line.height > 0);
      expect(lines.length, `${selector} rendered text lines`).to.be.greaterThan(0);
      expect(lines[0].top, `${selector} first line clears header`).to.be.at.least(headerBottom + 8);
      expect(lines.at(-1)!.bottom, `${selector} final line clears dock`).to.be.at.most(visibleBottom - 8);
    }
  });
};

const assertNoticeTitleWrapping = () => {
  cy.get('[data-testid="notice-post-9000"] h3').should(($title) => {
    const title = $title[0];
    const lineHeight = Number.parseFloat(title.ownerDocument.defaultView!.getComputedStyle(title).lineHeight);
    expect(title.textContent).to.equal('합성 공지 QA 01');
    expect(title.getBoundingClientRect().height, 'short notice title uses at most three lines')
      .to.be.at.most(lineHeight * 3 + 1);
    expect(title.scrollWidth, 'notice title is not clipped horizontally').to.be.at.most(title.clientWidth + 1);
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

        cy.visit('/notice', { onBeforeLoad: (win) => seedTheme(win, theme, viewport.rootFontSize) });
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
        assertNoticeTitleWrapping();
        assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
        cy.screenshot(`notice-populated-top-${viewport.id}-${theme}`, { capture: 'viewport' });

        assertReachable('[data-testid="notice-page-next"]', true);
        cy.get('[data-testid="notice-page-next"]').click();
        cy.get('[data-testid="notice-page-2"]').should('have.attr', 'aria-current', 'page');
        cy.contains('합성 공지 QA 16').should('be.visible');
        assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
        assertReachable('[data-testid="notice-post-9015"] h3');
        cy.get('[data-testid="notice-page-pagination"]').then(($pagination) => {
          $pagination[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        });
        cy.screenshot(`notice-populated-pagination-${viewport.id}-${theme}`, { capture: 'viewport' });
      });

      it(`renders and resolves the loading state at ${viewport.id} in ${theme} theme`, () => {
        cy.viewport(viewport.width, viewport.height);
        stubPublicChrome();
        let releaseResponse!: () => void;
        const responseGate = new Cypress.Promise<void>((resolve) => {
          releaseResponse = resolve;
        });
        cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, (request) => {
          return responseGate.then(() => {
            request.reply({ statusCode: 200, body: syntheticPage([]) });
          });
        }).as('noticePosts');

        cy.visit('/notice', { onBeforeLoad: (win) => seedTheme(win, theme, viewport.rootFontSize) });
        cy.get('[data-testid="notice-page-loading"]').should('be.visible');
        cy.get('[data-testid="notice-page-skeleton"]').should('have.length', 5);
        assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
        cy.screenshot(`notice-loading-${viewport.id}-${theme}`, { capture: 'viewport' });

        cy.then(() => releaseResponse());
        cy.wait('@noticePosts');
        cy.get('[data-testid="notice-page-loading"]').should('not.exist');
        cy.get('[data-testid="notice-page-empty"]').should('be.visible');
      });

      it(`renders the empty state at ${viewport.id} in ${theme} theme`, () => {
        cy.viewport(viewport.width, viewport.height);
        stubPublicChrome();
        cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, {
          statusCode: 200,
          body: syntheticPage([]),
        }).as('noticePosts');

        cy.visit('/notice', { onBeforeLoad: (win) => seedTheme(win, theme, viewport.rootFontSize) });
        cy.wait('@noticePosts');
        cy.contains('등록된 공지사항이 없습니다.').should('be.visible');
        cy.get('[data-testid="notice-page-next"]').should('not.exist');
        assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
        assertReachable('[data-testid="notice-page-empty"] h3');
        cy.screenshot(`notice-empty-${viewport.id}-${theme}`, { capture: 'viewport' });
      });

      it(`renders the API error state at ${viewport.id} in ${theme} theme`, () => {
        cy.viewport(viewport.width, viewport.height);
        stubPublicChrome();
        cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, {
          statusCode: 503,
          body: { success: false, code: 'SYNTHETIC_NOTICE_FAILURE' },
        }).as('noticePosts');

        cy.visit('/notice', { onBeforeLoad: (win) => seedTheme(win, theme, viewport.rootFontSize) });
        cy.wait('@noticePosts');
        cy.contains('공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', { timeout: 15000 })
          .should('be.visible');
        cy.get('[data-testid="notice-page-refresh"]').should('be.enabled');
        assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
        assertReachable('[data-testid="notice-page-error"]');
        cy.screenshot(`notice-error-copy-${viewport.id}-${theme}`, { capture: 'viewport' });
        assertReachable('[data-testid="notice-page-refresh"]', true);
        cy.screenshot(`notice-error-${viewport.id}-${theme}`, { capture: 'viewport' });
      });

      if (viewport.width < 768 && viewport.rootFontSize === 32) {
        it(`keeps dense middle-page controls reachable at ${viewport.id} in ${theme} theme`, () => {
          cy.viewport(viewport.width, viewport.height);
          stubPublicChrome();
          cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, {
            statusCode: 200,
            body: syntheticPage(Array.from({ length: 100 }, (_, index) => syntheticNotice(index))),
          }).as('noticePosts');
          cy.visit('/notice', { onBeforeLoad: (win) => seedTheme(win, theme, viewport.rootFontSize) });
          cy.wait('@noticePosts');
          assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
          assertReachable('[data-testid="notice-page-3"]', true);
          cy.get('[data-testid="notice-page-3"]').click();
          cy.get('[data-testid="notice-page-pagination"]').should('contain.text', '...').then(($pagination) => {
            $pagination[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
          });
          assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
          cy.screenshot(`notice-dense-ellipsis-${viewport.id}-${theme}`, { capture: 'viewport' });
          assertReachable('[data-testid="notice-page-4"]', true);
          cy.get('[data-testid="notice-page-4"]').click();
          cy.get('[data-testid="notice-page-4"]').should('have.attr', 'aria-current', 'page');
          cy.contains('합성 공지 QA 46').should('be.visible');
          cy.get('[data-testid="notice-page-pagination"]').should('not.contain.text', '...')
            .find('button').should('have.length', 9);
          assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
          for (const id of ['previous', '1', '2', '3', '4', '5', '6', '7', 'next']) {
            assertReachable(`[data-testid="notice-page-${id}"]`, true);
          }
          cy.get('[data-testid="notice-page-pagination"]').then(($pagination) => {
            $pagination[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
          });
          cy.screenshot(`notice-dense-pagination-${viewport.id}-${theme}`, { capture: 'viewport' });
        });
      }
    }
  }
});
