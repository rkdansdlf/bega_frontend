/// <reference types="cypress" />

export {};

const profileHandle = 'design_profile_qa';
const profileName = '합성 프로필';
const bio = '디자인 검증용 합성 자기소개입니다. 좁은 화면에서도 문장을 읽을 수 있어야 합니다.';
const postCopy = '디자인 검증용 합성 게시글입니다. 실제 경기나 구단 기록이 아닙니다.';
const page = (content: unknown[]) => ({ content, last: true, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 20 });
const profile = { name: profileName, handle: `@${profileHandle}`, favoriteTeam: null,
    bio, cheerPoints: 1200, profileImageUrl: '/synthetic-profile-avatar.png' };
const post = { id: 940001, author: profileName, authorHandle: profileHandle, authorId: 940001,
    teamId: 'TEST', team: 'TEST', content: postCopy, postType: 'NORMAL',
    createdAt: '2026-10-21T00:00:00Z', imageUrls: [], images: [],
    likes: 0, comments: 0, views: 0, bookmarkCount: 0, repostCount: 0, isOwner: false };

describe('Public profile synthetic responsive states', () => {
    beforeEach(() => {
        const origin = new URL(String(Cypress.config('baseUrl'))).origin;
        cy.intercept({ url: '**', middleware: true }, (request) => {
            if (new URL(request.url).origin !== origin) request.reply({ statusCode: 204, log: false });
        });
        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
        cy.login('user');
        cy.mockAPI();
        cy.mockPublicFollowCounts(profileHandle, { followerCount: 42, followingCount: 15,
            isFollowedByMe: false, notifyNewPosts: false, blockedByMe: false, blockingMe: false });
    });

    for (const width of [320, 390, 1280] as const) {
        for (const fontSize of [16, 32] as const) {
            for (const theme of ['light', 'dark'] as const) {
                for (const state of ['populated', 'avatar-failure', 'empty', 'loading', 'profile-error', 'posts-error'] as const) {
                    it(`${state} at ${width}px / ${fontSize}px in ${theme}`, () => {
                        const id = `${state}-${width}-${fontSize}-${theme}`;
                        const issues: string[] = [];
                        const measures: Record<string, unknown> = {};
                        const hasPosts = state === 'populated' || state === 'avatar-failure';
                        const caseProfile = { ...profile, profileImageUrl: `/synthetic-profile-avatar.png?case=${id}` };
                        cy.intercept('GET', '**/synthetic-profile-avatar.png*', state === 'avatar-failure'
                            ? { statusCode: 404, headers: { 'cache-control': 'no-store' }, body: '' }
                            : { statusCode: 200, headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
                                body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#375b50"/><circle cx="48" cy="36" r="16" fill="white"/><path d="M20 90a28 28 0 0 1 56 0" fill="white"/></svg>' }).as('profileAvatar');
                        let releaseResponse!: () => void;
                        const gate = new Cypress.Promise<void>((resolve) => { releaseResponse = resolve; });
                        let recovered = false;
                        cy.intercept('GET', /\/api\/users\/profile\/(?:%40|@)?design_profile_qa(?:\?|$)/, (request) => {
                            if (state === 'loading') return gate.then(() => request.reply({ statusCode: 200, body: { success: true, data: caseProfile } }));
                            request.reply(state === 'profile-error'
                                ? { statusCode: 503, body: { code: 'SYNTHETIC_UNAVAILABLE' } }
                                : { statusCode: 200, body: { success: true, data: { ...caseProfile, bio: state === 'empty' ? null : bio } } });
                        }).as('profile');
                        cy.intercept('GET', '**/api/cheer/user/design_profile_qa/posts*', (request) => {
                            request.reply(state === 'posts-error' && !recovered
                                ? { statusCode: 503, body: { code: 'SYNTHETIC_UNAVAILABLE' } }
                                : { statusCode: 200, body: page(hasPosts ? [post] : []) });
                        }).as('posts');
                        cy.viewport(width, width === 1280 ? 900 : 844);
                        cy.visit(`/profile/@${profileHandle}`, {
                            onBeforeLoad(win) {
                                win.localStorage.setItem('kbo-theme', theme);
                                win.document.documentElement.classList.toggle('dark', theme === 'dark');
                                win.document.documentElement.style.fontSize = `${fontSize}px`;
                                win.document.documentElement.style.scrollBehavior = 'auto';
                            },
                        });
                        if (state === 'loading') {
                            cy.get('main .animate-pulse').should('have.length.greaterThan', 10);
                            cy.contains('h1', profileName).should('not.exist');
                        } else {
                            cy.wait('@profile');
                            if (state === 'profile-error') {
                                cy.contains('h2', '사용자를 찾을 수 없습니다.').should('exist');
                            } else {
                                cy.contains('h1', profileName).should('exist');
                                cy.wait('@profileAvatar');
                                if (state === 'avatar-failure') {
                                    cy.get(`[data-testid="profile-avatar-fallback"][aria-label="${profileName}"]`).should('exist');
                                    cy.get(`img[alt="${profileName}"]`).should('not.exist');
                                } else {
                                    cy.get(`img[alt="${profileName}"]`).should(($image) => {
                                        const img = $image[0] as HTMLImageElement;
                                        expect(img.complete && img.naturalWidth > 0, 'local avatar decodes').to.equal(true);
                                    });
                                }
                                if (state === 'posts-error') cy.contains('게시글을 불러오지 못했습니다.', { timeout: 20000 }).should('exist');
                                else {
                                    cy.wait('@posts');
                                    cy.contains(hasPosts ? postCopy : '아직 작성한 게시글이 없습니다.').should('exist');
                                }
                                cy.get('[data-testid="cheer-post-card"]').should('have.length', hasPosts ? 1 : 0);
                            }
                        }
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.screenshot(`profile-${id}-top`, { capture: 'viewport' });
                        cy.document().then((doc) => {
                            const win = doc.defaultView!;
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${fontSize}px`);
                            expect(win.matchMedia('(min-width: 1024px)').matches).to.equal(width >= 1024);
                            measures.documentWidth = doc.documentElement.scrollWidth;
                            measures.viewport = { width: win.innerWidth, height: win.innerHeight };
                            if (doc.documentElement.scrollWidth > width || doc.body.scrollWidth > width) issues.push('document horizontal overflow');
                        });
                        const measureText = (text: string, label: string) => {
                            cy.contains('main h1, main h2, main p, [data-testid="cheer-post-card"] div', text).then(($text) => {
                                const el = $text[0];
                                if (label === 'handle') el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                                const rect = el.getBoundingClientRect();
                                measures[label] = { width: rect.width, left: rect.left, right: rect.right,
                                    height: rect.height, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth };
                                if (rect.width <= 0 || rect.height <= 0 || el.scrollWidth > el.clientWidth + 1) issues.push(`${label} collapsed or internally overflowing`);
                                if (rect.left < 0 || rect.right > el.ownerDocument.documentElement.clientWidth) issues.push(`${label} outside horizontal viewport`);
                                if (label === 'handle') {
                                    const range = el.ownerDocument.createRange();
                                    range.selectNodeContents(el);
                                    const lines = Array.from(range.getClientRects()).map((line) => {
                                        const hit = el.ownerDocument.elementFromPoint(line.left + line.width / 2, line.top + line.height / 2);
                                        const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                                        if (!receivesPointer) issues.push('handle text line occluded after scroll');
                                        return { left: line.left, right: line.right, top: line.top, bottom: line.bottom, receivesPointer };
                                    });
                                    measures.handleLines = lines;
                                }
                            });
                        };
                        const measureControl = (label: string) => {
                            cy.contains('main button', label).then(($button) => {
                                const el = $button[0];
                                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                                const rect = el.getBoundingClientRect();
                                const doc = el.ownerDocument;
                                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                                measures[`control-${label}`] = { width: rect.width, height: rect.height, left: rect.left, right: rect.right,
                                    receivesPointer: hit === el || Boolean(hit && el.contains(hit)),
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth };
                                if (rect.width < 44 || rect.height < 44) issues.push(`${label} touch area below 44px`);
                                if (rect.left < 0 || rect.right > doc.documentElement.clientWidth || el.scrollWidth > el.clientWidth + 1) issues.push(`${label} clipped horizontally`);
                                if (!(hit === el || Boolean(hit && el.contains(hit)))) issues.push(`${label} center occluded after scroll`);
                            });
                        };
                        if (state === 'profile-error') {
                            measureText('사용자를 찾을 수 없습니다.', 'profile-error');
                            measureControl('뒤로 가기');
                        } else if (state !== 'loading') {
                            measureText(profileName, 'name');
                            measureText(`@${profileHandle}`, 'handle');
                            if (width === 320 && fontSize === 32 && hasPosts) cy.screenshot(`profile-${id}-handle`, { capture: 'viewport' });
                            measureText(state === 'empty' ? '아직 자기소개가 없습니다.' : bio, 'bio');
                            measureText('작성한 게시글', 'posts-heading');
                            if (hasPosts) measureText(postCopy, 'post-copy');
                            else measureText(state === 'posts-error' ? '게시글을 불러오지 못했습니다.' : '아직 작성한 게시글이 없습니다.', 'posts-state-copy');
                            for (const label of ['팔로워', '팔로잉', '팔로우', '작성글 보기']) measureControl(label);
                            if (state === 'posts-error') measureControl('다시 시도');
                            cy.contains('h2', '작성한 게시글').then(($heading) => {
                                $heading[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                            });
                            cy.screenshot(`profile-${id}-posts`, { capture: 'viewport' });
                        }
                        cy.then(() => {
                            cy.writeFile(`${Cypress.config('screenshotsFolder')}/profile-${id}.json`, { state, fontSize, theme, measures, issues });
                        });
                        if (state === 'loading') {
                            cy.then(() => releaseResponse());
                            cy.wait('@profile');
                            cy.contains('h1', profileName).should('exist');
                        }
                        if (state === 'posts-error') {
                            cy.then(() => { recovered = true; });
                            cy.contains('main button', '다시 시도').click();
                            cy.wait('@posts');
                            cy.contains('아직 작성한 게시글이 없습니다.').should('exist');
                        }
                        cy.then(() => expect(issues, 'responsive content/control findings').to.deep.equal([]));
                    });
                }
            }
        }
    }
});
