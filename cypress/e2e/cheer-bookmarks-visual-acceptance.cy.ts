/// <reference types="cypress" />

export {};

const viewports = [
    { name: 'mobile-320', width: 320, height: 844, rootFontSize: 16 },
    { name: 'mobile-320-large-text', width: 320, height: 844, rootFontSize: 32 },
    { name: 'mobile-390', width: 390, height: 844, rootFontSize: 16 },
    { name: 'mobile-390-large-text', width: 390, height: 844, rootFontSize: 32 },
    { name: 'desktop', width: 1280, height: 900, rootFontSize: 16 },
    { name: 'desktop-large-text', width: 1280, height: 900, rootFontSize: 32 },
] as const;

const syntheticPost = {
    id: 920001,
    content: '레이아웃 검증용 합성 응원 게시글입니다. 실제 경기·구단 기록을 나타내지 않습니다. 좁은 화면에서도 문장이 카드 폭 안에서 줄바꿈되어야 합니다.',
    author: 'Design QA User',
    authorId: 920001,
    authorHandle: 'design_qa_user',
    teamId: 'TEST',
    team: 'TEST',
    timeAgo: '방금 전',
    comments: 0,
    likes: 0,
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 1,
    repostCount: 0,
    views: 0,
    liked: false,
    likedByUser: false,
    bookmarked: true,
    isBookmarked: true,
    repostedByMe: false,
    postType: 'NORMAL',
    isOwner: false,
    isHot: false,
    createdAt: '2026-10-09T00:00:00.000Z',
    updatedAt: '2026-10-09T00:00:00.000Z',
    images: [],
    imageUrls: [],
};

const pageResponse = <T,>(content: T[]) => ({
    content,
    last: true,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    size: 20,
    number: 0,
});

const assertNoHorizontalOverflow = (width: number, rootFontSize: number) => {
    cy.document().should((document) => {
        expect(document.defaultView!.getComputedStyle(document.documentElement).fontSize)
            .to.equal(`${rootFontSize}px`);
        expect(document.documentElement.scrollWidth).to.be.at.most(width);
        expect(document.body.scrollWidth).to.be.at.most(width);
    });
};

type ThemeMode = 'light' | 'dark';

const seedTheme = (win: Window, theme: ThemeMode, rootFontSize: number) => {
    win.localStorage.setItem('kbo-theme', theme);
    win.localStorage.removeItem('bega-theme');
    win.localStorage.removeItem('theme');

    win.document.documentElement.classList.toggle('dark', theme === 'dark');
    win.document.documentElement.style.fontSize = `${rootFontSize}px`;
    win.document.documentElement.style.scrollBehavior = 'auto';
};

const assertControlReachable = (selector: string) => {
    cy.get(selector).then(($control) => {
        $control[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    }).should(($control) => {
        const control = $control[0];
        const doc = control.ownerDocument;
        const win = doc.defaultView!;
        const rect = control.getBoundingClientRect();
        const docks = Array.from(doc.querySelectorAll(
            '[data-testid="cheer-mobile-bottom-nav"], [data-testid="auth-mobile-bottom-nav"], [data-testid="public-mobile-bottom-nav"]',
        )).filter((dock) => dock.getClientRects().length > 0);
        const dockTop = Math.min(win.innerHeight, ...docks.map((dock) => dock.getBoundingClientRect().top));
        const headerBottom = doc.querySelector('header')!.getBoundingClientRect().bottom;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        expect(rect.width, 'touch width').to.be.at.least(44);
        expect(rect.height, 'touch height').to.be.at.least(44);
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(doc.documentElement.clientWidth);
        expect(centerY, 'control clears header').to.be.greaterThan(headerBottom);
        expect(centerY, 'control clears bottom navigation').to.be.lessThan(dockTop);
        const hit = doc.elementFromPoint(centerX, centerY);
        expect(hit === control || Boolean(hit && control.contains(hit)), 'control receives pointer').to.equal(true);
    });
};

describe('Cheer bookmarks responsive visual acceptance', () => {
    beforeEach(() => {
        const origin = new URL(String(Cypress.config('baseUrl'))).origin;
        cy.intercept({ url: '**', middleware: true }, (request) => {
            if (new URL(request.url).origin !== origin) request.reply({ statusCode: 204, log: false });
        });
        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
        cy.login('user');
        cy.mockAPI();
    });

    for (const viewport of viewports) {
      for (const theme of ['light', 'dark'] as const) {
        const visitBookmarks = () => {
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/cheer/bookmarks', { onBeforeLoad: (win) => seedTheme(win, theme, viewport.rootFontSize) });
            cy.document().should((doc) => {
                expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                expect(doc.defaultView!.matchMedia('(min-width: 1024px)').matches).to.equal(viewport.width >= 1024);
            });
        };

        it(`renders the empty state at ${viewport.name} in ${theme}`, () => {
            cy.intercept('GET', '**/api/cheer/bookmarks*', {
                statusCode: 200,
                body: pageResponse([]),
            }).as('getBookmarks');
            visitBookmarks();
            cy.wait('@getBookmarks');

            cy.get('[data-testid="cheer-bookmarks"]').should('be.visible');
            cy.get('h1').should('contain.text', '북마크');
            cy.contains('아직 북마크한 게시글이 없습니다').should('be.visible');
            assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
            assertControlReachable('[data-testid="cheer-bookmarks-empty-cta"]');
            cy.screenshot(`cheer-bookmarks-empty-${viewport.name}-${theme}`, { capture: 'viewport' });
        });

        it(`renders a populated card at ${viewport.name} in ${theme}`, () => {
            cy.intercept('GET', '**/api/cheer/bookmarks*', {
                statusCode: 200,
                body: pageResponse([syntheticPost]),
            }).as('getBookmarks');
            visitBookmarks();
            cy.wait('@getBookmarks');

            cy.contains(syntheticPost.content).should('be.visible');
            cy.get('[data-testid="cheer-post-card"]').should('have.length', 1);
            cy.contains(syntheticPost.content).then(($content) => {
                const content = $content![0] as HTMLElement;
                const doc = content.ownerDocument;
                const win = doc.defaultView!;
                const ancestors = [];
                let current: HTMLElement | null = content;
                for (let depth = 0; current && depth < 7; depth++, current = current.parentElement) {
                    const rect = current.getBoundingClientRect();
                    const style = win.getComputedStyle(current);
                    ancestors.push({
                        tag: current.tagName,
                        testId: current.dataset.testid,
                        className: current.className,
                        display: style.display,
                        left: rect.left, right: rect.right, width: rect.width,
                        clientWidth: current.clientWidth, scrollWidth: current.scrollWidth,
                    });
                }
                cy.writeFile(`${Cypress.config('screenshotsFolder')}/bookmarks-${viewport.name}-${theme}.json`, {
                    viewportWidth: win.innerWidth,
                    rootFontSize: win.getComputedStyle(doc.documentElement).fontSize,
                    documentWidth: doc.documentElement.scrollWidth,
                    bodyWidth: doc.body.scrollWidth,
                    ancestors,
                });
            });
            cy.screenshot(`cheer-bookmarks-populated-${viewport.name}-${theme}`, { capture: 'viewport' });
            cy.contains(syntheticPost.content).should(($content) => {
                const content = $content![0] as HTMLElement;
                expect(content.getBoundingClientRect().width, 'post copy has layout width').to.be.greaterThan(0);
                expect(content.scrollWidth, 'post copy fits its container').to.be.at.most(content.clientWidth + 1);
            });
            assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
        });

        it(`holds loading until capture and resolves at ${viewport.name} in ${theme}`, () => {
            let releaseResponse!: () => void;
            const gate = new Cypress.Promise<void>((resolve) => { releaseResponse = resolve; });
            cy.intercept('GET', '**/api/cheer/bookmarks*', (request) => gate.then(() => {
                request.reply({ statusCode: 200, body: pageResponse([]) });
            })).as('getBookmarks');
            visitBookmarks();
            cy.get('[data-testid="cheer-bookmarks"] .animate-skeleton-pulse').should('have.length', 3);
            cy.contains('아직 북마크한 게시글이 없습니다').should('not.exist');
            assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
            cy.screenshot(`cheer-bookmarks-loading-${viewport.name}-${theme}`, { capture: 'viewport' });
            cy.then(() => releaseResponse());
            cy.wait('@getBookmarks');
            cy.get('[data-testid="cheer-bookmarks"] .animate-skeleton-pulse').should('not.exist');
            cy.contains('아직 북마크한 게시글이 없습니다').should('be.visible');
        });

        it(`shows retryable error and recovers at ${viewport.name} in ${theme}`, () => {
            let allowRecovery = false;
            cy.intercept('GET', '**/api/cheer/bookmarks*', (request) => {
                request.reply(allowRecovery
                    ? { statusCode: 200, body: pageResponse([]) }
                    : { statusCode: 503, body: { success: false, code: 'SYNTHETIC_UNAVAILABLE' } });
            }).as('getBookmarks');
            visitBookmarks();
            cy.wait('@getBookmarks');
            cy.wait('@getBookmarks');

            cy.contains('북마크를 불러오지 못했습니다.').should('be.visible');
            cy.get('[data-testid="cheer-bookmarks-retry"]').should('be.visible');
            assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
            assertControlReachable('[data-testid="cheer-bookmarks-retry"]');
            cy.screenshot(`cheer-bookmarks-error-${viewport.name}-${theme}`, { capture: 'viewport' });

            cy.then(() => {
                allowRecovery = true;
            });
            cy.get('[data-testid="cheer-bookmarks-retry"]').click();
            cy.wait('@getBookmarks');
            cy.contains('아직 북마크한 게시글이 없습니다').should('be.visible');
            assertNoHorizontalOverflow(viewport.width, viewport.rootFontSize);
            cy.screenshot(`cheer-bookmarks-recovered-${viewport.name}-${theme}`, { capture: 'viewport' });
        });
      }
    }
});
