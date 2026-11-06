/// <reference types="cypress" />

describe('Local blank-page keyboard dispatch calibration', () => {
    it('records native press, type and click without contacting the application', () => {
        const events: Array<Record<string, unknown>> = [];
        const counts: Record<string, number> = {};
        let clicks = 0;
        cy.visit('about:blank');
        cy.document().then((doc) => {
            const button = doc.createElement('button');
            button.id = 'local-keyboard-probe';
            button.textContent = 'Local probe';
            button.addEventListener('click', (event) => { clicks++; events.push({ type: event.type, trusted: event.isTrusted }); });
            for (const type of ['keydown', 'keypress', 'keyup']) {
                button.addEventListener(type, (event) => events.push({ type, key: (event as KeyboardEvent).key, trusted: event.isTrusted }));
            }
            doc.body.appendChild(button);
        });
        cy.get('#local-keyboard-probe').focus();
        cy.press(Cypress.Keyboard.Keys.ENTER);
        cy.then(() => { counts.afterNativePress = clicks; });
        cy.get('#local-keyboard-probe').focus().type('{enter}');
        cy.then(() => { counts.afterType = clicks; });
        cy.get('#local-keyboard-probe').click();
        cy.then(() => {
            counts.afterClick = clicks;
            expect(counts.afterClick).to.be.greaterThan(counts.afterType);
        });
        cy.writeFile(`${Cypress.config('screenshotsFolder')}/keyboard-dispatch-probe.json`, { counts, events });
    });
});
