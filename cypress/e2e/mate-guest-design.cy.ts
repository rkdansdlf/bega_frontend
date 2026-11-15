/// <reference types="cypress" />

function findFragmentedWords(el: HTMLElement): string[] {
    const doc = el.ownerDocument;
    const words: string[] = [];
    const walker = doc.createTreeWalker(el, doc.defaultView!.NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        for (const match of (node.textContent ?? '').matchAll(/\S+/g)) {
            const range = doc.createRange();
            range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
            const lines = new Set(Array.from(range.getClientRects()).filter((r) => r.width > 0).map((r) => Math.round(r.top)));
            if (lines.size > 1) words.push(match[0]);
        }
    }
    return words;
}

// Real guest route; static product samples are not claimed as real game data.
describe('Mate static guest design matrix', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    const requests: string[] = [];
                    let writes = 0;
                    const entry = '[data-testid="mate-logged-out-entry"]';
                    const login = '[data-testid="mate-login-cta"]';
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-guest-${id}.json`, {
                        width, font, theme, findings, observations, requests, writes,
                    });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        const url = new URL(req.url);
                        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) requests.push(url.pathname);
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                            writes++;
                            return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                        }
                        if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
                            return req.reply({ statusCode: 401, body: { code: 'SYNTHETIC_GUEST_UNAUTHORIZED' } });
                        }
                        if (!['/mate', '/login'].includes(url.pathname) && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
                            req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                        }
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit('/mate', { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.localStorage.setItem('bega_has_visited', 'true');
                        win.localStorage.setItem('bega_dont_show_guide', 'true');
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    cy.get(entry, { timeout: 15000 }).should('exist');
                    cy.get('[data-testid="mate-guest-sample-card"]').should('have.length', 2);
                    cy.get(`${entry} button`).should('have.length', 2);
                    cy.window().then((win) => {
                        const doc = win.document;
                        expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                        expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                        const stored = JSON.parse(win.localStorage.getItem('auth-storage') ?? 'null');
                        expect(stored?.state?.user ?? null, 'no authenticated fixture').to.equal(null);
                        const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
                        observations.push({ state: 'guest', documentWidth, viewport: doc.documentElement.clientWidth });
                        if (documentWidth > doc.documentElement.clientWidth + 1) findings.push('document horizontal overflow');
                        doc.querySelectorAll<HTMLElement>(`${entry} h1, ${entry} h2, ${entry} p, ${entry} article span`).forEach((el, index) => {
                            const rect = el.getBoundingClientRect(), range = doc.createRange();
                            range.selectNodeContents(el);
                            const textRects = Array.from(range.getClientRects());
                            const clipped = textRects.some((r) => r.left < rect.left - 1 || r.right > rect.right + 1)
                                || el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
                            observations.push({ state: 'copy', index, text: el.innerText, width: rect.width, height: rect.height, clipped });
                            if (clipped) findings.push(`guest copy clipped: ${index}`);
                            if (width < 640) {
                                const fragmentedWords = findFragmentedWords(el);
                                observations.push({ state: 'mobile-copy-words', index, fragmentedWords });
                                if (fragmentedWords.length) findings.push(`guest mobile copy words fragmented: ${index}: ${fragmentedWords.join(', ')}`);
                            }
                        });
                    });
                    cy.screenshot(`mate-guest-${id}-entry`, { capture: 'viewport' });
                    const measureAction = (index: number, state: string, scroll = true) => {
                        if (scroll) cy.get(`${entry} button`).eq(index).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(`${entry} button`).eq(index).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            const rect = el.getBoundingClientRect();
                            const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
                            const hit = doc.elementFromPoint(x, y);
                            const reachable = rect.top >= 0 && rect.bottom <= win.innerHeight && Boolean(hit && (hit === el || el.contains(hit)));
                            const clipped = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
                            const fragmentedWords = findFragmentedWords(el);
                            observations.push({ state, index, text: el.innerText, width: rect.width, height: rect.height, reachable, clipped,
                                fragmentedWords, hit: hit?.getAttribute('data-testid') ?? hit?.tagName });
                            if (rect.width < 44 || rect.height < 44) findings.push(`${state} action below44px`);
                            if (!reachable) findings.push(`${state} action not reachable after ordinary scroll`);
                            if (clipped) findings.push(`${state} action text clipped`);
                            if (fragmentedWords.length) findings.push(`${state} action words fragmented: ${fragmentedWords.join(', ')}`);
                        });
                        cy.screenshot(`mate-guest-${id}-${state}`, { capture: 'viewport' });
                    };
                    measureAction(0, 'login-action'); measureAction(1, 'home-action');
                    cy.then(persist);
                    cy.get(login).focus();
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.get(`${entry} button`).eq(1).should('be.focused');
                    measureAction(1, 'keyboard-home', false);
                    cy.then(persist);
                    cy.get(login).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.get(login).click();
                    cy.location('pathname').should('equal', '/login');
                    cy.location('search').should('equal', '?redirect=%2Fmate');
                    cy.then(() => {
                        expect(requests.filter((path) => path.startsWith('/api/parties')), 'guest does not load an API party list').to.deep.equal([]);
                        expect(writes).to.equal(0);
                        observations.push({ finished: true, loginRedirect: '/login?redirect=%2Fmate' });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'guest design findings').to.deep.equal([]));
                });
            }
        }
    }
});
