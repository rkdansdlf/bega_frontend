/// <reference types="cypress" />

const noScrollSelectOptions: Partial<Cypress.SelectOptions> & { scrollBehavior: false } = { scrollBehavior: false };
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Only fictional catalog reads and local selections. Never generate or evaluate a draft.
describe('Admin AI evaluation catalog read presentation', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 990772, email: 'eval-ui@example.invalid', name: '합성 관리자', handle: 'synthetic_eval_catalog', role: 'ROLE_ADMIN', hasPassword: true, favoriteTeam: null, profileImageUrl: null };
            const presets = ['UI_ALPHA', 'UI_EMPTY'].map((scenario) => ({ scenario, task_prompt: '실행하지 않는 합성 화면입니다.', seed_paths: ['synthetic/ui.md'], allowed_roots: ['synthetic/'] }));
            const cases = [
                { case_id: 'CASE_A', scenario: 'UI_ALPHA', expected_decision: 'GO', required_keywords: ['alpha', 'safe'], required_sources: ['synthetic/source-a.md'] },
                { case_id: 'CASE_B', scenario: 'UI_ALPHA', expected_decision: 'PENDING', required_keywords: ['beta'], required_sources: ['synthetic/source-b.md'] },
                { case_id: 'CASE_OTHER', scenario: 'UI_OTHER', expected_decision: 'NO_GO', required_keywords: ['other'], required_sources: [] },
            ];
            const root = '[data-testid="admin-ai-release-decision-runtime"]';
            const selector = (name: string) => `[data-testid="admin-ai-${name}"]`;
            const refresh = selector('refresh-eval-cases'), select = selector('eval-case-trigger'), keywords = selector('required-keyword-list');
            const error = selector('evaluation-error'), run = selector('run-eval'), scenario = selector('scenario-trigger');
            const card = `${root} > div:first-child > div:has(${refresh})`;
            const gates = Array.from({ length: 4 }, () => {
                let release!: () => void; const promise = new Cypress.Promise<void>((resolve) => { release = resolve; });
                return { promise, release };
            });
            const hold = new Cypress.Promise<void>(() => {});
            const requests: number[] = [], replies: number[] = [], writes: string[] = [], unknown: string[] = [], findings: string[] = [];
            const observations: Array<Record<string, unknown>> = [], tabs: Array<{ trusted: boolean; shift: boolean }> = [];
            const siblings = { presets: 0, health: 0, artifacts: 0 };
            let foreign = 0, expectedDate = '';
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) writes.push(`${req.method} ${url.href}`);
                if (url.origin !== origin) { foreign++; return req.reply({ forceNetworkError: true }); }
                if (mutation) return req.reply({ statusCode: 503, body: {} });
            });
            cy.intercept('**/api/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('**/auth/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { body: { success: true, data: toAuthApiUser(viewer) } });
            cy.intercept('GET', `${origin}/api/admin/stats`, { body: { success: true, data: { totalUsers: 1, totalPosts: 0, totalMates: 0 } } });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                req.reply({ body: { success: true, data: [] } });
            });
            cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
            cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
            cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
            cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
            cy.intercept('GET', `${origin}/api/ai/coach/auto-brief/ops/health*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/ai/coach/auto-brief/ops/health');
                expect(Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b))).to.deep.equal([
                    ['end_date', expectedDate], ['start_date', expectedDate], ['window', 'today'],
                ]); siblings.health++; return hold;
            });
            cy.intercept('GET', `${origin}/api/ai/release-decision/presets`, (req) => { siblings.presets++; req.reply({ body: presets }); });
            cy.intercept('GET', `${origin}/api/ai/release-decision/artifacts`, () => { siblings.artifacts++; return hold; });
            cy.intercept('GET', `${origin}/api/ai/release-decision/eval-cases`, (req) => {
                const attempt = requests.length + 1; requests.push(attempt); req.alias = `eval-cases-${attempt}`;
                if (attempt > 4) return hold;
                return gates[attempt - 1].promise.then(() => {
                    const status = attempt === 1 || attempt === 3 ? 503 : 200; replies.push(status);
                    req.reply({ statusCode: status, body: status === 200 ? cases : { message: 'SYNTHETIC_EVAL_CATALOG_UNAVAILABLE' } });
                });
            });
            cy.viewport(width, width === 1280 ? 900 : 844); cy.clock(Date.UTC(2099, 0, 2, 12), ['Date']);
            cy.visit('/admin', { onBeforeLoad(win) {
                const now = new win.Date(); expectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (target: string) => cy.get(target).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                win.scrollBy({ top: el.getBoundingClientRect().top - header - 16, behavior: 'instant' });
            });
            align('[data-testid="admin-tab-ai"]'); cy.get('[data-testid="admin-tab-ai"]').click({ scrollBehavior: false });
            cy.get(scenario).should('have.value', 'UI_ALPHA');
            const sample = (state: string, target = card) => {
                cy.document().then((doc) => doc.fonts.ready); align(target);
                cy.get(target).should('be.visible').then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    const controls = Array.from(el.querySelectorAll('button,select')).map((node) => {
                        const rect = node.getBoundingClientRect(); return { id: node.getAttribute('data-testid'), width: rect.width, height: rect.height };
                    });
                    const overflow = Array.from(el.querySelectorAll('h4,p,label,select,button')).filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => ({ tag: node.tagName, text: node.textContent?.slice(0, 100), width: node.clientWidth, scrollWidth: node.scrollWidth }));
                    observations.push({ state, width: el.clientWidth, scrollWidth: el.scrollWidth, controls, overflow, text: el.innerText });
                    if (el.scrollWidth > el.clientWidth + 1 || overflow.length) findings.push(`${state}: internal overflow`);
                    if (controls.some((control) => control.width < 44 || control.height < 44)) findings.push(`${state}: controls below44`);
                });
                cy.screenshot(`eval-cases-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false });
            };
            cy.get(select).should('be.disabled').and('contain.text', '평가 케이스 로딩 중'); cy.get(run).should('be.disabled'); sample('initial-held');
            cy.then(() => gates[0].release()); cy.wait('@eval-cases-1');
            cy.wrap(null).should(() => expect(requests).to.deep.equal([1, 2]));
            cy.get(select).should('be.disabled'); sample('after503-repeat-held');
            cy.then(() => gates[1].release()); cy.wait('@eval-cases-2');
            cy.get(select).should('be.enabled'); align(select); cy.get(select).select('CASE_B', noScrollSelectOptions);
            const assertData = (enabled = true) => {
                cy.get(select).should(enabled ? 'be.enabled' : 'be.disabled').and('have.value', 'CASE_B');
                cy.get(select).find('option').should(($options) => expect(Array.from($options, (node) => (node as HTMLOptionElement).value)).to.deep.equal(['CASE_A', 'CASE_B']));
                cy.get(keywords).children().should(($nodes) => expect(Array.from($nodes, (node) => node.textContent)).to.deep.equal(['beta']));
                cy.contains(card, '대기').should('exist'); cy.get(run).should('be.disabled');
            };
            assertData(); sample('populated-selected'); sample('selected-keywords', keywords);
            cy.get(refresh).focus();
            cy.document().then((doc) => doc.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted, shift: event.shiftKey }); }));
            const focusSample = (name: string) => {
                cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                cy.document().then((doc) => {
                    const active = doc.activeElement as HTMLElement, rect = active.getBoundingClientRect();
                    expect(active.getAttribute('data-testid')).to.equal(`admin-ai-${name}`);
                    const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    const clear = Boolean(hit && (hit === active || active.contains(hit)));
                    observations.push({ state: `focus-${name}`, clear, focusVisible: active.matches(':focus-visible'), rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, hit: hit?.outerHTML.slice(0, 700) ?? null });
                    if (!clear || !active.matches(':focus-visible')) findings.push(`${name}: focus obscured or invisible`);
                });
                cy.screenshot(`eval-cases-${id}-focus-${name}`, { capture: 'viewport', disableTimersAndAnimations: false });
            };
            cy.press(Cypress.Keyboard.Keys.TAB); focusSample('eval-case-trigger');
            cy.then(async () => {
                const params = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 };
                await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyDown' } });
                await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyUp' } });
            }); focusSample('refresh-eval-cases');
            align(refresh); cy.get(refresh).click({ scrollBehavior: false });
            cy.wrap(null).should(() => expect(requests).to.deep.equal([1, 2, 3])); assertData(false); sample('cached-held');
            cy.then(() => gates[2].release()); cy.wait('@eval-cases-3');
            cy.get(error).should('have.attr', 'role', 'alert').and('not.be.empty'); assertData(); sample('cached-error', error); sample('cached-retained');
            align(refresh); cy.get(refresh).click({ scrollBehavior: false });
            cy.wrap(null).should(() => expect(requests).to.deep.equal([1, 2, 3, 4])); cy.then(() => gates[3].release()); cy.wait('@eval-cases-4');
            cy.get(error).should('not.exist'); assertData(); sample('recovered');
            align(scenario); cy.get(scenario).select('UI_EMPTY', noScrollSelectOptions);
            cy.get(select).should('be.disabled').and('contain.text', '시나리오용 케이스 없음'); cy.get(keywords).should('not.exist'); cy.get(error).should('not.exist'); sample('filtered-empty');
            align(scenario); cy.get(scenario).select('UI_ALPHA', noScrollSelectOptions); cy.get(select).should('have.value', 'CASE_A');
            cy.get(keywords).children().should(($nodes) => expect(Array.from($nodes, (node) => node.textContent)).to.deep.equal(['alpha', 'safe']));
            cy.get(run).should('be.disabled'); sample('filter-return');
            cy.then(() => {
                expect(requests).to.deep.equal([1, 2, 3, 4]); expect(replies).to.deep.equal([503, 200, 503, 200]);
                expect(siblings).to.deep.equal({ presets: 1, health: 1, artifacts: 1 });
                expect(tabs).to.deep.equal([{ trusted: true, shift: false }, { trusted: true, shift: true }]);
                expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
            });
            cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/eval-cases-${id}.json`, { width, font, theme, role: viewer.role, requests, replies, siblings, writes, unknown, foreign, tabs, observations, findings, finished: true }));
            cy.then(() => expect(findings).to.deep.equal([]));
        });
    }
});
