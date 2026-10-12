/// <reference types="cypress" />

export {};

const viewports = [
    { name: 'mobile-320', width: 320, height: 844 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 900 },
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

const assertNoHorizontalOverflow = (width: number) => {
    cy.document().should((document) => {
        expect(document.documentElement.scrollWidth).to.be.at.most(width);
        expect(document.body.scrollWidth).to.be.at.most(width);
    });
};

type ThemeMode = 'light' | 'dark';

const seedTheme = (win: Window, theme: ThemeMode) => {
    win.localStorage.setItem('kbo-theme', theme);
    win.localStorage.removeItem('bega-theme');
    win.localStorage.removeItem('theme');

    Object.defineProperty(win, 'matchMedia', {
        configurable: true,
        writable: true,
        value: ((query: string) => ({
            matches: query === '(prefers-color-scheme: dark)' ? theme === 'dark' : false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        })) as unknown as MediaQueryList,
    });
};

describe('Cheer bookmarks responsive visual acceptance', () => {
    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();
    });

    for (const viewport of viewports) {
        it(`renders the empty state at ${viewport.width}px`, () => {
            cy.intercept('GET', '**/api/cheer/bookmarks*', {
                statusCode: 200,
                body: pageResponse([]),
            }).as('getBookmarks');
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/cheer/bookmarks');
            cy.wait('@getBookmarks');

            cy.get('[data-testid="cheer-bookmarks"]').should('be.visible');
            cy.get('h1').should('contain.text', '북마크');
            cy.contains('아직 북마크한 게시글이 없습니다').should('be.visible');
            cy.get('[data-testid="cheer-bookmarks-empty-cta"]').should('be.visible').then(($button) => {
                const rect = $button[0].getBoundingClientRect();
                expect(rect.height).to.be.at.least(44);
            });
            assertNoHorizontalOverflow(viewport.width);
            cy.screenshot(`cheer-bookmarks-empty-${viewport.name}`, { capture: 'viewport' });
        });

        it(`renders a populated card at ${viewport.width}px`, () => {
            cy.intercept('GET', '**/api/cheer/bookmarks*', {
                statusCode: 200,
                body: pageResponse([syntheticPost]),
            }).as('getBookmarks');
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/cheer/bookmarks');
            cy.wait('@getBookmarks');

            cy.contains(syntheticPost.content).should('be.visible');
            cy.get('[data-testid="cheer-post-card"]').should('have.length', 1);
            assertNoHorizontalOverflow(viewport.width);
            cy.screenshot(`cheer-bookmarks-populated-${viewport.name}`, { capture: 'viewport' });
        });
    }

    for (const viewport of [viewports[1], viewports[2]]) {
        for (const theme of ['light', 'dark'] as const) {
            it(`renders a populated card at ${viewport.width}px in ${theme} theme`, () => {
                cy.intercept('GET', '**/api/cheer/bookmarks*', {
                    statusCode: 200,
                    body: pageResponse([syntheticPost]),
                }).as('getBookmarks');
                cy.viewport(viewport.width, viewport.height);
                cy.visit('/cheer/bookmarks', {
                    onBeforeLoad(win) {
                        seedTheme(win, theme);
                    },
                });
                cy.window().then((win) => {
                    seedTheme(win, theme);
                    win.document.documentElement.classList.toggle('dark', theme === 'dark');
                });
                cy.wait('@getBookmarks');

                cy.get('html').then(($html) => {
                    if (theme === 'dark') {
                        expect($html).to.have.class('dark');
                    } else {
                        expect($html).not.to.have.class('dark');
                    }
                });
                cy.contains(syntheticPost.content).should('be.visible');
                cy.get('[data-testid="cheer-post-card"]').should('have.length', 1);
                assertNoHorizontalOverflow(viewport.width);
                cy.screenshot(`cheer-bookmarks-populated-${viewport.name}-${theme}`, { capture: 'viewport' });
            });
        }
    }

    for (const viewport of [viewports[1], viewports[2]]) {
        it(`shows retryable error and recovers at ${viewport.width}px`, () => {
            let allowRecovery = false;
            cy.intercept('GET', '**/api/cheer/bookmarks*', (request) => {
                request.reply(allowRecovery
                    ? { statusCode: 200, body: pageResponse([]) }
                    : { statusCode: 503, body: { success: false, code: 'SYNTHETIC_UNAVAILABLE' } });
            }).as('getBookmarks');
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/cheer/bookmarks');
            cy.wait('@getBookmarks');
            cy.wait('@getBookmarks');

            cy.contains('북마크를 불러오지 못했습니다.').should('be.visible');
            cy.get('[data-testid="cheer-bookmarks-retry"]').should('be.visible');
            assertNoHorizontalOverflow(viewport.width);
            cy.screenshot(`cheer-bookmarks-error-${viewport.name}`, { capture: 'viewport' });

            cy.then(() => {
                allowRecovery = true;
            });
            cy.get('[data-testid="cheer-bookmarks-retry"]').click();
            cy.wait('@getBookmarks');
            cy.contains('아직 북마크한 게시글이 없습니다').should('be.visible');
            assertNoHorizontalOverflow(viewport.width);
            cy.screenshot(`cheer-bookmarks-recovered-${viewport.name}`, { capture: 'viewport' });
        });
    }
});
