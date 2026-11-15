/// <reference types="cypress" />
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Fictional catalog only: no draft, evaluation, save, copy or download activation.
describe('Admin AI presets read and selected focus states', () => {
    const focusOnly = Cypress.expose('presetsFocusOnly') === true;
    const boundaryOnly = Cypress.expose('presetsBoundaryOnly') === true;
    for (const width of focusOnly ? [1280] : boundaryOnly ? [1023, 1024] : [320, 390, 1280]) for (const font of focusOnly || boundaryOnly ? [32] : [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 990771, email: 'preset-ui@example.invalid', name: '합성 관리자', handle: 'synthetic_presets', role: 'ROLE_ADMIN', hasPassword: true, favoriteTeam: null, profileImageUrl: null };
            const presets = [
                { scenario: 'UI_ALPHA', task_prompt: '실행하지 않는 첫 번째 합성 화면 프롬프트입니다.', seed_paths: ['synthetic/ui-alpha.md'], allowed_roots: ['synthetic/alpha'] },
                { scenario: 'UI_BETA', task_prompt: '실행하지 않는 두 번째 합성 화면 프롬프트입니다.', seed_paths: ['synthetic/ui-beta.md'], allowed_roots: ['synthetic/beta'] },
            ];
            const root = '[data-testid="admin-ai-release-decision-runtime"]', card = '[data-testid="admin-ai-release-composer-card"]';
            const selector = (id: string) => `[data-testid="admin-ai-${id}"]`;
            const refresh = selector('refresh-presets'), scenario = selector('scenario-trigger'), prompt = selector('task-prompt'), error = selector('draft-error');
            const gates = Array.from({ length: 4 }, () => {
                let release!: () => void;
                const promise = new Cypress.Promise<void>((resolve) => { release = resolve; });
                return { promise, release };
            });
            const held = new Cypress.Promise<void>(() => {});
            const reads: number[] = [], replies: number[] = [], mutations: string[] = [], unknown: string[] = [], findings: string[] = [];
            const observations: Array<Record<string, unknown>> = [], tabs: Array<{ trusted: boolean; shift: boolean }> = [];
            const siblings: Record<string, number> = { health: 0, 'eval-cases': 0, artifacts: 0 };
            const initialErrorTransitions: Array<string | null> = [];
            let foreign = 0, expectedDate = '', observer: MutationObserver | undefined;
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { mutations.push(`${req.method} ${url.href}`); return req.reply({ statusCode: 503, body: {} }); }
                if (url.origin !== origin) { foreign++; return req.reply({ forceNetworkError: true }); }
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
                const url = new URL(req.url);
                expect(url.pathname).to.equal('/api/ai/coach/auto-brief/ops/health');
                expect(Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b))).to.deep.equal([
                    ['end_date', expectedDate], ['start_date', expectedDate], ['window', 'today'],
                ]);
                observations.push({ state: 'isolated-health-request', url: url.href }); siblings.health++; return held;
            });
            for (const kind of ['eval-cases', 'artifacts']) cy.intercept('GET', `${origin}/api/ai/release-decision/${kind}`, () => { siblings[kind]++; return held; });
            cy.intercept('GET', `${origin}/api/ai/release-decision/presets`, (req) => {
                const attempt = reads.length + 1; reads.push(attempt); req.alias = `presets-${attempt}`;
                if (attempt > 4) return held;
                return gates[attempt - 1].promise.then(() => {
                    const status = attempt === 1 || attempt === 3 ? 503 : 200; replies.push(status);
                    req.reply({ statusCode: status, body: status === 200 ? presets : { message: 'SYNTHETIC_PRESETS_UNAVAILABLE' } });
                });
            });
            cy.viewport(width, width === 1280 ? 900 : 844);
            cy.clock(Date.UTC(2099, 0, 2, 12), ['Date']);
            cy.visit('/admin', { onBeforeLoad(win) {
                const now = new win.Date();
                expectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
            const sample = (state: string, target = card) => {
                cy.document().then((doc) => doc.fonts.ready); align(target);
                cy.get(target).should('be.visible').then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    observations.push({ state, width: el.clientWidth, scrollWidth: el.scrollWidth, text: el.innerText });
                    if (target === card) {
                        expect(el.querySelectorAll('h3')).to.have.length(1);
                        const heading = el.querySelector('h3')!, words: Array<{ text: string; lines: number }> = [];
                        const walker = doc.createTreeWalker(heading, win.NodeFilter.SHOW_TEXT);
                        let text: Node | null;
                        while ((text = walker.nextNode())) for (const match of (text.textContent ?? '').matchAll(/[^\s]+/g)) {
                            const range = doc.createRange(); range.setStart(text, match.index!); range.setEnd(text, match.index! + match[0].length);
                            const lines = new Set(Array.from(range.getClientRects()).filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top)));
                            words.push({ text: match[0], lines: lines.size });
                        }
                        expect(words.map((word) => word.text)).to.deep.equal(['릴리즈', '결정', '초안', '생성']);
                        observations.push({ state: `${state}-title-words`, words });
                        if (words.some((word) => word.lines !== 1)) findings.push(`${state}: title word fragmented or unmeasurable`);
                    }
                    if (el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: internal overflow`);
                    for (const node of el.querySelectorAll('button,select,textarea')) {
                        const rect = node.getBoundingClientRect(); observations.push({ state: `${state}-control`, id: node.getAttribute('data-testid'), width: rect.width, height: rect.height });
                        if (rect.width < 44 || rect.height < 44) findings.push(`${state}: ${node.getAttribute('data-testid')} below44`);
                    }
                });
                cy.screenshot(`presets-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false });
            };
            cy.get(scenario).should('be.disabled').and('contain.text', '프리셋 로딩 중'); sample('initial-held');
            cy.document().then((doc) => {
                observer = new doc.defaultView!.MutationObserver(() => {
                    const text = doc.querySelector(error)?.textContent ?? null;
                    if (!initialErrorTransitions.length || initialErrorTransitions.at(-1) !== text) initialErrorTransitions.push(text);
                });
                observer.observe(doc.querySelector(root)!, { subtree: true, childList: true, characterData: true });
            });
            cy.then(() => gates[0].release()); cy.wait('@presets-1');
            cy.wrap(null).should(() => expect(reads).to.deep.equal([1, 2]));
            cy.get(scenario).should('be.disabled'); sample('after503-auto-repeat-held');
            cy.then(() => observer?.disconnect());
            cy.then(() => gates[1].release()); cy.wait('@presets-2');
            const assertData = (enabled = true) => {
                cy.get(scenario).should(enabled ? 'be.enabled' : 'be.disabled').and('have.value', 'UI_ALPHA');
                cy.get(scenario).find('option').should(($options) => expect(Array.from($options, (o) => (o as HTMLOptionElement).value)).to.deep.equal(['UI_ALPHA', 'UI_BETA']));
                cy.get(prompt).should('have.value', presets[0].task_prompt);
                cy.get(selector('preset-seed-list')).should('contain.text', presets[0].seed_paths[0]);
                cy.get(selector('preset-root-list')).should('contain.text', presets[0].allowed_roots[0]);
            };
            assertData(); sample('populated');
            align(`${card} h3`); cy.screenshot(`presets-${id}-populated-title`, { capture: 'viewport', disableTimersAndAnimations: false });
            const controls = ['refresh-presets', 'scenario-trigger', 'task-prompt', 'seed-paths', 'allowed-roots', 'generate-draft'];
            cy.get(refresh).focus();
            cy.document().then((doc) => doc.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted, shift: event.shiftKey }); }));
            const focus = (name: string, step: string) => {
                cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                cy.document().then((doc) => {
                    const active = doc.activeElement as HTMLElement, rect = active.getBoundingClientRect();
                    expect(active.getAttribute('data-testid')).to.equal(`admin-ai-${name}`);
                    const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    const clear = Boolean(hit && (hit === active || active.contains(hit)));
                    observations.push({ state: step, focus: name, clear, focusVisible: active.matches(':focus-visible'),
                        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                        hit: hit ? { tag: hit.tagName, id: hit.id, testid: hit.getAttribute('data-testid'), text: hit.textContent?.slice(0, 120), outer: hit.outerHTML.slice(0, 700) } : null });
                    if (!clear || !active.matches(':focus-visible')) findings.push(`${step}: focus hidden or obscured`);
                });
                if (focusOnly) cy.screenshot(`presets-${id}-${step}-native-focus`, { capture: 'viewport', disableTimersAndAnimations: false });
            };
            for (const name of controls.slice(1)) { cy.press(Cypress.Keyboard.Keys.TAB); focus(name, `forward-${name}`); }
            for (const name of controls.slice(0, -1).reverse()) {
                cy.then(async () => {
                    const params = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 };
                    await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyDown' } });
                    await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyUp' } });
                }); focus(name, `reverse-${name}`);
            }
            align(refresh); cy.get(refresh).click({ scrollBehavior: false });
            cy.wrap(null).should(() => expect(reads).to.deep.equal([1, 2, 3]));
            assertData(false); sample('cached-refresh-held');
            cy.then(() => gates[2].release()); cy.wait('@presets-3');
            cy.get(error).should('have.attr', 'role', 'alert').and('not.be.empty'); assertData();
            sample('cached-error', error); sample('cached-data-retained');
            align(refresh); cy.get(refresh).click({ scrollBehavior: false });
            cy.wrap(null).should(() => expect(reads).to.deep.equal([1, 2, 3, 4]));
            cy.then(() => gates[3].release()); cy.wait('@presets-4');
            cy.get(error).should('not.exist'); assertData(); sample('recovered');
            cy.then(() => {
                expect(reads).to.deep.equal([1, 2, 3, 4]); expect(replies).to.deep.equal([503, 200, 503, 200]);
                expect(siblings).to.deep.equal({ health: 1, 'eval-cases': 1, artifacts: 1 });
                expect(tabs).to.deep.equal([...Array(5).fill({ trusted: true, shift: false }), ...Array(5).fill({ trusted: true, shift: true })]);
                expect(mutations).to.deep.equal([]); expect(unknown).to.deep.equal([]);
            });
            cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/presets-${id}.json`, { width, font, theme, focusOnly, boundaryOnly, role: viewer.role, reads, replies, siblings, mutations, unknown, foreign, observations, initialErrorTransitions, tabs, findings, finished: true }));
            cy.then(() => expect(findings).to.deep.equal([]));
        });
    }
});
