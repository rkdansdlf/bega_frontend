/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('My Page blocked users read states without unblock actions', () => {
  const boundaryOnly = Cypress.expose('blockedBoundaryOnly') === true;
  const boundaryFocusOnly = Cypress.expose('blockedBoundaryFocusOnly') === true;
  for (const width of boundaryFocusOnly ? [768] : boundaryOnly ? [767, 768] : [320, 390, 1280]) for (const font of boundaryFocusOnly ? [32] : [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const viewer = { id: 990090, email: 'block-list@example.invalid', name: '합성 작성자', handle: 'synthetic_block_viewer',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
      const section = '[data-testid="mypage-blocked-users-section"]', buttons = `${section} [data-testid="profile-unblock-button"]`;
      const emptyText = '차단한 사용자가 없습니다.';
      const errorPanel = '[data-testid="mypage-blocked-users-error"]', retry = '[data-testid="mypage-blocked-users-retry"]';
      const goodUrl = `${origin}/synthetic-block-good.svg`, badUrl = `${origin}/synthetic-block-missing.svg`;
      const users = Array.from({ length: 6 }, (_, index) => ({ id: 990300 + index,
        handle: `synthetic_blocked_${index + 1}`, name: index === 2 ? '합성 긴 이름의 사용자' : `합성 사용자 ${index + 1}`,
        profileImageUrl: index === 0 ? goodUrl : index === 1 ? badUrl : null, favoriteTeam: null, isFollowedByMe: false }));
      const page = (content: typeof users) => ({ content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, last: true });
      const reads: string[] = [], mutations: string[] = [], unexpected: string[] = [], findings: string[] = [];
      const observations: Array<Record<string, unknown>> = [], tabs: boolean[] = [];
      let mode: 'error' | 'empty' | 'data' = 'error', foreignBlocked = 0, goodReplies = 0, badReplies = 0, finished = false;
      let release!: () => void, releaseEmpty!: () => void;
      const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
      const emptyGate = new Cypress.Promise<void>((resolve) => { releaseEmpty = resolve; });
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/blocked-${id}.json`, {
        width, font, theme, boundaryOnly, boundaryFocusOnly, reads, mutations, unexpected, findings, observations, tabs, foreignBlocked, goodReplies, badReplies, finished,
      }));
      cy.intercept({ url: '**', middleware: true }, (req) => {
        const url = new URL(req.url);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          mutations.push(`${req.method} ${url.href}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
        }
        if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
        if (!['/mypage', '/offline.html'].includes(url.pathname) && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
          && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
          unexpected.push(`route:${url.pathname}`); return req.reply({ statusCode: 503, body: {} });
        }
      });
      cy.intercept('**/api/**', (req) => { unexpected.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
      cy.intercept('**/auth/**', (req) => { unexpected.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
      cy.intercept('GET', `${origin}/api/auth/mypage`, { body: { success: true, data: toAuthApiUser(viewer) } });
      cy.intercept('GET', `${origin}/api/users/me/follow-counts`, { body: { followerCount: 0, followingCount: 0 } });
      cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
      cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
      cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
      cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
      cy.intercept('GET', goodUrl, (req) => { goodReplies++; req.reply({ headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#226655"/></svg>' }); });
      cy.intercept('GET', badUrl, (req) => { badReplies++; req.reply({ statusCode: 404, body: '', headers: { 'cache-control': 'no-store' } }); });
      cy.intercept('GET', `${origin}/api/users/me/blocked?*`, (req) => {
        const url = new URL(req.url);
        expect(Array.from(url.searchParams.entries()).sort()).to.deep.equal([['page', '0'], ['size', '20']]);
        reads.push(mode); req.alias = 'blocked-read';
        if (mode === 'error') return gate.then(() => req.reply({ statusCode: 503, body: { message: '합성 차단 목록 조회 실패' } }));
        if (mode === 'empty') return emptyGate.then(() => req.reply({ body: page([]) }));
        return req.reply({ body: page(users) });
      });
      const visit = () => cy.visit('/mypage?view=blockedUsers', { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
        win.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabs.push(event.isTrusted); });
      } });
      const align = (selector: string) => cy.get(selector).first().then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
      const sample = (state: string) => {
        cy.get(section).then(async ($el) => { await $el[0].ownerDocument.fonts.ready; });
        cy.get(section).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
          const outer = doc.querySelector('[data-testid="profile-edit-section-runtime"]')!.getBoundingClientRect();
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
          const clipped = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="profile-unblock-button"]')).flatMap((button, index) => {
            const row = button.parentElement!, rr = row.getBoundingClientRect(), br = button.getBoundingClientRect();
            const copy = row.querySelector<HTMLElement>('.flex-col'), cr = copy?.getBoundingClientRect();
            return rr.left < r.left - 1 || rr.right > r.right + 1 || br.left < rr.left - 1 || br.right > rr.right + 1
              || !cr || cr.width < font ? [{ index, rowWidth: rr.width, buttonWidth: br.width, textWidth: cr?.width }] : [];
          });
          const panelEscapes = r.left < 0 || r.right > doc.documentElement.clientWidth + 1 || r.left < outer.left - 1 || r.right > outer.right + 1;
          observations.push({ state, documentWidth, panelEscapes, panelLeft: r.left, panelRight: r.right, panelWidth: r.width,
            outerLeft: outer.left, outerRight: outer.right, clipped, empty: el.textContent?.includes(emptyText), text: el.textContent?.slice(0, 450) });
          if (panelEscapes) findings.push(`${state}: panel escapes viewport/settings`);
          if (documentWidth > width + 1 || clipped.length) findings.push(`${state}: row/text geometry`);
        }); persist(); cy.screenshot(`blocked-${id}-${state}`, { capture: 'viewport' });
      };
      cy.viewport(width, width === 1280 ? 900 : 844); visit();
      cy.wrap(null).should(() => expect(reads).to.deep.equal(['error']));
      cy.get(`${section} .animate-spin`).should('exist'); cy.contains(section, emptyText).should('not.exist'); align(section); sample('held');
      cy.then(() => release()); cy.wait('@blocked-read').its('response.statusCode').should('equal', 503);
      cy.wait('@blocked-read').its('response.statusCode').should('equal', 503);
      cy.get(`${section} .animate-spin`).should('not.exist'); sample('terminal-error');
      cy.contains(section, emptyText).should('not.exist'); cy.get(errorPanel).should('be.visible');
      align(errorPanel); sample('error-aligned');
      cy.get(errorPanel).find('strong, p').should(($nodes) => {
        expect($nodes).to.have.length(2);
        expect($nodes[0].textContent).to.include('차단 목록을 불러오지 못했습니다.');
        for (const node of Array.from($nodes)) expect(Cypress.dom.isVisible(Cypress.$(node))).to.equal(true);
      }).then(($nodes) => {
        for (const el of Array.from($nodes)) {
          const r = el.getBoundingClientRect(), doc = el.ownerDocument;
          const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const clear = Boolean(hit && (hit === el || el.contains(hit)));
          observations.push({ state: 'error-copy', tag: el.tagName, clear, width: r.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
          if (!clear || el.scrollWidth > el.clientWidth + 1 || r.left < 0 || r.right > doc.documentElement.clientWidth + 1) findings.push('error copy: clipped/covered');
        }
      });
      align(retry); cy.get(retry).then(($el) => {
        const r = $el[0].getBoundingClientRect(); observations.push({ state: 'error-retry', width: r.width, height: r.height });
        if (r.width < 44 || r.height < 44) findings.push('error retry: target size');
      });
      cy.then(() => { mode = 'empty'; }); cy.get(retry).click();
      cy.get(`${section} .animate-spin`).should('exist'); cy.contains(section, emptyText).should('not.exist'); sample('retry-held');
      cy.then(() => releaseEmpty()); cy.wait('@blocked-read');
      cy.get(errorPanel).should('not.exist'); cy.contains(section, emptyText).should('exist'); align(section); sample('healthy-empty');
      cy.then(() => { mode = 'data'; }); visit(); cy.wait('@blocked-read');
      cy.get(buttons).should(($buttons) => {
        expect($buttons).to.have.length(users.length);
        Array.from($buttons).forEach((button, index) => expect(button.parentElement?.textContent).to.include(users[index].handle));
      }); align(buttons);
      cy.get(`${section} img[src="${goodUrl}"]`).should(($el) => {
        const img = $el[0] as HTMLImageElement; expect(img.complete && img.naturalWidth > 0).to.equal(true);
      });
      cy.get(`${section} img[src="${badUrl}"]`).should('not.exist');
      sample('populated');
      cy.get(buttons).first().then(($el) => {
        const button = $el[0], row = button.parentElement!, identity = row.querySelector('.mypage-blocked-identity')!;
        const win = button.ownerDocument.defaultView!, direction = win.getComputedStyle(row).flexDirection;
        observations.push({ state: 'layout-mode', direction, identityDirection: win.getComputedStyle(identity).flexDirection,
          buttonDirection: win.getComputedStyle(button).flexDirection });
        if (boundaryOnly && direction !== (width < 768 ? 'column' : 'row')) findings.push('boundary: unexpected row layout');
      });
      cy.get(buttons).eq(1).parent().find('[data-testid="profile-avatar-fallback"]').then(($el) => {
        $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      });
      cy.get(buttons).eq(1).parent().find('[data-testid="profile-avatar-fallback"]').then(($el) => {
        const r = $el[0].getBoundingClientRect(), visible = Cypress.dom.isVisible($el);
        observations.push({ state: 'fallback', visible, width: r.width, height: r.height });
        if (!visible || r.width <= 0 || r.height <= 0) findings.push('fallback: invisible or collapsed after alignment');
      });
      align(buttons);
      cy.get(buttons).first().then(($el) => { $el[0].focus(); });
      for (let index = 0; index < 6; index++) {
        if (index) cy.press(Cypress.Keyboard.Keys.TAB);
        cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
        cy.document().then((doc) => {
          const el = doc.activeElement as HTMLElement, expected = doc.querySelectorAll(buttons)[index], r = el.getBoundingClientRect();
          const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const clear = Boolean(hit && (hit === el || el.contains(hit)));
          const style = doc.defaultView!.getComputedStyle(el);
          observations.push({ state: `focus-${index}`, expected: el === expected, clear, focusVisible: el.matches(':focus-visible'), width: r.width, height: r.height,
            minHeight: style.minHeight, computedHeight: style.height, transform: style.transform,
            left: r.left, top: r.top, right: r.right, bottom: r.bottom, hit: hit?.outerHTML.slice(0, 350) ?? null });
          if (el !== expected || !clear || (index > 0 && !el.matches(':focus-visible'))) findings.push(`focus-${index}: order/visibility/center`);
          if (r.width < 43.99 || r.height < 43.99) findings.push(`focus-${index}: target size`);
        });
        persist(); cy.screenshot(`blocked-${id}-focus-${index}`, { capture: 'viewport' });
      }
      sample('last-row');
      cy.then(() => {
        expect(reads).to.deep.equal(['error', 'error', 'empty', 'data']);
        expect(mutations).to.deep.equal([]); expect(unexpected).to.deep.equal([]); expect(tabs).to.deep.equal(Array(5).fill(true));
        expect(goodReplies).to.be.greaterThan(0); expect(badReplies).to.be.greaterThan(0); finished = true;
      }); persist(); cy.then(() => expect(findings, 'bounded design findings').to.deep.equal([]));
    });
  }
});
