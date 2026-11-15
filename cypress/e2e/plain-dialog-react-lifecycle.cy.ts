/// <reference types="cypress" />
import type { PlainDialogLifecycleHarness } from '../support/plainDialogLifecycleHarness';

interface HarnessModule {
    mountPlainDialogLifecycleHarness: (container: Element, strict: boolean, nested: boolean) => PlainDialogLifecycleHarness;
}

// Component probe, not route acceptance. No app bootstrap, API or business actions.
describe('PlainDialog mounted React lifecycle probe', () => {
    let harness: PlainDialogLifecycleHarness | undefined;
    afterEach(() => { harness?.unmount(); harness = undefined; });
    for (const strict of [false, true]) for (const mode of ['sequential', 'simultaneous-siblings', 'simultaneous-nested', 'out-of-order'] as const) {
        it(`${strict ? 'StrictMode' : 'normal'} / ${mode}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const blocked: string[] = [], findings: string[] = [], observations: Array<Record<string, unknown>> = [];
            let foreign = 0;
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
                    blocked.push(`${req.method} ${url.pathname}`); return req.reply({ statusCode: 503, body: {} });
                }
                if (url.origin !== origin) { foreign++; return req.reply({ forceNetworkError: true }); }
            });
            // Vite's installed React preamble, without the real app or its bootstrap effects.
            cy.intercept('GET', `${origin}/__plain-dialog-lifecycle-test`, { statusCode: 200, headers: { 'content-type': 'text/html' },
                body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="probe"></main><script type="module">import { injectIntoGlobalHook } from "/@react-refresh"; injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type; import "/src/index.css"; window.__dialogHarnessReady=true;</script></body></html>' });
            cy.viewport(390, 844);
            cy.visit('/__plain-dialog-lifecycle-test');
            cy.window().should((win) => expect((win as unknown as { __dialogHarnessReady: boolean }).__dialogHarnessReady).to.equal(true));
            cy.window().then(async (win) => {
                const load = new win.Function('return import("/cypress/support/plainDialogLifecycleHarness.tsx")') as () => Promise<HarnessModule>;
                const module = await load();
                win.document.body.style.overflow = 'auto';
                harness = module.mountPlainDialogLifecycleHarness(win.document.querySelector('#probe')!, strict, mode === 'simultaneous-nested');
            });
            cy.get('[data-testid="lifecycle-opener"]').should('exist').focus();
            const frames = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
            const checkLock = (state: string, expected: string) => cy.document().then((doc) => {
                observations.push({ state, overflow: doc.body.style.overflow, dialogs: doc.querySelectorAll('[role="dialog"]').length });
                if (doc.body.style.overflow !== expected) findings.push(`${state}: unexpected overflow`);
            });
            frames();
            cy.then(() => {
                const effects = harness!.effects(); observations.push({ state: 'initial-effects', ...effects });
                expect(effects).to.deep.equal(strict ? { setup: 2, cleanup: 1 } : { setup: 1, cleanup: 0 });
            });
            if (mode === 'sequential' || mode === 'out-of-order') {
                cy.then(() => harness!.open(true, false)); cy.get('[data-testid="lifecycle-dialog-parent"]').should('exist'); frames();
                cy.then(() => harness!.open(true, true));
            } else cy.then(() => harness!.open(true, true));
            cy.get('[role="dialog"]').should('have.length', 2); frames();
            checkLock('both-open', 'hidden');
            // Replace callbacks while both stay open: latest callback must run without reordering owners.
            cy.then(() => { harness!.rerender(); harness!.rerender(); }); frames();
            let expectedTop = '', expectedVersion = mode === 'sequential' || mode === 'out-of-order' ? 4 : 3;
            cy.document().then((doc) => {
                const win = doc.defaultView!, hit = doc.elementFromPoint(win.innerWidth / 2, win.innerHeight / 2);
                expectedTop = hit?.closest('[data-testid^="lifecycle-dialog-"]')?.getAttribute('data-testid')?.replace('lifecycle-dialog-', '') ?? '';
                expect(['parent', 'child']).to.include(expectedTop);
                observations.push({ state: 'visual-top-before-escape', expectedTop, expectedVersion });
            });
            cy.screenshot(`plain-dialog-react-${strict}-${mode}-both-open`, { capture: 'viewport', disableTimersAndAnimations: false });
            if (mode === 'out-of-order') {
                cy.then(() => harness!.open(false, true)); cy.get('[data-testid="lifecycle-dialog-parent"]').should('not.exist'); frames();
                checkLock('parent-forced-out', 'hidden'); expectedVersion = 5;
                cy.then(() => { expectedTop = 'child'; });
            }
            cy.press(Cypress.Keyboard.Keys.ESC); frames();
            cy.then(() => {
                const calls = harness!.calls(); observations.push({ state: 'first-escape', calls });
                if (calls.length !== 1 || calls[0]?.id !== expectedTop || calls[0]?.version !== expectedVersion) findings.push('first Escape: top/latest callback mismatch');
            });
            cy.document().then((doc) => {
                const remaining = doc.querySelectorAll('[role="dialog"]').length;
                observations.push({ state: 'after-first-escape', remaining, overflow: doc.body.style.overflow });
                const expectedRemaining = mode === 'out-of-order' || (mode === 'simultaneous-nested' && expectedTop === 'parent') ? 0 : 1;
                if (remaining !== expectedRemaining || doc.body.style.overflow !== (remaining ? 'hidden' : 'auto')) findings.push('first Escape: remaining dialog/lock mismatch');
            });
            cy.press(Cypress.Keyboard.Keys.ESC); frames();
            cy.get('[role="dialog"]').should('not.exist'); checkLock('all-closed', 'auto');
            cy.then(() => {
                const expectedCalls = [{ id: expectedTop, version: expectedVersion }];
                if (mode !== 'out-of-order' && !(mode === 'simultaneous-nested' && expectedTop === 'parent')) {
                    expectedCalls.push({ id: expectedTop === 'child' ? 'parent' : 'child', version: expectedVersion });
                }
                const calls = harness!.calls(); observations.push({ state: 'second-escape-calls', calls, expectedCalls });
                expect(calls).to.deep.equal(expectedCalls);
            });
            cy.then(() => harness!.open(true, true)); cy.get('[role="dialog"]').should('have.length', 2); frames(); checkLock('reopened', 'hidden');
            let callsBefore = 0; cy.then(() => { callsBefore = harness!.calls().length; });
            cy.then(() => harness!.unmount()); frames(); checkLock('root-unmounted', 'auto');
            cy.then(() => {
                const effects = harness!.effects(); observations.push({ state: 'unmounted-effects', ...effects });
                expect(effects).to.deep.equal(strict ? { setup: 2, cleanup: 2 } : { setup: 1, cleanup: 1 });
            });
            cy.press(Cypress.Keyboard.Keys.ESC); frames();
            cy.then(() => {
                if (harness!.calls().length !== callsBefore) findings.push('unmount: stale Escape listener');
                expect(blocked).to.deep.equal([]); expect(foreign).to.equal(0);
            });
            cy.screenshot(`plain-dialog-react-${strict}-${mode}`, { capture: 'viewport', disableTimersAndAnimations: false });
            cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/plain-dialog-react-${strict}-${mode}.json`, {
                strict, mode, observations, findings, blocked, foreign, calls: harness!.calls(), finished: true,
            }));
            cy.then(() => expect(findings, 'Mounted Dialog lifecycle findings').to.deep.equal([]));
        });
    }
});
