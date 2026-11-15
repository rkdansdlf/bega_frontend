/// <reference types="cypress" />

// Static presentation only. Legal text applicability and account actions are outside this probe.
describe('Legal page headings and reading space', () => {
    for (const page of ['terms', 'privacy']) for (const width of [320, 390, 1280])
        for (const font of [16, 32]) for (const theme of ['light', 'dark']) {
            it(`${page} / ${width} / ${font} / ${theme}`, () => {
                const origin = new URL(String(Cypress.config('baseUrl'))).origin;
                expect(new URL(origin).hostname).to.equal('127.0.0.1');
                const api: string[] = [], mutations: string[] = [], findings: string[] = [];
                let foreign = 0;
                const observations: Array<Record<string, unknown>> = [];
                cy.intercept({ url: '**', middleware: true }, (req) => {
                    const url = new URL(req.url);
                    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                    if (mutation) mutations.push(`${req.method} ${url.href}`);
                    if (url.origin !== origin) { foreign++; return req.reply({ forceNetworkError: true }); }
                    if (mutation) return req.reply({ statusCode: 503, body: {} });
                    if (/^\/(api|auth)\//.test(url.pathname)) {
                        api.push(`${req.method} ${url.href}`);
                        return req.reply({ statusCode: 401, body: { success: false, code: 'UNAUTHORIZED' } });
                    }
                });
                cy.viewport(width, width === 1280 ? 900 : 844);
                cy.visit(`/${page}`, { onBeforeLoad(win) {
                    win.localStorage.clear(); win.sessionStorage.clear();
                    win.localStorage.setItem('kbo-theme', theme);
                    win.localStorage.setItem('bega_has_visited', 'true');
                    win.sessionStorage.setItem('cypress:skip-public-auth-bootstrap', '1');
                    win.document.documentElement.style.fontSize = `${font}px`;
                } });
                cy.get('.simple-markdown-content').should('be.visible');
                cy.get('main h1').should('have.length', 1).and('contain.text', page === 'terms' ? '이용약관' : '개인정보처리방침');
                cy.document().then((doc) => doc.fonts.ready);
                cy.document().should((doc) => {
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                });
                cy.document().then((doc) => {
                    const win = doc.defaultView!, content = doc.querySelector('.simple-markdown-content')!;
                    const heading = doc.querySelector('main h1')!;
                    const headings = [heading, ...Array.from(content.querySelectorAll('h1,h2,h3,h4,h5,h6'))];
                    const levels = headings.map((node) => Number(node.tagName.slice(1)));
                    const jumps = levels.flatMap((level, index) => index && level > levels[index - 1] + 1 ? [index] : []);
                    observations.push({ state: 'semantics', levels, jumps, contentControls: content.querySelectorAll('a,button,input,select,textarea,[tabindex]').length });
                    if (jumps.length) findings.push('heading hierarchy skips a level');
                    const fragmentWords: Array<{ heading: number; word: string; lines: number }> = [];
                    const unmeasurable: Array<{ heading: number; word: string }> = [];
                    let measuredWords = 0;
                    for (const [index, node] of headings.entries()) {
                        const walker = doc.createTreeWalker(node, win.NodeFilter.SHOW_TEXT);
                        let text: Node | null;
                        while ((text = walker.nextNode())) {
                            for (const match of (text.textContent ?? '').matchAll(/[^\s]+/g)) {
                                const range = doc.createRange();
                                range.setStart(text, match.index!); range.setEnd(text, match.index! + match[0].length);
                                const lines = new Set(Array.from(range.getClientRects()).filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top)));
                                if (!lines.size) unmeasurable.push({ heading: index, word: match[0] });
                                else measuredWords++;
                                if (lines.size > 1) fragmentWords.push({ heading: index, word: match[0], lines: lines.size });
                            }
                        }
                    }
                    observations.push({ state: 'heading-words', fragmented: fragmentWords, measuredWords, unmeasurable });
                    if (!measuredWords || unmeasurable.length) findings.push('incomplete heading measurements');
                    if (fragmentWords.length) findings.push('heading word fragments');
                    const blocks = Array.from(content.querySelectorAll('p,li,h2,h3,h4,h5,h6'));
                    const overflow = blocks.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent?.slice(0, 80));
                    const rect = heading.getBoundingClientRect(), headerBottom = doc.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
                    observations.push({ state: 'reading-bounds', documentWidth: Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth), overflow, title: { top: rect.top, bottom: rect.bottom, width: rect.width }, headerBottom });
                    if (overflow.length || Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > width) findings.push('reading content overflows');
                    if (rect.top < headerBottom && rect.bottom > 0) findings.push('initial title overlaps header');
                });
                cy.screenshot(`legal-${page}-${width}-${font}-${theme}-top`, { capture: 'viewport', disableTimersAndAnimations: false });
                cy.get('main h1').then(($title) => $title[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                cy.screenshot(`legal-${page}-${width}-${font}-${theme}-title-aligned`, { capture: 'viewport', disableTimersAndAnimations: false });
                cy.then(() => {
                    // These public routes still bootstrap auth. A 401 may attempt one refresh;
                    // it is blocked above and retained in the ledger, never forwarded.
                    expect(mutations.filter((value) => value !== `POST ${origin}/api/auth/reissue`)).to.deep.equal([]);
                    expect(mutations.length).to.be.at.most(1);
                    expect(api.filter((value) => value !== `GET ${origin}/api/auth/mypage` && value !== `GET ${origin}/auth/mypage`)).to.deep.equal([]);
                });
                cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/legal-${page}-${width}-${font}-${theme}.json`, {
                    page, width, font, theme, api, mutations, foreign, observations, findings, finished: true,
                }));
                cy.then(() => expect(findings, 'bounded presentation findings').to.deep.equal([]));
            });
        }
});
