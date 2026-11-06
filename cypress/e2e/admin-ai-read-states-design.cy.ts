/// <reference types="cypress" />

import type { AdminCoachAutoBriefOpsHealth } from '../../src/types/admin';
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Read-only synthetic UI. Never generate/evaluate/save a draft or copy a command.
describe('Admin AI initial reads and health states', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 950091, email: 'ai-design@example.invalid', name: '합성 관리자', handle: 'design_ai_admin',
                role: 'ROLE_ADMIN', favoriteTeam: null, hasPassword: true, profileImageUrl: null };
            const panel = '[data-testid="admin-coach-auto-brief-ops-panel"]';
            const empty = '[data-testid="admin-ai-auto-brief-unresolved-empty"]';
            const health: AdminCoachAutoBriefOpsHealth = {
                window: 'today', date_window: '합성 빈 운영 구간', generated_at_utc: '2026-10-25T12:00:00Z',
                runbook_path: 'synthetic/local-ui-fixture.md', recommended_command: '',
                summary: { loaded_target_count: 0, selected_target_count: 0, generated_success_count: 0, cache_hit_count: 0,
                    in_progress_count: 0, failed_count: 0, unresolved_count: 0, completed_count: 0,
                    cache_state_breakdown: {}, data_quality_breakdown: {} },
                gate: { verdict: 'WARN', thresholds: { max_unresolved: 0, max_failed_locked: 0, min_selected_targets: 0,
                    fail_on_missing_report: false }, failed_locked_count: 0, pending_wait_count: 0, insufficient_count: 0,
                    insufficient_ratio: 0, checks: { failed: [], warnings: ['실제 운영 판정이 아닌 합성 UI 상태입니다.'] } },
                unresolved_targets: [], latest_report: null,
            };
            let phase: 'error' | 'empty' = 'error', release!: () => void, foreignBlocked = 0;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            // Cap each empty-catalog auto-refetch by leaving its second request
            // locally pending. Never interpret that held loading state as a
            // naturally stable product state or forward it to a backend.
            const catalogHold = new Cypress.Promise<void>(() => {});
            const catalogs = { presets: 0, 'eval-cases': 0, artifacts: 0 };
            const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
            const replies: Array<Record<string, unknown>> = [], observations: Array<Record<string, unknown>> = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/admin-ai-${id}.json`, {
                width, font, requestedTheme: theme, role: viewer.role, phase, catalogs, foreignBlocked,
                mutations, unexpectedReads, replies, observations, findings,
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
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
                    return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                }
            });
            cy.intercept('**/api/**', (req) => { unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('**/auth/**', (req) => { unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { statusCode: 200, body: { success: true, data: toAuthApiUser(viewer) } });
            cy.intercept('GET', `${origin}/api/admin/stats`, { statusCode: 200, body: { success: true, data: { totalUsers: 1, totalPosts: 0, totalMates: 0 } } });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url);
                expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                req.reply({ statusCode: 200, body: { success: true, data: [] } });
            });
            cy.intercept('GET', `${origin}/api/dm/rooms/my`, { statusCode: 200, body: { success: true, data: [] } });
            cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', `${origin}/api/notifications/my*`, (req) => {
                const url = new URL(req.url);
                expect(url.pathname).to.equal('/api/notifications/my'); expect(url.search).to.equal('');
                req.reply({ statusCode: 200, body: [] });
            });
            cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { statusCode: 200, body: 0 });
            cy.intercept('GET', `${origin}/api/ai/coach/auto-brief/ops/health*`, (req) => {
                const url = new URL(req.url), current = phase;
                expect(url.pathname).to.equal('/api/ai/coach/auto-brief/ops/health');
                expect(url.searchParams.get('window')).to.equal('today'); req.alias = `health-${current}`;
                const reply = () => {
                    replies.push({ kind: 'health', phase: current, status: current === 'error' ? 503 : 200, search: url.search });
                    req.reply({ statusCode: current === 'error' ? 503 : 200, body: current === 'error'
                        ? { message: '합성 운영 상태 조회 실패' } : health });
                };
                return current === 'error' ? gate.then(reply) : reply();
            });
            for (const kind of Object.keys(catalogs) as Array<keyof typeof catalogs>) {
                cy.intercept('GET', `${origin}/api/ai/release-decision/${kind}`, (req) => {
                    catalogs[kind]++; const attempt = catalogs[kind]; req.alias = `catalog-${kind}-${attempt}`;
                    observations.push({ state: 'catalog-request', kind, attempt, held: attempt > 1 });
                    if (attempt > 1) return catalogHold;
                    replies.push({ kind, status: 200 }); req.reply({ statusCode: 200, body: [] });
                });
            }
            cy.viewport(width, width === 1280 ? 900 : 844);
            cy.clock(Date.UTC(2026, 9, 25, 12), ['Date']);
            cy.visit('/admin', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear();
                seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            cy.location('pathname').should('equal', '/admin');
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
            });
            align('[data-testid="admin-tab-ai"]'); cy.get('[data-testid="admin-tab-ai"]').click({ scrollBehavior: false });
            cy.wait(['@catalog-presets-1', '@catalog-eval-cases-1', '@catalog-artifacts-1']);
            const capture = (state: string, selector: string) => {
                cy.document().then((doc) => doc.fonts.ready); align(selector);
                cy.get(selector).first().should('be.visible').then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    observations.push({ state, text: el.innerText, width: el.clientWidth, scrollWidth: el.scrollWidth });
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                    if (el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: internal horizontal overflow`);
                }); cy.screenshot(`admin-ai-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const flagFalseEmpty = (state: string) => cy.get('body').then(($body) => {
                const el = $body[0].querySelector<HTMLElement>(empty);
                const rendered = Boolean(el && Cypress.dom.isVisible(el));
                observations.push({ state: `${state}-unknown-targets`, rendered, text: el?.innerText ?? null });
                if (rendered) findings.push(`${state}: unknown health shown as no unresolved targets`);
            });
            cy.get(panel).should('have.attr', 'aria-busy', 'true');
            flagFalseEmpty('loading'); capture('health-loading', panel);
            cy.then(() => release()); cy.wait('@health-error').its('response.statusCode').should('equal', 503);
            cy.get(panel).should('have.attr', 'aria-busy', 'false');
            cy.get('[data-testid="admin-ai-auto-brief-error"]').should('contain.text', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
            flagFalseEmpty('error'); capture('health-error', panel);
            capture('error-target-summary', '[data-testid="admin-ai-auto-brief-summary-grid"]');
            cy.then(() => { phase = 'empty'; }); align('[data-testid="admin-ai-auto-brief-refresh"]');
            cy.get('[data-testid="admin-ai-auto-brief-refresh"]').click({ scrollBehavior: false });
            cy.wait('@health-empty').its('response.statusCode').should('equal', 200);
            cy.get(panel).should('have.attr', 'aria-busy', 'false');
            cy.get('[data-testid="admin-ai-auto-brief-refresh"]').should('be.enabled');
            cy.get('[data-testid="admin-ai-auto-brief-error"]').should('not.exist');
            cy.contains(panel, health.date_window).should('exist'); cy.get(empty).should('contain.text', 'unresolved 대상이 없습니다.');
            capture('health-success-empty', panel); capture('healthy-empty-targets', empty);
            capture('release-catalog-request-cap', '[data-testid="admin-ai-artifact-list"]');
            for (const selector of ['admin-ai-auto-brief-refresh', 'admin-ai-auto-brief-window-trigger', 'admin-ai-auto-brief-copy-command']) {
                cy.get(`[data-testid="${selector}"]`).should('have.length', 1).then(($el) => {
                    const r = $el[0].getBoundingClientRect(); observations.push({ state: 'health-control', selector, width: r.width, height: r.height });
                    if (r.width < 43.99 || r.height < 43.99) findings.push(`${selector}: below44px`);
                });
            }
            cy.then(() => {
                for (const [kind, attempts] of Object.entries(catalogs)) if (attempts > 1) findings.push(`${kind}: empty success triggers automatic repeat read (subsequent requests locally held)`);
                expect(replies.filter((x) => x.kind === 'health').map((x) => x.status)).to.deep.equal([503, 200]);
                expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                observations.push({ finished: true });
            }); cy.then(persist);
            cy.then(() => expect(findings, 'Admin AI bounded read-state findings').to.deep.equal([]));
        });
    }
});
