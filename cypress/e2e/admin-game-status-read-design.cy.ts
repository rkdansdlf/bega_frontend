/// <reference types="cypress" />

import type { AdminGameStatusMismatch, AdminGameStatusMismatchBatchResult } from '../../src/types/admin';
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// All baseball-shaped rows are explicitly fictional. Never repair, dry-run,
// save/delete a tracker, download CSV or copy a command.
describe('Game Status synthetic read-only diagnosis states', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 950093, email: 'status-design@example.invalid', name: '합성 관리자', handle: 'design_status_admin',
                role: 'ROLE_ADMIN', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
            const day = '2026-10-25', recentStart = '2026-10-12';
            const panel = '[data-testid="admin-game-status-panel"]', result = `${panel} > section:last-of-type`;
            const suggestions = `${panel} > section:nth-of-type(2)`, header = `${panel} > section:first-of-type`;
            const mismatch: AdminGameStatusMismatch = { gameId: 'SYNTH_GAME_STATUS_001', gameDate: day, startTime: null,
                rawStatus: 'COMPLETED', normalizedRawStatus: 'COMPLETED', effectiveStatus: 'SCHEDULED',
                homeScore: null, awayScore: null, inningScoreCount: 0, hasKnownScore: false, hasInningScores: false,
                reasons: ['SYNTHETIC_UI_ONLY_NO_REAL_GAME'] };
            const emptyCopy = '선택한 날짜 범위에서 경기 상태 불일치나 비정상 팀 코드 경기가 없습니다.';
            const recentEmptyCopy = '최근 14일 범위에서 추천할 이상 날짜가 없습니다.';
            let phase: 'error' | 'empty' | 'data' = 'error', release!: () => void, foreignBlocked = 0;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
            const replies: Array<Record<string, unknown>> = [], observations: Array<Record<string, unknown>> = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/game-status-${id}.json`, {
                width, font, requestedTheme: theme, phase, foreignBlocked, mutations, unexpectedReads, replies, observations, findings,
            });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    mutations.push(`${req.method} ${url.pathname}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                }
                if (url.origin !== origin) {
                    foreignBlocked++;
                    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) unexpectedReads.push(url.pathname);
                    return req.reply({ forceNetworkError: true, log: false });
                }
                if (url.pathname !== '/admin' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', (req) => { unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('**/auth/**', (req) => { unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { statusCode: 200, body: { success: true, data: toAuthApiUser(viewer) } });
            cy.intercept('GET', `${origin}/api/admin/stats`, { statusCode: 200, body: { success: true, data: { totalUsers: 1, totalPosts: 0, totalMates: 0 } } });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                req.reply({ statusCode: 200, body: { success: true, data: [] } });
            });
            cy.intercept('GET', `${origin}/api/dm/rooms/my`, { statusCode: 200, body: { success: true, data: [] } });
            cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', `${origin}/api/notifications/my*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/notifications/my'); expect(url.search).to.equal('');
                req.reply({ statusCode: 200, body: [] });
            });
            cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { statusCode: 200, body: 0 });
            cy.intercept('GET', `${origin}/api/admin/games/status-mismatches*`, (req) => {
                const url = new URL(req.url), current = phase, start = url.searchParams.get('startDate');
                expect(url.pathname).to.equal('/api/admin/games/status-mismatches');
                expect(Array.from(url.searchParams.keys()).sort()).to.deep.equal(['endDate', 'startDate']);
                expect(url.searchParams.get('endDate')).to.equal(day); expect([day, recentStart]).to.include(start);
                const kind = start === day ? 'diagnosis' : 'suggestions'; req.alias = `${kind}-${current}`;
                const reply = () => {
                    const status = current === 'error' ? 503 : 200;
                    const body: AdminGameStatusMismatchBatchResult = { startDate: start!, endDate: day,
                        totalGames: current === 'data' ? 1 : 0, mismatchCount: current === 'data' ? 1 : 0,
                        mismatches: current === 'data' ? [mismatch] : [], nonCanonicalCount: 0, nonCanonicalGames: [] };
                    replies.push({ kind, phase: current, status, startDate: start, endDate: day });
                    req.reply({ statusCode: status, body: status === 503 ? {} : { success: true, data: body } });
                };
                return current === 'error' ? gate.then(reply) : reply();
            });
            cy.intercept('GET', `${origin}/api/admin/games/non-canonical-cleanup-trackers`, (req) => {
                const current = phase; req.alias = `trackers-${current}`;
                const reply = () => {
                    const status = current === 'error' ? 403 : 200; replies.push({ kind: 'trackers', phase: current, status });
                    req.reply({ statusCode: status, body: status === 403 ? {} : { success: true, data: [] } });
                };
                return current === 'error' ? gate.then(reply) : reply();
            });
            cy.viewport(width, width === 1280 ? 900 : 844); cy.clock(Date.UTC(2026, 9, 25, 12), ['Date']);
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const capsule = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(capsule?.bottom ?? 0, 80) - 16, behavior: 'instant' });
            });
            const visit = () => {
                cy.visit('/admin', { onBeforeLoad(win) {
                    win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                    win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                } });
                align('[data-testid="admin-tab-game-status"]'); cy.get('[data-testid="admin-tab-game-status"]').click({ scrollBehavior: false });
                cy.get(`${result} h3`).should('contain.text', '진단 결과'); cy.get(`${suggestions} h3`).should('contain.text', '최근 이슈 날짜 추천');
                cy.get('[data-testid="admin-game-status-start-date"]').should('have.value', day);
            };
            const capture = (state: string, section: string) => {
                cy.document().then((doc) => doc.fonts.ready); align(`${section} h2, ${section} h3`);
                cy.get(`${section} h2, ${section} h3`).first().should('be.visible');
                cy.get(section).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    observations.push({ state, text: el.innerText, width: el.clientWidth, scrollWidth: el.scrollWidth });
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                    // Normal table and suggestion-carousel horizontal scrolling is intentional.
                    if (el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: section internal horizontal overflow`);
                }); cy.screenshot(`game-status-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const readClick = (name: 'diagnose' | 'refresh-suggestions') => {
                const selector = `[data-testid="admin-game-status-${name}"]`;
                align(selector); cy.get(selector).should('be.enabled').click({ scrollBehavior: false });
            };
            visit(); cy.get('[data-testid="admin-game-status-diagnose"]').should('be.disabled');
            cy.contains(suggestions, '최근 이슈 날짜를 확인 중입니다.').should('exist');
            capture('loading-diagnosis', result); capture('loading-suggestions', suggestions);
            cy.then(() => release()); cy.wait(['@diagnosis-error', '@suggestions-error']);
            cy.wait('@trackers-error').its('response.statusCode').should('equal', 403);
            cy.get('[data-testid="admin-game-status-diagnose"]').should('be.enabled');
            cy.contains(header, '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('exist');
            capture('failed-diagnosis', result); capture('failed-suggestions', suggestions);
            cy.get(suggestions).then(($el) => { if ($el.text().includes(recentEmptyCopy)) findings.push('failed suggestions read shown as healthy empty'); });
            cy.get(panel).then(($el) => {
                const hasPermissionCopy = (el: Element) => ['관리자 권한이 필요합니다.', '접근 권한이 없습니다.'].some((text) => el.textContent?.includes(text));
                const candidates = Array.from($el[0].querySelectorAll<HTMLElement>('*'))
                    .filter((el) => hasPermissionCopy(el) && !Array.from(el.children).some(hasPermissionCopy))
                    .map((el) => { const r = el.getBoundingClientRect(); return { text: el.innerText, width: r.width, height: r.height,
                        rendered: Cypress.dom.isVisible(el) && r.width > 0 && r.height > 0 }; });
                const permissionVisible = candidates.some((el) => el.rendered);
                observations.push({ state: 'tracker-read-403-guidance', permissionVisible, candidates });
                if (!permissionVisible) findings.push('tracker read403 has no visible permission guidance');
            });
            cy.then(() => { phase = 'empty'; }); readClick('diagnose'); cy.wait('@diagnosis-empty').its('response.statusCode').should('equal', 200);
            cy.get('[data-testid="admin-game-status-diagnose"]').should('be.enabled'); cy.get(result).should('contain.text', emptyCopy);
            capture('healthy-empty-diagnosis', result);
            readClick('refresh-suggestions'); cy.wait('@suggestions-empty').its('response.statusCode').should('equal', 200);
            cy.get('[data-testid="admin-game-status-refresh-suggestions"]').should('be.enabled'); cy.get(suggestions).should('contain.text', recentEmptyCopy);
            capture('healthy-empty-suggestions', suggestions);
            cy.then(() => { phase = 'data'; }); visit(); cy.wait(['@diagnosis-data', '@suggestions-data', '@trackers-data']);
            cy.get(`[data-testid="admin-game-status-mismatch-${mismatch.gameId}"]`).should('contain.text', mismatch.gameId).and('contain.text', mismatch.reasons[0]);
            cy.get(`[data-testid="admin-game-status-suggestion-${day}"]`).should('exist');
            capture('synthetic-mismatch-diagnosis', result); capture('synthetic-recommendation', suggestions);
            for (const name of ['start-date', 'end-date', 'diagnose', 'refresh-suggestions', 'dry-run', 'apply']) {
                cy.get(`[data-testid="admin-game-status-${name}"]`).should('have.length', 1).then(($el) => {
                    const r = $el[0].getBoundingClientRect(); observations.push({ state: 'control-size', name, width: r.width, height: r.height });
                    if (r.width < 43.99 || r.height < 43.99) findings.push(`${name}: below44px`);
                });
            }
            cy.then(() => {
                expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                for (const kind of ['diagnosis', 'suggestions']) expect(replies.filter((x) => x.kind === kind).map((x) => x.status)).to.deep.equal([503, 200, 200]);
                expect(replies.filter((x) => x.kind === 'trackers').map((x) => x.status)).to.deep.equal([403, 200]);
                observations.push({ finished: true });
            }); cy.then(persist);
            cy.then(() => expect(findings, 'Game Status read-state design findings').to.deep.equal([]));
        });
    }
});
