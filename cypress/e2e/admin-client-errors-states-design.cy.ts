/// <reference types="cypress" />

import type { AdminClientErrorDashboard, AdminClientErrorEventSummary } from '../../src/types/admin';
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('Client Errors synthetic read-only states', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 950092, email: 'client-design@example.invalid', name: '합성 관리자', handle: 'design_client_admin',
                role: 'ROLE_ADMIN', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
            const panel = '[data-testid="admin-client-error-panel"]', table = '[data-testid="admin-client-error-events-scroll"]';
            const insights = '[data-testid="admin-client-error-insights"]', dialog = '[data-testid="admin-client-error-detail"]';
            const event: AdminClientErrorEventSummary = { eventId: 'SYNTH_CLIENT_001', bucket: 'api', source: 'api',
                message: '실제 사용자가 아닌 합성 오류입니다.', statusCode: 503, statusGroup: '5xx', responseCode: 'SYNTHETIC',
                route: '/synthetic/client-check', normalizedRoute: '/synthetic/client-check', method: 'GET',
                endpoint: '/api/synthetic/client-check', normalizedEndpoint: '/api/synthetic/client-check', fingerprint: 'SYNTH_FP_001',
                occurredAt: '2026-10-25T11:30:00Z', sessionId: null, userId: null, feedbackCount: 1 };
            const feedback = { eventId: event.eventId, route: event.route, actionTaken: 'SYNTHETIC_ONLY',
                comment: '실제 제보가 아닌 합성 피드백입니다.', occurredAt: event.occurredAt };
            const baseDashboard: AdminClientErrorDashboard = { from: '2026-10-24T12:00:00.000Z', to: '2026-10-25T12:00:00.000Z',
                granularity: 'hour', totals: { api: 0, runtime: 0, feedback: 0, uniqueFingerprints: 0, affectedRoutes: 0 },
                timeSeries: [], topFingerprints: [], recentFeedback: [], recentAlerts: [] };
            const dataDashboard: AdminClientErrorDashboard = { ...baseDashboard,
                totals: { api: 1, runtime: 0, feedback: 1, uniqueFingerprints: 1, affectedRoutes: 1 },
                timeSeries: [{ bucketStart: '2026-10-25T11:00:00Z', api: 1, runtime: 0, feedback: 1 }], recentFeedback: [feedback],
                topFingerprints: [{ fingerprint: event.fingerprint, bucket: 'api', source: 'api', message: event.message,
                    route: event.route, endpoint: event.endpoint, statusGroup: '5xx', method: 'GET', count: 1, uniqueSessions: 0,
                    latestEventId: event.eventId, latestOccurredAt: event.occurredAt, latestAlertSentAt: null, latestAlertChannel: null }] };
            let phase: 'error' | 'empty' | 'data' = 'error', detailPhase: 'error' | 'data' = 'error', foreignBlocked = 0;
            let release!: () => void, releaseDetail!: () => void;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            const detailGate = new Cypress.Promise<void>((resolve) => { releaseDetail = resolve; });
            const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
            const replies: Array<Record<string, unknown>> = [], observations: Array<Record<string, unknown>> = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/client-errors-${id}.json`, {
                width, font, requestedTheme: theme, phase, detailPhase, foreignBlocked, mutations, unexpectedReads, replies, observations, findings,
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
            for (const kind of ['dashboard', 'events'] as const) cy.intercept('GET', `${origin}/api/admin/client-errors/${kind}*`, (req) => {
                const url = new URL(req.url), current = phase;
                expect(url.pathname).to.equal(`/api/admin/client-errors/${kind}`);
                const params = Object.fromEntries(url.searchParams.entries());
                expect(params.from).to.equal(baseDashboard.from); expect(params.to).to.equal(baseDashboard.to);
                expect(Array.from(url.searchParams.keys()).sort()).to.deep.equal(kind === 'events' ? ['from', 'page', 'size', 'to'] : ['from', 'to']);
                if (kind === 'events') { expect(params.page).to.equal('0'); expect(params.size).to.equal('20'); }
                req.alias = `${kind}-${current}`;
                const reply = () => {
                    const status = current === 'error' ? 503 : 200;
                    replies.push({ kind, phase: current, status, search: url.search });
                    const content = current === 'data' ? [event] : [];
                    req.reply({ statusCode: status, body: status === 503 ? {} : { success: true, data: kind === 'dashboard'
                        ? current === 'data' ? dataDashboard : baseDashboard
                        : { content, last: true, totalElements: content.length, totalPages: content.length ? 1 : 0, size: 20, number: 0 } } });
                };
                return current === 'error' ? gate.then(reply) : reply();
            });
            cy.intercept('GET', `${origin}/api/admin/client-errors/events/${event.eventId}`, (req) => {
                const current = detailPhase; expect(new URL(req.url).search).to.equal(''); req.alias = `detail-${current}`;
                const reply = () => {
                    replies.push({ kind: 'detail', phase: current, status: current === 'error' ? 503 : 200 });
                    req.reply({ statusCode: current === 'error' ? 503 : 200, body: current === 'error' ? {} : { success: true,
                        data: { event, stack: 'SyntheticError: local-only fixture', componentStack: 'SyntheticComponent', feedback: [feedback], sameFingerprintRecentEvents: [] } } });
                };
                return current === 'error' ? detailGate.then(reply) : reply();
            });
            cy.viewport(width, width === 1280 ? 900 : 844); cy.clock(Date.UTC(2026, 9, 25, 12), ['Date']);
            cy.visit('/admin', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
            });
            const capture = (state: string, selector: string) => {
                cy.document().then((doc) => doc.fonts.ready);
                if (!selector.startsWith(dialog)) align(selector);
                cy.get(selector).first().should('be.visible').then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    if (selector.startsWith(dialog)) {
                        const modal = doc.querySelector<HTMLElement>(dialog)!;
                        const background = win.getComputedStyle(modal).backgroundColor;
                        observations.push({ state: `${state}-dialog-theme`, background, inheritsDark: Boolean(modal.closest('.dark')) });
                        if (background === 'rgb(255, 255, 255)') findings.push(`${state}: Admin detail dialog has white background`);
                    }
                    observations.push({ state, text: el.innerText, width: el.clientWidth, scrollWidth: el.scrollWidth });
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                    // The data table and trace blocks intentionally scroll horizontally.
                    if (selector !== table && !selector.includes('stack') && el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: internal horizontal overflow`);
                }); cy.screenshot(`client-errors-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const statusClip = (state: string) => cy.get(`${table} td[role="status"]`).then(($el) => {
                const el = $el[0], doc = el.ownerDocument, range = doc.createRange(); range.selectNodeContents(el);
                const bounds = doc.querySelector(table)!.getBoundingClientRect();
                const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
                expect(rects.length).to.be.greaterThan(0);
                const clipped = rects.some((r) => r.left < bounds.left - 1 || r.right > bounds.right + 1);
                observations.push({ state: `${state}-status-cell`, clipped, wrapperWidth: bounds.width, text: el.textContent?.trim() });
                if (clipped) findings.push(`${state}: status copy requires horizontal scrolling`);
            });
            const refresh = () => { align('[data-testid="admin-client-error-refresh"]'); cy.get('[data-testid="admin-client-error-refresh"]').click({ scrollBehavior: false }); };
            const openDetail = () => {
                cy.get(table).then(($el) => {
                    const needed = $el[0].scrollWidth > $el[0].clientWidth + 1;
                    observations.push({ state: 'detail-table-scroll', needed });
                    if (needed) cy.wrap($el).scrollTo('right');
                });
                align(`[data-testid="admin-client-error-detail-${event.eventId}"]`);
                cy.get(`[data-testid="admin-client-error-detail-${event.eventId}"]`).click({ scrollBehavior: false });
            };
            const activateInsights = () => {
                cy.get('body').then(($body) => {
                    const skeleton = $body[0].querySelector('[data-testid="admin-client-error-insights-skeleton-full"]');
                    skeleton?.scrollIntoView({ block: 'center', behavior: 'instant' });
                }); cy.get(insights, { timeout: 20000 }).should('exist');
            };
            align('[data-testid="admin-tab-client-errors"]'); cy.get('[data-testid="admin-tab-client-errors"]').click({ scrollBehavior: false });
            cy.get(`${table} td[aria-busy="true"]`).should('contain.text', '이벤트를 불러오는 중입니다.');
            capture('loading-events', table); statusClip('loading');
            cy.then(() => release()); cy.wait(['@dashboard-error', '@events-error']).then((interceptions) => {
                interceptions.forEach((x) => expect(x.response?.statusCode).to.equal(503));
            });
            cy.get(`${panel} > [role="alert"]`).should('contain.text', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
            cy.get(panel).should('not.have.attr', 'aria-busy', 'true'); capture('error-events', table);
            cy.get(table).then(($el) => { if ($el.text().includes('조건에 맞는 이벤트가 없습니다.')) findings.push('failed events read shown as healthy empty'); });
            capture('error-chart', '[data-testid="admin-client-error-chart-state"]');
            cy.get('[data-testid="admin-client-error-trend-chart-status"]').then(($el) => {
                if ($el.text().includes('표시할 데이터가 없습니다.')) findings.push('failed dashboard read shown as empty chart');
            });
            activateInsights(); capture('error-insights', insights);
            cy.get(insights).then(($el) => {
                if ($el.text().includes('최근 피드백이 없습니다.') || $el.text().includes('최근 알림 이력이 없습니다.')) findings.push('failed dashboard read shown as empty insights');
            });
            cy.then(() => { phase = 'empty'; }); refresh(); cy.wait(['@dashboard-empty', '@events-empty']);
            cy.get(`${panel} > [role="alert"]`).should('not.exist'); cy.get(panel).should('not.have.attr', 'aria-busy', 'true');
            cy.get(table).should('contain.text', '조건에 맞는 이벤트가 없습니다.'); capture('healthy-empty-events', table); statusClip('empty');
            capture('healthy-empty-insights', insights);
            cy.then(() => { phase = 'data'; }); refresh(); cy.wait(['@dashboard-data', '@events-data']);
            cy.get(`${panel} > [role="alert"]`).should('not.exist');
            cy.get(table).should('contain.text', event.message);
            cy.get('[data-testid="admin-client-error-trend-chart"] svg[role="img"]').should('have.attr', 'aria-label',
                '클라이언트 오류 추이 차트, 1개 구간, API 최대 1, Runtime 최대 0, Feedback 최대 1');
            capture('data-events', table); cy.get(insights).should('contain.text', feedback.comment); capture('data-insights', insights);
            openDetail(); cy.get(`${dialog} [data-testid="admin-client-error-detail-loading"]`, { timeout: 20000 }).should('exist');
            capture('detail-loading', `${dialog} [data-testid="admin-client-error-detail-loading"]`);
            cy.then(() => releaseDetail()); cy.wait('@detail-error').its('response.statusCode').should('equal', 503);
            cy.get(`${dialog} [data-testid="admin-client-error-detail-missing"]`).should('contain.text', '선택한 이벤트를 불러오지 못했습니다.');
            capture('detail-error', `${dialog} [data-testid="admin-client-error-detail-missing"]`);
            cy.get(`${dialog} button[aria-label="닫기"]`).click(); cy.get(dialog).should('not.exist');
            cy.then(() => { detailPhase = 'data'; }); openDetail(); cy.wait('@detail-data');
            cy.get(`${dialog} [data-testid="admin-client-error-detail-content"]`).should('contain.text', event.message).and('contain.text', feedback.comment);
            const messageParagraph = `${dialog} [data-testid="admin-client-error-detail-metadata"] p:nth-of-type(2)`;
            cy.get(messageParagraph).should('have.length', 1).and('have.text', event.message).then(($el) => {
                $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
            });
            capture('detail-data', messageParagraph);
            cy.get(`${dialog} button[aria-label="닫기"]`).focus(); cy.press(Cypress.Keyboard.Keys.TAB);
            cy.document().then((doc) => { const inside = Boolean(doc.querySelector(dialog)?.contains(doc.activeElement));
                observations.push({ state: 'one-native-tab', programmaticStart: 'close', inside }); if (!inside) findings.push('selected native Tab leaves detail dialog'); });
            cy.press(Cypress.Keyboard.Keys.ESC); cy.get(dialog).should('not.exist');
            cy.get(panel).then(($el) => {
                const alert = $el[0].querySelector<HTMLElement>(':scope > [role="alert"]');
                observations.push({ state: 'post-detail-recovery-alert', text: alert?.innerText ?? null });
                if (alert && Cypress.dom.isVisible(alert)) findings.push('successful detail recovery leaves prior read-error alert');
            });
            capture('post-detail-recovery', panel);
            for (const name of ['window', 'refresh', 'bucket', 'source', 'status', 'route', 'fingerprint-input', 'search', 'previous', 'next', `detail-${event.eventId}`]) {
                cy.get(`[data-testid="admin-client-error-${name}"]`).should('have.length', 1).then(($el) => {
                    const r = $el[0].getBoundingClientRect(); observations.push({ state: 'control-size', name, width: r.width, height: r.height });
                    if (r.width < 43.99 || r.height < 43.99) findings.push(`${name}: below44px`);
                });
            }
            cy.then(() => {
                expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                expect(replies.filter((x) => x.kind === 'dashboard').map((x) => x.status)).to.deep.equal([503, 200, 200]);
                expect(replies.filter((x) => x.kind === 'events').map((x) => x.status)).to.deep.equal([503, 200, 200]);
                expect(replies.filter((x) => x.kind === 'detail').map((x) => x.status)).to.deep.equal([503, 200]);
                observations.push({ finished: true });
            }); cy.then(persist);
            cy.then(() => expect(findings, 'Client Errors design findings').to.deep.equal([]));
        });
    }
});
