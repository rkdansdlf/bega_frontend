/// <reference types="cypress" />

import type { AdminStadium, Place } from '../../src/api/admin';
import { seedCypressAuthState } from '../support/auth';

// Fictional places only. Open/cancel forms, but never submit or open deletion.
describe('Admin stadium/place read-only design states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const profile = { id: 99900, email: 'stadium-design@example.invalid', name: '합성 관리자',
                        handle: 'synthetic-stadium-admin', role: 'ROLE_ADMIN', favoriteTeam: null, hasPassword: true, profileImageUrl: null };
                    const stadiums: AdminStadium[] = ['A', 'B'].map((key) => ({ stadiumId: `SYNTH_${key}`,
                        stadiumName: `합성 검증 공간 ${key}`, team: '', lat: 0, lng: 0, address: '합성 주소', phone: '' }));
                    const places: Place[] = [99901, 99902].map((key) => ({ id: key, stadiumName: stadiums[0].stadiumName,
                        category: '기타', name: `합성 장소 ${key}`, description: '실제 장소가 아닌 합성 검증 항목입니다.',
                        lat: 0, lng: 0, address: '합성 주소', phone: '', rating: 3, openTime: '00:00', closeTime: '00:00' }));
                    const panel = '[data-testid="admin-stadiums-panel"]', region = '[data-testid="admin-stadiums-table-region"]';
                    const dialog = '[data-testid="admin-place-dialog"]', select = '[data-testid="admin-stadium-select-trigger"]';
                    type Phase = 'data' | 'places-error' | 'stadiums-error' | 'stadiums-empty';
                    let phase: Phase = 'data', writes = 0, stadiumPending = 0, placePending = 0;
                    let releaseStadiums!: () => void, releasePlaces!: () => void;
                    const stadiumGate = new Cypress.Promise<void>((resolve) => { releaseStadiums = resolve; });
                    const placeGate = new Cypress.Promise<void>((resolve) => { releasePlaces = resolve; });
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [], responses: Array<Record<string, unknown>> = [];
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/admin-stadiums-${id}.json`, {
                        width, font, theme, role: profile.role, findings, observations, responses, writes,
                    });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        const url = new URL(req.url);
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                            writes++; return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                        }
                        if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                        if (url.pathname !== '/admin' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                            && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                    });
                    cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    cy.intercept('**/auth/**', { statusCode: 503, body: {} });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: profile } });
                    cy.intercept('GET', '**/api/admin/stats*', { statusCode: 200, body: { success: true, data: { totalUsers: 1, totalPosts: 0, totalMates: 0 } } });
                    cy.intercept('GET', '**/api/admin/users*', { statusCode: 200, body: { success: true, data: [] } }).as('users');
                    cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                    cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/stadiums', (req) => {
                        const state = phase; stadiumPending++; req.alias = `stadiums-${state}`;
                        const reply = () => {
                            const status = state === 'stadiums-error' ? 503 : 200;
                            responses.push({ kind: 'stadiums', state, status });
                            req.reply({ statusCode: status, body: status === 503 ? { message: 'synthetic stadium failure' }
                                : state === 'stadiums-empty' ? [] : stadiums });
                        };
                        return state === 'data' ? stadiumGate.then(reply) : reply();
                    });
                    cy.intercept('GET', '**/api/stadiums/SYNTH_*/places', (req) => {
                        const state = phase, key = new URL(req.url).pathname.split('/').at(-2)!;
                        placePending++; req.alias = `places-${state}-${key}`;
                        const reply = () => {
                            const status = state === 'places-error' ? 503 : 200;
                            responses.push({ kind: 'places', state, key, status });
                            req.reply({ statusCode: status, body: status === 503 ? { message: 'synthetic places failure' }
                                : key === 'SYNTH_B' ? [] : places });
                        };
                        return state === 'data' ? placeGate.then(reply) : reply();
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const align = (selector: string) => cy.get(selector).first().then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                        const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                        win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                    });
                    const measure = (selector: string) => cy.get(selector).each(($el) => {
                        const el = $el[0], rect = el.getBoundingClientRect(), control = el.getAttribute('data-testid') || el.id || el.getAttribute('aria-label');
                        observations.push({ control, width: rect.width, height: rect.height });
                        if (rect.width < 43.99 || rect.height < 43.99) findings.push(`${control}: below44px`);
                    });
                    const capture = (state: string, selector = region) => {
                        if (selector !== dialog) align(selector);
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                            expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                            observations.push({ state, text: el.innerText.replace(/\s+/g, ' ').trim() });
                            if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                            if (selector === dialog) {
                                const title = el.querySelector('h2 > span')!, background = win.getComputedStyle(el).backgroundColor;
                                const titleColor = win.getComputedStyle(title).color;
                                observations.push({ state: `${state}-colors`, background, titleColor, inheritsDark: Boolean(el.closest('.dark')) });
                                if (background === titleColor) findings.push(`${state}: title equals background color`);
                            }
                            if (state.endsWith('loading')) {
                                const status = el.querySelector<HTMLElement>('[role="status"]')!, rect = status.getBoundingClientRect();
                                const clipped = Array.from(status.childNodes).filter((node) => node.nodeType === 3 && node.textContent?.trim()).some((node) => {
                                    const range = doc.createRange(); range.selectNodeContents(node);
                                    return Array.from(range.getClientRects()).some((r) => r.left < rect.left - 1 || r.right > rect.right + 1);
                                });
                                const spinner = status.querySelector<HTMLElement>('.animate-spin')!;
                                const wordLines: Array<{ word: string; lines: number }> = [];
                                for (const node of Array.from(status.childNodes).filter((node) => node.nodeType === 3)) {
                                    const text = node.textContent ?? '';
                                    for (const word of ['구장', '장소', '목록', '로딩']) {
                                        const start = text.indexOf(word);
                                        if (start < 0) continue;
                                        const range = doc.createRange(); range.setStart(node, start); range.setEnd(node, start + word.length);
                                        wordLines.push({ word, lines: range.getClientRects().length });
                                    }
                                }
                                observations.push({ state: `${state}-geometry`, clipped, spinnerWidth: spinner.offsetWidth, spinnerHeight: spinner.offsetHeight, wordLines });
                                if (clipped) findings.push(`${state}: loading copy exceeds region`);
                                if (wordLines.some((item) => item.lines > 1)) findings.push(`${state}: loading words fragment across lines`);
                            }
                            if (state.endsWith('error-alert')) {
                                const rect = el.getBoundingClientRect(), range = doc.createRange(); range.selectNodeContents(el);
                                const clipped = Array.from(range.getClientRects()).some((r) => r.bottom > rect.bottom + 1 || r.right > rect.right + 1);
                                observations.push({ state: `${state}-copy`, clipped, title: el.getAttribute('title'), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
                                if (clipped) findings.push(`${state}: error copy clipped`);
                            }
                            if (state === 'places-error' && el.innerText.includes('등록된 장소가 없습니다.')) findings.push('failed places query presented as healthy empty');
                            if (state === 'stadiums-empty' && el.innerText.includes('구장을 먼저 선택하세요.')) findings.push('empty stadium list prompts unavailable selection');
                        });
                        cy.screenshot(`admin-stadiums-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
                    };
                    const visit = () => {
                        cy.visit('/admin', { onBeforeLoad(win) {
                            win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, profile, undefined, { theme });
                            win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                        } });
                        cy.wait('@users'); align('[data-testid="admin-tab-stadiums"]');
                        cy.get('[data-testid="admin-tab-stadiums"]').click({ scrollBehavior: false }); cy.get(panel, { timeout: 20000 }).should('exist');
                    };
                    const modalField = (selector: string) => cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    visit(); cy.wrap(null).should(() => expect(stadiumPending).to.be.greaterThan(0));
                    cy.contains(region, '구장 목록 로딩 중...').should('exist'); capture('stadiums-loading');
                    cy.then(() => releaseStadiums()); cy.wait('@stadiums-data').its('response.body').should('have.length', 2);
                    cy.wrap(null).should(() => expect(placePending).to.be.greaterThan(0));
                    cy.contains(region, '장소 목록 로딩 중...').should('exist'); capture('places-loading');
                    cy.then(() => releasePlaces()); cy.wait('@places-data-SYNTH_A').its('response.body').should('have.length', 2);
                    cy.get(`${panel} tbody tr`).should('have.length', 2);
                    measure(`${select}, [data-testid="admin-stadium-add-place"], [data-testid="admin-place-row-99901"] button`);
                    capture('selector', panel); capture('places-data');
                    align('[data-testid="admin-stadium-add-place"]'); cy.get('[data-testid="admin-stadium-add-place"]').click({ scrollBehavior: false });
                    cy.get(dialog).should('exist'); cy.get('#admin-place-name').should('have.value', '');
                    cy.get('[data-testid="admin-place-submit"]').should('be.disabled'); measure(`${dialog} input, ${dialog} select, ${dialog} button`); capture('create-empty', dialog);
                    modalField('#admin-place-name'); cy.get('#admin-place-name').type('합성 작성 대기', { scrollBehavior: false });
                    modalField('#admin-place-category'); cy.get('#admin-place-category').select('기타');
                    cy.get('[data-testid="admin-place-submit"]').should('not.be.disabled'); capture('create-ready', dialog);
                    cy.get('[data-testid="admin-place-cancel"]').click(); cy.get(dialog).should('not.exist');
                    align('[data-testid="admin-place-edit-99901"]'); cy.get('[data-testid="admin-place-edit-99901"]').click({ scrollBehavior: false });
                    cy.get(dialog).should('exist'); cy.get('#admin-place-name').should('have.value', places[0].name);
                    cy.get('[data-testid="admin-place-submit"]').should('not.be.disabled'); capture('edit-existing', dialog);
                    cy.get('[data-testid="admin-place-cancel"]').click(); cy.get(dialog).should('not.exist');
                    align(select); cy.get(select).select('SYNTH_B');
                    cy.wait('@places-data-SYNTH_B').its('response.body').should('deep.equal', []);
                    cy.contains(region, '등록된 장소가 없습니다.').should('exist'); capture('places-empty');
                    cy.then(() => { phase = 'places-error'; }); visit();
                    cy.wait('@stadiums-places-error').its('response.statusCode').should('equal', 200);
                    cy.wait('@places-places-error-SYNTH_A').its('response.statusCode').should('equal', 503);
                    cy.get(region).should('have.attr', 'aria-busy', 'false');
                    cy.get(`${panel} [role="alert"]`).should('contain.text', '장소 목록을 불러올 수 없습니다.'); capture('places-error-alert', `${panel} [role="alert"]`); capture('places-error');
                    cy.then(() => { phase = 'stadiums-error'; }); visit();
                    cy.wait('@stadiums-stadiums-error').its('response.statusCode').should('equal', 503);
                    cy.get(region).should('have.attr', 'aria-busy', 'false');
                    cy.get(`${panel} [role="alert"]`).should('contain.text', '구장 목록을 불러올 수 없습니다.'); capture('stadiums-error-alert', `${panel} [role="alert"]`); capture('stadiums-error');
                    cy.then(() => { phase = 'stadiums-empty'; }); visit();
                    cy.wait('@stadiums-stadiums-empty').its('response.body').should('deep.equal', []);
                    cy.get(region).should('have.attr', 'aria-busy', 'false').and('not.contain.text', '로딩 중');
                    cy.get(select).should('not.be.disabled');
                    cy.get(`${select} option`).first().should('have.text', '구장을 선택하세요');
                    cy.get(`${select} option`).should('have.length', 1); cy.get('[data-testid="admin-stadium-add-place"]').should('be.disabled'); capture('stadiums-empty');
                    cy.then(() => { expect(writes).to.equal(0); observations.push({ finished: true }); }); cy.then(persist);
                    cy.then(() => expect(findings, 'Admin stadium/place design findings').to.deep.equal([]));
                });
            }
        }
    }
});
