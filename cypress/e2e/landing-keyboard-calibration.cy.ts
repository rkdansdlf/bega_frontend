/// <reference types="cypress" />

export {};

// Diagnostic only: compare driver activation on a native fixture and real ticker.
describe('Landing keyboard driver calibration', () => {
    it('records press versus type activation without changing product code', () => {
        const origin = new URL(String(Cypress.config('baseUrl')));
        expect(origin.hostname).to.equal('127.0.0.1');
        const observations: Array<Record<string, unknown>> = [];
        const events: Array<Record<string, unknown>> = [];
        let clicks = 0;
        cy.intercept({ url: '**', middleware: true }, (req) => {
            if (new URL(req.url).origin !== origin.origin) req.reply({ forceNetworkError: true, log: false });
        });
        cy.intercept('**/api/**', { statusCode: 503, body: {} });
        cy.visit('/', { onBeforeLoad(win) { win.localStorage.clear(); win.sessionStorage.clear(); } });
        cy.get('[data-testid="landing-page"]').should('be.visible');
        cy.document().then((doc) => {
            const frame = doc.createElement('iframe');
            frame.id = 'native-keyboard-frame'; frame.title = 'Local isolated keyboard calibration';
            Object.assign(frame.style, { position: 'fixed', top: '100px', left: '10px', width: '280px', height: '100px', zIndex: '99999' });
            doc.body.appendChild(frame);
            const button = frame.contentDocument!.createElement('button');
            button.type = 'button'; button.id = 'native-keyboard-fixture'; button.textContent = 'LOCAL KEYBOARD FIXTURE';
            Object.assign(button.style, { width: '240px', height: '60px' });
            button.addEventListener('click', () => { clicks++; });
            for (const name of ['keydown', 'keyup', 'click']) button.addEventListener(name, (event) => {
                queueMicrotask(() => events.push({ name, key: (event as KeyboardEvent).key, trusted: event.isTrusted, defaultPrevented: event.defaultPrevented }));
            });
            frame.contentDocument!.body.appendChild(button);
            return button;
        }).as('nativeFixture');
        const record = (method: string) => cy.then(() => observations.push({ target: 'native-button', method, clicks }));
        cy.get('@nativeFixture').click(); record('pointer-baseline');
        cy.get('@nativeFixture').focus(); cy.press(Cypress.Keyboard.Keys.ENTER); record('press-enter');
        cy.get('@nativeFixture').focus().type('{enter}'); record('type-enter');
        cy.get('@nativeFixture').focus(); cy.press(Cypress.Keyboard.Keys.SPACE); record('press-space');
        cy.get('#native-keyboard-frame').then(($el) => $el[0].remove());
        const ticker = '[data-testid="landing-ticker-toggle"]';
        const recordTicker = (method: string) => {
            cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
            cy.get(ticker).then(($el) => observations.push({ target: 'ticker', method, pressed: $el.attr('aria-pressed') }));
        };
        recordTicker('initial');
        cy.get(ticker).focus(); cy.press(Cypress.Keyboard.Keys.ENTER); recordTicker('press-enter');
        cy.get(ticker).focus().type('{enter}'); recordTicker('type-enter');
        cy.get(ticker).focus(); cy.press(Cypress.Keyboard.Keys.SPACE); recordTicker('press-space');
        cy.then(() => {
            expect(clicks, 'native fixture click listener operational').to.be.greaterThan(0);
            cy.writeFile(`${Cypress.config('screenshotsFolder')}/keyboard-calibration.json`, { observations, events });
        });
    });
});
