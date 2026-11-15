/// <reference types="cypress" />

describe('Account read override isolation', () => {
    let unmount: (() => void) | undefined;
    afterEach(() => { unmount?.(); unmount = undefined; });
    it('a simulated session error cannot refetch live session data', () => {
        const origin = new URL(String(Cypress.config('baseUrl'))).origin;
        expect(new URL(origin).hostname).to.equal('127.0.0.1');
        const blocked: string[] = [];
        cy.intercept({ url: '**', middleware: true }, (req) => {
            const url = new URL(req.url);
            if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) || /^\/(api|auth)\//.test(url.pathname)) {
                blocked.push(`${req.method} ${url.pathname}`);
                return req.reply({ statusCode: 503, body: {} });
            }
            if (url.origin !== origin) return req.reply({ forceNetworkError: true });
        });
        cy.intercept('GET', `${origin}/__account-read-override-test`, { statusCode: 200, headers: { 'content-type': 'text/html' },
            body: '<!doctype html><html><body><main id="probe"></main><script type="module">import { injectIntoGlobalHook } from "/@react-refresh"; injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type; window.__accountHarnessReady=true;</script></body></html>' });
        cy.visit('/__account-read-override-test');
        cy.window().should((win) => expect((win as unknown as { __accountHarnessReady: boolean }).__accountHarnessReady).to.equal(true));
        cy.window().then(async (win) => {
            const load = new win.Function('return import("/cypress/support/accountReadOverrideHarness.tsx")') as () => Promise<{
                mountAccountReadOverrideHarness: (container: Element) => () => void;
            }>;
            const module = await load();
            unmount = module.mountAccountReadOverrideHarness(win.document.querySelector('#probe')!);
        });
        cy.get('[data-testid="account-settings-sessions-error"]').should('contain.text', 'Synthetic read failure');
        cy.get('[data-testid="account-settings-sessions-retry"]').should('be.disabled').then(($button) => {
            ($button[0] as HTMLButtonElement).click();
        });
        cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
        cy.then(() => expect(blocked, 'no API reads or writes from simulated state').to.deep.equal([]));
    });
});
