/// <reference types="cypress" />

export {};

const handle = 'keyboard_profile_qa';
const name = '키보드 합성 프로필';
const identifyTarget = (element: HTMLElement): string | null => {
    if (!element.matches('button') || !element.closest('main')) return null;
    const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (text === '뒤로') return 'back';
    if (text.includes('팔로워')) return 'followers';
    if (text.includes('팔로잉')) return 'following';
    if (element.dataset.testid === 'profile-follow-button') return 'follow';
    if (text.includes('작성글 보기')) return 'posts';
    if (text === '다시 시도') return 'retry';
    return null;
};

describe('Public profile native Tab focus visibility', () => {
    beforeEach(() => {
        const origin = new URL(String(Cypress.config('baseUrl'))).origin;
        cy.intercept({ url: '**', middleware: true }, (request) => {
            if (new URL(request.url).origin !== origin) request.reply({ statusCode: 204, log: false });
        });
        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
        cy.login('user');
        cy.mockAPI();
        cy.intercept('GET', /\/api\/users\/profile\/(?:%40|@)?keyboard_profile_qa(?:\?|$)/, {
            statusCode: 200,
            body: { success: true, data: { name, handle: `@${handle}`, favoriteTeam: null,
                profileImageUrl: null, bio: '실제 Tab 이동으로 포커스 가림을 확인하는 합성 자기소개입니다.', cheerPoints: 1200 } },
        }).as('profile');
        cy.mockPublicFollowCounts(handle, { followerCount: 42, followingCount: 15,
            isFollowedByMe: false, notifyNewPosts: false, blockedByMe: false, blockingMe: false });
    });

    for (const width of [320, 390, 1280] as const) {
        for (const theme of ['light', 'dark'] as const) {
            for (const state of ['empty', 'posts-error'] as const) {
                it(`${state} at ${width}px / 32px in ${theme}`, () => {
                    cy.intercept('GET', '**/api/cheer/user/keyboard_profile_qa/posts*', {
                        statusCode: state === 'posts-error' ? 503 : 200,
                        body: state === 'posts-error' ? { code: 'SYNTHETIC_UNAVAILABLE' }
                            : { content: [], last: true, totalElements: 0, totalPages: 0, number: 0, size: 20 },
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit(`/profile/@${handle}`, {
                        onBeforeLoad(win) {
                            win.localStorage.setItem('kbo-theme', theme);
                            win.document.documentElement.classList.toggle('dark', theme === 'dark');
                            win.document.documentElement.style.fontSize = '32px';
                            win.document.documentElement.style.scrollBehavior = 'auto';
                        },
                    });
                    cy.wait('@profile');
                    cy.contains('h1', name).should('exist');
                    cy.contains(state === 'posts-error' ? '게시글을 불러오지 못했습니다.' : '아직 작성한 게시글이 없습니다.', { timeout: 20000 }).should('exist');
                    cy.get('[data-testid="profile-follow-button"]').should('exist');
                    cy.document().then((doc) => doc.fonts.ready);
                    cy.document().then((doc) => {
                        expect(doc.activeElement, 'no synthetic focus anchor').to.equal(doc.body);
                        expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                        expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal('32px');
                    });

                    const required = ['back', 'followers', 'following', 'follow', 'posts', ...(state === 'posts-error' ? ['retry'] : [])];
                    const seen = new Set<string>();
                    const issues: string[] = [];
                    const measurements: Array<Record<string, unknown>> = [];
                    const id = `${state}-${width}-${theme}`;
                    const tabThrough = (step: number): void => {
                        cy.press(Cypress.Keyboard.Keys.TAB).then(() => cy.document().then((doc) => {
                            const element = doc.activeElement as HTMLElement;
                            const target = identifyTarget(element);
                            if (!target || seen.has(target)) return;
                            seen.add(target);
                            const rect = element.getBoundingClientRect();
                            const win = doc.defaultView!;
                            const headerBottom = doc.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
                            const docks = Array.from(doc.querySelectorAll('[data-testid="auth-mobile-bottom-nav"], [data-testid="public-mobile-bottom-nav"], [data-testid="cheer-mobile-bottom-nav"]'))
                                .filter((dock) => dock.getClientRects().length > 0);
                            const dockTop = Math.min(win.innerHeight, ...docks.map((dock) => dock.getBoundingClientRect().top));
                            const probes = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]].map(([x, y]) => {
                                const hit = doc.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y);
                                return hit === element || Boolean(hit && element.contains(hit));
                            });
                            const allProbesHidden = probes.every((visible) => !visible);
                            const partiallyCovered = rect.top < headerBottom || rect.bottom > dockTop
                                || rect.left < 0 || rect.right > doc.documentElement.clientWidth || probes.some((visible) => !visible);
                            const focusVisible = element.matches(':focus-visible');
                            measurements.push({ step, target, text: element.textContent, focusVisible,
                                top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
                                headerBottom, dockTop, probes, allProbesHidden, partiallyCovered, scrollY: win.scrollY });
                            if (allProbesHidden) issues.push(`${target}: all five focus probes hidden`);
                            else if (partiallyCovered) issues.push(`${target}: partial viewport/chrome overlap`);
                            if (!focusVisible) issues.push(`${target}: focus-visible state missing`);
                            cy.screenshot(`profile-keyboard-${id}-${target}`, { capture: 'viewport' });
                        })).then(() => {
                            if (required.every((target) => seen.has(target)) || step >= 40) return;
                            tabThrough(step + 1);
                        });
                    };
                    tabThrough(1);
                    cy.then(() => {
                        const missing = required.filter((target) => !seen.has(target));
                        cy.writeFile(`${Cypress.config('screenshotsFolder')}/profile-keyboard-${id}.json`, {
                            width, height: width === 1280 ? 900 : 844, rootFontSize: 32, theme, state, missing, issues, measurements,
                        });
                    });
                    cy.then(() => {
                        expect(required.filter((target) => !seen.has(target)), 'all required actions reached by native Tab').to.deep.equal([]);
                        expect(issues, 'strict unobscured keyboard-focus design target').to.deep.equal([]);
                    });
                });
            }
        }
    }
});
