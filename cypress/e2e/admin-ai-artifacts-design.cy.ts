/// <reference types="cypress" />

const noScrollSelectOptions: Partial<Cypress.SelectOptions> & { scrollBehavior: false } = { scrollBehavior: false };
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';
import type { AdminCoachAutoBriefOpsHealth } from '../../src/types/admin';

// Fictional summary reads only. Artifact actions receive focus but are never activated.
describe('Admin AI artifact list read and focus presentation', () => {
    const focusOnly = Cypress.expose('artifactFocusOnly') === true;
    const boundaryOnly = Cypress.expose('artifactBoundaryOnly') === true;
    for (const width of boundaryOnly ? [1023, 1024] : focusOnly ? [320, 1280] : [320, 390, 1280]) for (const font of boundaryOnly || focusOnly ? [32] : [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 990773, email: 'artifact-ui@example.invalid', name: '합성 관리자', handle: 'synthetic_artifacts', role: 'ROLE_ADMIN', hasPassword: true, favoriteTeam: null, profileImageUrl: null };
            const presets = ['UI_ALPHA', 'UI_EMPTY'].map((scenario) => ({ scenario, task_prompt: '실행하지 않는 합성 화면입니다.', seed_paths: ['synthetic/ui.md'], allowed_roots: ['synthetic/'] }));
            const artifacts = [
                { artifact_id: 'UI_ART_A', scenario: 'UI_ALPHA', decision: 'GO', eval_status: 'PASS', saved_at_utc: '2020-01-02T00:00:00Z', markdown_filename: 'synthetic-a.md', json_filename: 'synthetic-a.json' },
                { artifact_id: 'UI_ART_B', scenario: 'UI_ALPHA', decision: 'NO_GO', eval_status: null, saved_at_utc: '2020-01-01T00:00:00Z', markdown_filename: 'synthetic-b.md', json_filename: 'synthetic-b.json' },
                { artifact_id: 'UI_OTHER', scenario: 'UI_OTHER', decision: 'PENDING', eval_status: null, saved_at_utc: '2020-01-01T00:00:00Z', markdown_filename: 'synthetic-other.md', json_filename: 'synthetic-other.json' },
            ];
            const isolatedHealth: AdminCoachAutoBriefOpsHealth = {
                window: 'today', date_window: '실제 운영 정보가 아닌 합성 격리 구간', generated_at_utc: '2099-01-02T12:00:00Z',
                runbook_path: 'synthetic/ui-only.md', recommended_command: '',
                summary: { loaded_target_count: 0, selected_target_count: 0, generated_success_count: 0, cache_hit_count: 0,
                    in_progress_count: 0, failed_count: 0, unresolved_count: 0, completed_count: 0,
                    cache_state_breakdown: {}, data_quality_breakdown: {} },
                gate: { verdict: 'WARN', thresholds: { max_unresolved: 0, max_failed_locked: 0, min_selected_targets: 0, fail_on_missing_report: false },
                    failed_locked_count: 0, pending_wait_count: 0, insufficient_count: 0, insufficient_ratio: 0,
                    checks: { failed: [], warnings: ['실제 운영 판정이 아닌 합성 화면입니다.'] } },
                unresolved_targets: [], latest_report: null,
            };
            const root = '[data-testid="admin-ai-release-decision-runtime"]', list = '[data-testid="admin-ai-artifact-list"]';
            const refresh = '[data-testid="admin-ai-refresh-artifacts"]', error = '[data-testid="admin-ai-artifacts-error"]', scenario = '[data-testid="admin-ai-scenario-trigger"]';
            const card = `${root} > div:first-child > div:has(${refresh})`;
            const row = (name: string) => `[data-testid="admin-ai-artifact-${name}"]`;
            const gates = Array.from({ length: 4 }, () => {
                let release!: () => void; const promise = new Cypress.Promise<void>((resolve) => { release = resolve; }); return { promise, release };
            });
            const requests: number[] = [], replies: number[] = [], writes: string[] = [], unknown: string[] = [], findings: string[] = [];
            const observations: Array<Record<string, unknown>> = [], tabs: Array<{ trusted: boolean; shift: boolean }> = [];
            const focusSummaries: Array<{ direction: string; visited: string[]; presses: number; regions: number; complete: boolean }> = [];
            const siblings = { presets: 0, health: 0, 'eval-cases': 0 };
            let foreign = 0, expectedDate = '', forwardComplete = false;
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
                ]); siblings.health++; req.reply({ body: isolatedHealth });
            });
            cy.intercept('GET', `${origin}/api/ai/release-decision/presets`, (req) => { siblings.presets++; req.reply({ body: presets }); });
            cy.intercept('GET', `${origin}/api/ai/release-decision/eval-cases`, (req) => {
                siblings['eval-cases']++;
                req.reply({ body: [{ case_id: 'CASE_UNUSED', scenario: 'UI_ALPHA', expected_decision: 'PENDING', required_keywords: ['synthetic'], required_sources: [] }] });
            });
            cy.intercept('GET', `${origin}/api/ai/release-decision/artifacts`, (req) => {
                expect(new URL(req.url).search).to.equal('');
                const attempt = requests.length + 1; requests.push(attempt); req.alias = `artifacts-${attempt}`;
                if (attempt > 4) {
                    unknown.push(`unexpected artifact read ${attempt}`); replies.push(200);
                    return req.reply({ body: artifacts });
                }
                return gates[attempt - 1].promise.then(() => {
                    const status = attempt === 1 || attempt === 3 ? 503 : 200; replies.push(status);
                    req.reply({ statusCode: status, body: status === 200 ? artifacts : { message: 'SYNTHETIC_ARTIFACT_LIST_UNAVAILABLE' } });
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
                    const controls = Array.from(el.querySelectorAll('button')).map((node) => {
                        const r = node.getBoundingClientRect(); return { id: node.getAttribute('data-testid'), width: r.width, height: r.height };
                    });
                    const overflow = Array.from(el.querySelectorAll('h4,p,button,[data-testid^="admin-ai-artifact-"]')).filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => ({ tag: node.tagName, id: node.getAttribute('data-testid'), width: node.clientWidth, scrollWidth: node.scrollWidth }));
                    observations.push({ state, width: el.clientWidth, scrollWidth: el.scrollWidth, controls, overflow, text: el.innerText });
                    if (el.scrollWidth > el.clientWidth + 1 || overflow.length) findings.push(`${state}: internal overflow`);
                    if (controls.some((control) => control.width < 44 || control.height < 44)) findings.push(`${state}: controls below44`);
                });
                cy.screenshot(`artifacts-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false });
            };
            cy.contains(list, '목록을 불러오는 중').should('exist'); sample('initial-held');
            cy.then(() => gates[0].release()); cy.wait('@artifacts-1');
            cy.wrap(null).should(() => expect(requests).to.deep.equal([1, 2])); sample('after503-repeat-held');
            cy.then(() => gates[1].release()); cy.wait('@artifacts-2');
            const assertRows = () => {
                cy.get(list).children('[data-testid^="admin-ai-artifact-"]').should(($rows) => expect(Array.from($rows, (node) => node.getAttribute('data-testid'))).to.deep.equal(['admin-ai-artifact-UI_ART_A', 'admin-ai-artifact-UI_ART_B']));
                cy.contains(row('UI_ART_A'), 'PASS').should('exist'); cy.contains(row('UI_ART_A'), '2020').should('exist');
                cy.contains(row('UI_ART_B'), 'NO_GO').should('exist'); cy.contains(row('UI_ART_B'), 'eval 없음').should('exist');
                cy.get(list).find('button').should(($buttons) => {
                    expect($buttons).to.have.length(6);
                    expect(Array.from($buttons, (button) => !(button as HTMLButtonElement).disabled).every(Boolean)).to.equal(true);
                });
            };
            assertRows(); sample('populated'); sample('populated-list', list);
            const buttons = ['UI_ART_A', 'UI_ART_B'].flatMap((name) => [`admin-ai-load-artifact-${name}`, `admin-ai-download-markdown-${name}`, `admin-ai-download-json-${name}`]);
            cy.get(refresh).focus();
            cy.document().then((doc) => doc.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted, shift: event.shiftKey }); }));
            const cycle = (reverse: boolean) => {
                const expected = reverse ? [...buttons.slice(0, -1).reverse(), 'admin-ai-refresh-artifacts'] : buttons;
                const visited: string[] = []; let presses = 0, regions = 0, aborted = false;
                const step = () => {
                    presses++;
                    if (!reverse) cy.press(Cypress.Keyboard.Keys.TAB);
                    else cy.then(async () => {
                        const params = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 };
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyDown' } });
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyUp' } });
                    });
                    cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                    cy.document().then((doc) => {
                        const active = doc.activeElement as HTMLElement, r = active.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(active);
                        const knownRegion = active === doc.querySelector(list) && !active.hasAttribute('tabindex') && /auto|scroll/.test(`${style.overflowX} ${style.overflowY}`) && (active.scrollHeight > active.clientHeight || active.scrollWidth > active.clientWidth);
                        const actual = active.getAttribute('data-testid');
                        if (knownRegion && regions === 0 && visited.length === (reverse ? 5 : 0)) regions++;
                        else if (actual === expected[visited.length]) visited.push(actual!);
                        else { aborted = true; findings.push(`${reverse ? 'reverse' : 'forward'}: unexpected focus ${actual}`); }
                        const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), clear = Boolean(hit && (hit === active || active.contains(hit)));
                        const ancestors: Array<Record<string, unknown>> = [];
                        if (focusOnly) for (let parent = active.parentElement; parent && ancestors.length < 7; parent = parent.parentElement) {
                            const box = parent.getBoundingClientRect(), css = doc.defaultView!.getComputedStyle(parent);
                            const left = box.left + parent.clientLeft, top = box.top + parent.clientTop;
                            const withinX = r.left + r.width / 2 >= left && r.left + r.width / 2 <= left + parent.clientWidth;
                            const withinY = r.top + r.height / 2 >= top && r.top + r.height / 2 <= top + parent.clientHeight;
                            ancestors.push({ id: parent.getAttribute('data-testid'), tag: parent.tagName, left, top,
                                clientWidth: parent.clientWidth, clientHeight: parent.clientHeight, scrollWidth: parent.scrollWidth, scrollHeight: parent.scrollHeight,
                                scrollLeft: parent.scrollLeft, scrollTop: parent.scrollTop, overflowX: css.overflowX, overflowY: css.overflowY,
                                clipsCenterX: /auto|scroll|hidden|clip/.test(css.overflowX) && !withinX,
                                clipsCenterY: /auto|scroll|hidden|clip/.test(css.overflowY) && !withinY });
                        }
                        observations.push({ state: 'native-focus', reverse, actual, region: knownRegion, clear, focusVisible: active.matches(':focus-visible'), rect: { left: r.left, top: r.top, width: r.width, height: r.height }, hit: hit?.outerHTML.slice(0, 700) ?? null, pointerEvents: style.pointerEvents, ancestors });
                        if (!clear || !active.matches(':focus-visible')) findings.push(`${reverse ? 'reverse' : 'forward'}-${actual}: focus obscured or invisible`);
                        if (!clear) cy.screenshot(`artifacts-${id}-${reverse ? 'reverse' : 'forward'}-${presses}-covered`, { capture: 'viewport', disableTimersAndAnimations: false });
                        if (boundaryOnly && presses === 1) cy.screenshot(`artifacts-${id}-${reverse ? 'reverse' : 'forward'}-focused`, { capture: 'viewport', disableTimersAndAnimations: false });
                    });
                    cy.then(() => {
                        if (!aborted && visited.length < expected.length && presses < 8) step();
                        else {
                            const complete = visited.length === expected.length;
                            if (!complete) findings.push(`${reverse ? 'reverse' : 'forward'}: incomplete keyboard segment`);
                            if (!reverse) forwardComplete = complete;
                            focusSummaries.push({ direction: reverse ? 'reverse' : 'forward', visited, presses, regions, complete });
                        }
                    });
                };
                cy.then(() => {
                    if (reverse && !forwardComplete) {
                        findings.push('reverse: skipped after incomplete forward segment');
                        focusSummaries.push({ direction: 'reverse', visited: [], presses: 0, regions: 0, complete: false });
                    } else step();
                });
            };
            cycle(false); cycle(true);
            align(refresh); cy.get(refresh).click({ scrollBehavior: false });
            cy.wrap(null).should(() => expect(requests).to.deep.equal([1, 2, 3]));
            cy.contains(list, '목록을 불러오는 중').should('exist'); cy.get(list).children('[data-testid^="admin-ai-artifact-"]').should('have.length', 0); sample('cached-held-rows-hidden');
            cy.then(() => gates[2].release()); cy.wait('@artifacts-3');
            cy.get(error).should('have.attr', 'role', 'alert').and('not.be.empty'); assertRows(); sample('cached-error', error); sample('cached-retained', list);
            align(refresh); cy.get(refresh).click({ scrollBehavior: false });
            cy.wrap(null).should(() => expect(requests).to.deep.equal([1, 2, 3, 4])); cy.then(() => gates[3].release()); cy.wait('@artifacts-4');
            cy.get(error).should('not.exist'); assertRows(); sample('recovered', list);
            align(scenario); cy.get(scenario).select('UI_EMPTY', noScrollSelectOptions);
            cy.contains(list, '현재 시나리오에 저장된 아티팩트가 없습니다.').should('exist'); cy.get(list).children('[data-testid^="admin-ai-artifact-"]').should('have.length', 0); sample('filtered-empty', list);
            align(scenario); cy.get(scenario).select('UI_ALPHA', noScrollSelectOptions); assertRows(); sample('filter-return', list);
            cy.then(() => {
                expect(requests).to.deep.equal([1, 2, 3, 4]); expect(replies).to.deep.equal([503, 200, 503, 200]);
                expect(siblings).to.deep.equal({ presets: 1, health: 1, 'eval-cases': 1 });
                expect(tabs).to.deep.equal(focusSummaries.flatMap((summary) => Array(summary.presses).fill({ trusted: true, shift: summary.direction === 'reverse' })));
                expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
            });
            cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/artifacts-${id}.json`, { width, font, theme, focusOnly, boundaryOnly, role: viewer.role, requests, replies, siblings, writes, unknown, foreign, tabs, focusSummaries, observations, findings, finished: true }));
            cy.then(() => expect(findings).to.deep.equal([]));
        });
    }
});
