/// <reference types="cypress" />

const noScrollSelectOptions: Partial<Cypress.SelectOptions> & { scrollBehavior: false } = { scrollBehavior: false };
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';
import type { AdminCoachAutoBriefOpsHealth, AdminCoachAutoBriefOpsWindow } from '../../src/types/admin';

interface NativeDateNode {
    nodeName: string;
    backendNodeId: number;
    attributes?: string[];
    children?: NativeDateNode[];
    shadowRoots?: NativeDateNode[];
    contentDocument?: NativeDateNode;
}

// Fictional UI-only health fixtures. No prewarm command or artifact operation is activated.
describe('Admin AI health summary card readability', () => {
    const geometryOnly = Cypress.expose('healthGeometryOnly') === true;
    const wideOnly = Cypress.expose('healthWideOnly') === true;
    for (const width of geometryOnly ? [320, 1280] : wideOnly ? [768, 1024] : [320, 390, 1280]) for (const font of geometryOnly || wideOnly ? [32] : [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 990774, email: 'health-window@example.invalid', name: '합성 관리자', handle: 'synthetic_health', role: 'ROLE_ADMIN', hasPassword: true, favoriteTeam: null, profileImageUrl: null };
            const start = '2099-02-04', end = '2099-02-06';
            const health = (window: AdminCoachAutoBriefOpsWindow, populated = false): AdminCoachAutoBriefOpsHealth => ({
                window, date_window: `실제 운영 정보가 아닌 합성 ${window} 구간`, generated_at_utc: '2099-01-02T12:00:00Z',
                runbook_path: 'synthetic/ui-only.md', recommended_command: '',
                summary: { loaded_target_count: populated ? 2 : 0, selected_target_count: populated ? 2 : 0, generated_success_count: 0,
                    cache_hit_count: 0, in_progress_count: 0, failed_count: populated ? 2 : 0, unresolved_count: populated ? 2 : 0, completed_count: 0,
                    cache_state_breakdown: populated ? { FAILED_LOCKED: 2 } : {}, data_quality_breakdown: populated ? { insufficient: 2 } : {} },
                gate: { verdict: 'WARN', thresholds: { max_unresolved: 0, max_failed_locked: 0, min_selected_targets: 0, fail_on_missing_report: false },
                    failed_locked_count: populated ? 2 : 0, pending_wait_count: 0, insufficient_count: populated ? 2 : 0, insufficient_ratio: populated ? 1 : 0,
                    checks: { failed: [], warnings: ['실제 운영 판정이 아닌 합성 화면입니다.'] } },
                unresolved_targets: populated ? ['UI_GAME_A', 'UI_GAME_B'].map((game_id) => ({ game_id, game_date: start,
                    away_team_id: 'MOCK_A', home_team_id: 'MOCK_B', stage_label: 'UI_ONLY', game_status_bucket: 'SYNTHETIC', cache_key: `synthetic:${game_id}`,
                    cache_state: 'FAILED_LOCKED', data_quality: 'insufficient', headline: `실제 경기 정보가 아닌 합성 항목 ${game_id}`, reason: '화면 검증용 가상 사유' })) : [],
                latest_report: null,
            });
            const tid = (value: string) => `[data-testid="admin-ai-auto-brief-${value}"]`;
            const panel = '[data-testid="admin-coach-auto-brief-ops-panel"]', windowSelect = tid('window-trigger'), startInput = tid('start-date'), endInput = tid('end-date'), apply = tid('apply-custom'), refresh = tid('refresh');
            const gates = Array.from({ length: 5 }, () => {
                let release!: () => void; const promise = new Cypress.Promise<void>((resolve) => { release = resolve; }); return { promise, release };
            });
            const requests: Array<{ attempt: number; search: string; entries: string[][] }> = [], replies: number[] = [], writes: string[] = [], unknown: string[] = [], findings: string[] = [];
            const observations: Array<Record<string, unknown>> = [], tabs: Array<{ trusted: boolean; shift: boolean }> = [], focusSegments: Array<Record<string, unknown>> = [];
            const nativeCueCandidates: Array<Record<string, unknown>> = [];
            const siblings = { presets: 0, artifacts: 0, 'eval-cases': 0 };
            let foreign = 0, expectedDate = '';
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) writes.push(`${req.method} ${req.url}`);
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
            cy.intercept('GET', `${origin}/api/ai/release-decision/presets`, (req) => {
                siblings.presets++; req.reply({ body: [{ scenario: 'UI_ALPHA', task_prompt: '실행하지 않는 합성 화면', seed_paths: ['synthetic/ui.md'], allowed_roots: ['synthetic/'] }] });
            });
            cy.intercept('GET', `${origin}/api/ai/release-decision/eval-cases`, (req) => {
                siblings['eval-cases']++; req.reply({ body: [{ case_id: 'CASE_UNUSED', scenario: 'UI_ALPHA', expected_decision: 'PENDING', required_keywords: ['synthetic'], required_sources: [] }] });
            });
            cy.intercept('GET', `${origin}/api/ai/release-decision/artifacts`, (req) => {
                siblings.artifacts++; req.reply({ body: [{ artifact_id: 'UI_UNUSED', scenario: 'UI_ALPHA', decision: 'PENDING', eval_status: null, saved_at_utc: '2020-01-01T00:00:00Z', markdown_filename: 'synthetic.md', json_filename: 'synthetic.json' }] });
            });
            cy.intercept('GET', `${origin}/api/ai/coach/auto-brief/ops/health*`, (req) => {
                const url = new URL(req.url), attempt = requests.length + 1;
                expect(url.pathname).to.equal('/api/ai/coach/auto-brief/ops/health');
                const entries = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
                requests.push({ attempt, search: url.search, entries }); req.alias = `health-${attempt}`;
                const window: AdminCoachAutoBriefOpsWindow = attempt === 1 ? 'today' : attempt === 2 ? 'tomorrow' : 'custom';
                expect(entries).to.deep.equal([['end_date', attempt < 3 ? expectedDate : end], ['start_date', attempt < 3 ? expectedDate : start], ['window', window]]);
                const reply = () => {
                    const status = attempt === 4 ? 503 : 200; replies.push(status);
                    req.reply({ statusCode: status, body: status === 503 ? { message: 'SYNTHETIC_HEALTH_UNAVAILABLE' } : health(window, attempt === 3) });
                };
                if (attempt > 5) { unknown.push(`extra health read ${attempt}`); return req.reply({ body: health('custom') }); }
                return attempt === 1 || attempt === 5 ? reply() : gates[attempt - 1].promise.then(reply);
            });
            cy.viewport(width, width === 1280 ? 900 : 844); cy.clock(Date.UTC(2099, 0, 2, 12), ['Date']);
            cy.visit('/admin', { onBeforeLoad(win) {
                const now = new win.Date(); expectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                win.scrollBy({ top: el.getBoundingClientRect().top - header - 16, behavior: 'instant' });
            });
            const click = (selector: string) => { align(selector); cy.get(selector).click({ scrollBehavior: false }); };
            const sample = (state: string, selector = windowSelect) => {
                cy.document().then((doc) => doc.fonts.ready); align(selector);
                cy.get(panel).then(($panel) => {
                    const el = $panel[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    const controls = ['refresh', 'window-trigger', 'start-date', 'end-date', 'apply-custom'].flatMap((name) => {
                        const node = el.querySelector<HTMLElement>(tid(name)); if (!node) return [];
                        const r = node.getBoundingClientRect(); return [{ name, width: r.width, height: r.height, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, disabled: node.matches(':disabled') }];
                    });
                    const grid = el.querySelector(windowSelect)!.parentElement!.parentElement!;
                    const gridRect = grid.getBoundingClientRect(), panelRect = el.getBoundingClientRect();
                    if (gridRect.left < panelRect.left || gridRect.right > panelRect.right) findings.push(`${state}: controls escape panel`);
                    const companions = ['window-value', 'start-date-value', 'end-date-value'].flatMap((name) => {
                        const node = el.querySelector<HTMLElement>(tid(name)); if (!node) return [];
                        const r = node.getBoundingClientRect(), css = win.getComputedStyle(node), range = doc.createRange(); range.selectNodeContents(node);
                        const lines = Array.from(range.getClientRects(), (line) => ({ left: line.left, right: line.right }));
                        const input = el.querySelector<HTMLInputElement>(tid(name.replace('-value', '')));
                        const expected = name === 'window-value' ? (el.querySelector(windowSelect) as HTMLSelectElement).value : input?.value || '날짜 미선택';
                        return [{ name, text: node.textContent?.trim(), expected, visible: css.display !== 'none', width: r.width, left: r.left, right: r.right, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, lines }];
                    });
                    const panelStyle = win.getComputedStyle(el), contentWidth = el.clientWidth - parseFloat(panelStyle.paddingLeft) - parseFloat(panelStyle.paddingRight);
                    if (contentWidth <= 480) {
                        expect(companions).to.have.length(el.querySelector(startInput) ? 3 : 1);
                        for (const companion of companions) {
                            if (!companion.visible || !companion.text?.includes(companion.expected) || companion.scrollWidth > companion.clientWidth + 1 || companion.lines.some((line) => line.left < companion.left - 1 || line.right > companion.right + 1)) findings.push(`${state}: current-value companion hidden/clipped/stale`);
                        }
                    }
                    const overflow = Array.from(grid.querySelectorAll('label,input,select,button')).filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => ({ tag: node.tagName, id: node.id, width: node.clientWidth, scrollWidth: node.scrollWidth }));
                    // Test layout coordinates even when the summary is outside the viewport.
                    const summaryGrid = el.querySelector<HTMLElement>('[data-testid="admin-ai-auto-brief-summary-grid"]');
                    expect(summaryGrid, 'health summary grid').not.to.equal(null);
                    const cards = Array.from(summaryGrid!.children) as HTMLElement[];
                    expect(cards, 'health summary card count').to.have.length(4);
                    const expectedHeadings = ['Unresolved', 'FAILED_LOCKED', 'PENDING_WAIT', 'Insufficient'];
                    const headings = cards.map((card, index) => {
                        const heading = card.querySelector('p');
                        expect(heading, 'summary card heading').not.to.equal(null);
                        expect(heading!.textContent?.trim(), 'ordered summary heading').to.equal(expectedHeadings[index]);
                        const range = doc.createRange(); range.selectNodeContents(heading!);
                        const bounds = card.getBoundingClientRect();
                        const lines = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0).map((rect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
                        return { text: heading!.textContent, bounds: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }, lines };
                    });
                    const headingOutside = headings.some(({ bounds, lines }) => !lines.length || lines.some((line) => line.left < bounds.left - 1 || line.right > bounds.right + 1 || line.top < bounds.top - 1 || line.bottom > bounds.bottom + 1));
                    const headingOverlap = headings.some((heading, index) => headings.slice(index + 1).some((other) => heading.lines.some((a) => other.lines.some((b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1))));
                    observations.push({ state, kind: 'summary-heading-layout', headingOutside, headingOverlap, headings });
                    if (headingOutside || headingOverlap) findings.push(`${state}: summary headings overlap or escape cards`);
                    observations.push({ state, text: grid.textContent, panelWidth: el.clientWidth, panelScrollWidth: el.scrollWidth, gridWidth: grid.clientWidth, gridScrollWidth: grid.scrollWidth, controls, overflow, companions });
                    if (controls.some((r) => r.width < 44 || r.height < 44)) findings.push(`${state}: selected controls below44`);
                    if (grid.scrollWidth > grid.clientWidth + 1 || overflow.length) findings.push(`${state}: date/window internal overflow`);
                });
                cy.screenshot(`health-window-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false });
            };
            click('[data-testid="admin-tab-ai"]'); cy.wait('@health-1');
            cy.get(panel).should('have.attr', 'aria-busy', 'false'); cy.contains(panel, health('today').date_window).should('exist'); sample('today-ready');
            align(windowSelect); cy.get(windowSelect).select('tomorrow', noScrollSelectOptions);
            cy.get(panel).should('have.attr', 'aria-busy', 'true'); cy.get(refresh).should('be.disabled'); sample('tomorrow-held');
            cy.then(() => gates[1].release()); cy.wait('@health-2');
            cy.contains(panel, health('tomorrow').date_window).should('exist'); sample('tomorrow-ready');
            align(windowSelect); cy.get(windowSelect).select('custom', noScrollSelectOptions);
            cy.get(startInput).should(($input) => expect($input.val()).to.equal(expectedDate));
            cy.get(endInput).should(($input) => expect($input.val()).to.equal(expectedDate));
            cy.then(() => expect(requests).to.have.length(2));
            // UA-shadow rectangles diagnose native clipping; unavailable boxes are not a pass.
            const nativeParts = () => cy.document().then(async (doc) => {
                const tree = await Cypress.automation('remote:debugger:protocol', { command: 'DOM.getDocument', params: { depth: -1, pierce: true } }) as { root: NativeDateNode };
                const flatten = (node: NativeDateNode): NativeDateNode[] => [node, ...[...(node.children ?? []), ...(node.shadowRoots ?? []), ...(node.contentDocument ? [node.contentDocument] : [])].flatMap(flatten)];
                const nodes = flatten(tree.root);
                for (const name of ['start-date', 'end-date']) {
                    const input = nodes.find((node) => node.nodeName === 'INPUT' && node.attributes?.some((attr, index, attrs) => index % 2 === 0 && attr === 'data-testid' && attrs[index + 1] === `admin-ai-auto-brief-${name}`));
                    const parts: Array<Record<string, unknown>> = [];
                    for (const node of input?.shadowRoots?.flatMap(flatten) ?? []) {
                        if (node.nodeName.startsWith('#')) continue;
                        let box: Record<string, unknown>;
                        try {
                            const result = await Cypress.automation('remote:debugger:protocol', { command: 'DOM.getBoxModel', params: { backendNodeId: node.backendNodeId } }) as { model: { content: number[]; border: number[]; width: number; height: number } };
                            box = result.model;
                        } catch { box = { unmeasurable: true }; }
                        parts.push({ nodeName: node.nodeName, attributes: node.attributes ?? [], box });
                    }
                    observations.push({ state: 'native-date-parts', name, found: Boolean(input), shadowAvailable: Boolean(input?.shadowRoots?.length), parts });
                    const companion = doc.querySelector(tid(`${name}-value`));
                    if (companion && doc.defaultView!.getComputedStyle(companion).display === 'none') {
                        const viewport = parts.find((part) => (part.attributes as string[]).includes('-webkit-datetime-edit'))?.box as { width?: number } | undefined;
                        const fields = parts.find((part) => (part.attributes as string[]).includes('-webkit-datetime-edit-fields-wrapper'))?.box as { width?: number } | undefined;
                        if (typeof viewport?.width !== 'number' || typeof fields?.width !== 'number' || !Number.isFinite(viewport.width) || !Number.isFinite(fields.width) || viewport.width <= 0 || fields.width <= 0 || viewport.width < fields.width) findings.push(`${name}: native value clipped/unmeasurable without companion`);
                    }
                }
            });
            if (geometryOnly) {
                sample('custom-unedited', startInput); nativeParts();
                cy.document().then((doc) => {
                    const a = doc.querySelector(startInput)!.getBoundingClientRect(), b = doc.querySelector(endInput)!.getBoundingClientRect();
                    const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
                    const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
                    const inputs = [startInput, endInput].map((selector) => {
                        const node = doc.querySelector(selector)!, r = node.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        return { selector, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, hit: hit?.outerHTML.slice(0, 500), clear: Boolean(hit && (hit === node || node.contains(hit))) };
                    });
                    observations.push({ state: 'custom-input-overlap', overlapWidth, overlapHeight, inputs });
                    if (overlapWidth && overlapHeight) findings.push('custom inputs intersect');
                    if (inputs.some((input) => !input.clear)) findings.push('custom input center obstructed');
                    expect(requests).to.have.length(2); expect(replies).to.deep.equal([200, 200]);
                    expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                });
                cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/health-summary-${id}.json`, { width, font, theme, mode: 'geometry-only', requests, replies, siblings, writes, unknown, foreign, observations, findings, finished: true }));
                cy.then(() => expect(findings, 'bounded pre-edit geometry findings').to.deep.equal([]));
                return;
            }
            align(startInput); cy.get(startInput).clear({ scrollBehavior: false }).type(start, { scrollBehavior: false });
            align(endInput); cy.get(endInput).clear({ scrollBehavior: false }).type(end, { scrollBehavior: false });
            cy.get(startInput).should('have.value', start); cy.get(endInput).should('have.value', end); sample('custom-edited'); nativeParts();
            click(apply); cy.get(panel).should('have.attr', 'aria-busy', 'true'); cy.get(apply).should('be.disabled'); sample('custom-held');
            cy.then(() => gates[2].release()); cy.wait('@health-3');
            const assertRows = () => cy.get(tid('unresolved-list')).children().should(($rows) => {
                expect(Array.from($rows, (node) => node.getAttribute('data-testid'))).to.deep.equal(['admin-ai-auto-brief-unresolved-UI_GAME_A', 'admin-ai-auto-brief-unresolved-UI_GAME_B']);
                expect($rows[0].textContent).to.contain('실제 경기 정보가 아닌 합성 항목');
            });
            const assertSummary = (populated: boolean) => cy.get(tid('summary-grid')).children().should(($cards) => {
                expect(Array.from($cards, (card) => card.querySelectorAll('p')[1].textContent)).to.deep.equal(populated ? ['2', '2', '0', '2'] : ['0', '0', '0', '0']);
                expect($cards[0].querySelectorAll('p')[2].textContent).to.equal(populated ? 'selected 2' : 'selected 0');
            });
            let cachedSummaryText = '', cachedRowsText = '';
            const assertCached = () => {
                assertRows(); assertSummary(true);
                cy.get(tid('summary-grid')).should(($el) => expect($el.text()).to.equal(cachedSummaryText));
                cy.get(tid('unresolved-list')).should(($el) => expect($el.text()).to.equal(cachedRowsText));
                cy.get(windowSelect).should('have.value', 'custom');
                cy.get(startInput).should('have.value', start); cy.get(endInput).should('have.value', end);
            };
            assertRows(); assertSummary(true);
            cy.get(tid('summary-grid')).invoke('text').then((value) => { cachedSummaryText = value; });
            cy.get(tid('unresolved-list')).invoke('text').then((value) => { cachedRowsText = value; });
            sample('custom-populated'); sample('custom-targets', tid('unresolved-list'));
            cy.get(refresh).focus();
            cy.document().then((doc) => doc.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted, shift: event.shiftKey }); }));
            const traverse = (reverse: boolean) => {
                const expected = reverse ? ['end-date', 'start-date', 'window-trigger', 'refresh'] : ['window-trigger', 'start-date', 'end-date', 'apply-custom'];
                const visited: string[] = []; let presses = 0, aborted = false;
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
                        const active = doc.activeElement as HTMLElement, actual = active.getAttribute('data-testid'), r = active.getBoundingClientRect();
                        const next = `admin-ai-auto-brief-${expected[visited.length]}`;
                        const repeatedDate = active.matches('input[type="date"]') && actual === visited[visited.length - 1];
                        if (actual === next) visited.push(actual!);
                        else if (!repeatedDate) { aborted = true; findings.push(`${reverse ? 'reverse' : 'forward'}: unexpected focus ${actual}`); }
                        const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), clear = Boolean(hit && (hit === active || active.contains(hit)));
                        const visible = active.matches(':focus-visible'), nativeDate = active.matches('input[type="date"]'), style = doc.defaultView!.getComputedStyle(active);
                        const cue = { focus: active.matches(':focus'), focusWithin: active.matches(':focus-within'), borderColor: style.borderColor, boxShadow: style.boxShadow, outline: style.outline };
                        observations.push({ state: 'native-focus', reverse, presses, actual, repeatedDate, clear, focusVisible: visible, cue, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, hit: hit?.outerHTML.slice(0, 500) ?? null });
                        if (!clear || (!visible && !nativeDate)) findings.push(`${reverse ? 'reverse' : 'forward'}-${presses}: focus obscured/invisible`);
                        if (!visible && nativeDate) {
                            nativeCueCandidates.push({ reverse, presses, actual, cue });
                            cy.screenshot(`health-window-${id}-${reverse ? 'reverse' : 'forward'}-${presses}-native-cue`, { capture: 'viewport', disableTimersAndAnimations: false });
                        }
                        if (!clear) cy.screenshot(`health-window-${id}-${reverse ? 'reverse' : 'forward'}-${presses}-covered`, { capture: 'viewport', disableTimersAndAnimations: false });
                    });
                    cy.then(() => {
                        if (!aborted && visited.length < expected.length && presses < 16) step();
                        else {
                            const complete = visited.length === expected.length;
                            focusSegments.push({ reverse, visited, presses, complete });
                            if (!complete) findings.push(`${reverse ? 'reverse' : 'forward'}: incomplete focus segment`);
                        }
                    });
                }; step();
            };
            traverse(false);
            // Reverse path has its own explicit entry; it does not silently inherit a failed forward path.
            cy.get(apply).focus(); traverse(true);
            cy.get(startInput).should('have.value', start); cy.get(endInput).should('have.value', end);
            click(refresh); cy.get(panel).should('have.attr', 'aria-busy', 'true'); assertCached(); sample('cached-custom-held');
            cy.then(() => gates[3].release()); cy.wait('@health-4');
            cy.get(panel).should('have.attr', 'aria-busy', 'false'); cy.get(tid('error')).should('contain.text', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
            assertCached(); sample('cached-custom-error', tid('error'));
            cy.get(startInput).should('have.value', start); cy.get(endInput).should('have.value', end);
            click(refresh); cy.wait('@health-5'); cy.get(tid('error')).should('not.exist');
            assertSummary(false);
            cy.get(tid('unresolved-list')).should('not.exist'); cy.get(tid('unresolved-empty')).should('contain.text', 'unresolved 대상이 없습니다.'); sample('custom-recovered-empty');
            cy.then(() => {
                expect(replies).to.deep.equal([200, 200, 200, 503, 200]); expect(requests).to.have.length(5);
                expect(siblings).to.deep.equal({ presets: 1, artifacts: 1, 'eval-cases': 1 });
                expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                expect(tabs.length).to.be.greaterThan(7); expect(tabs.every((tab) => tab.trusted)).to.equal(true);
                expect(tabs.filter((tab) => tab.shift)).to.have.length(Number(focusSegments[1].presses));
                expect(tabs.filter((tab) => !tab.shift)).to.have.length(Number(focusSegments[0].presses));
            });
            cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/health-summary-${id}.json`, { width, font, theme, wideOnly, requests, replies, siblings, writes, unknown, foreign, tabs, focusSegments, observations, nativeCueCandidates, findings, finished: true }));
            cy.then(() => expect(findings, 'bounded health window/date UI findings').to.deep.equal([]));
        });
    }
});
