/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('My Page own Cheer read states without post mutations', () => {
  for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const viewer = { id: 990080, email: 'own-posts@example.invalid', name: '합성 작성자', handle: 'synthetic_own_posts',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
      const section = 'section[data-screen-label="응원석 글"]', cards = `${section} [data-testid="cheer-post-card"]`;
      const error = '[data-testid="mypage-cheer-posts-error"]', retry = '[data-testid="mypage-cheer-posts-retry"]';
      const pagingError = '[data-testid="mypage-cheer-posts-next-page-error"]';
      const empty = '[data-testid="mypage-cheer-posts-empty"]', write = '[data-testid="mypage-cheer-posts-empty-write"]';
      const more = '[data-testid="mypage-cheer-posts-more"]';
      const goodUrl = `${origin}/synthetic-own-post-good.svg`, missingUrl = `${origin}/synthetic-own-post-missing.svg`;
      const content = (index: number) => `합성 응원글 ${String(index + 1).padStart(2, '0')}입니다.`;
      const post = (index: number) => ({ id: 990200 + index, author: viewer.name, authorId: viewer.id, authorHandle: viewer.handle,
        authorTeamId: null, teamId: 'TESTH', postType: 'NORMAL', content: content(index), createdAt: '2020-01-01T00:00:00Z',
        isOwner: true, likes: 0, comments: 0, bookmarkCount: 0, repostCount: 0, views: 0,
        imageUrls: index === 0 ? [goodUrl, missingUrl] : [] });
      const page = (items: ReturnType<typeof post>[], number = 0, total = items.length, pages = items.length ? 1 : 0) => ({
        content: items, number, size: 10, totalElements: total, totalPages: pages, last: number + 1 >= pages,
      });
      const reads: string[] = [], mutations: string[] = [], unexpected: string[] = [], findings: string[] = [];
      const observations: Array<Record<string, unknown>> = [], tabEvents: Array<{ trusted: boolean }> = [];
      let mode: 'error' | 'empty' | 'data' = 'error', foreignBlocked = 0, moreRecovery = false, finished = false;
      let goodReplies = 0, missingReplies = 0, releaseInitial!: () => void, releaseMore!: () => void, releaseRecovery!: () => void;
      const initialGate = new Cypress.Promise<void>((resolve) => { releaseInitial = resolve; });
      const moreGate = new Cypress.Promise<void>((resolve) => { releaseMore = resolve; });
      const recoveryGate = new Cypress.Promise<void>((resolve) => { releaseRecovery = resolve; });
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/own-cheer-${id}.json`, {
        width, font, theme, foreignBlocked, reads, mutations, unexpected, findings, observations, tabEvents, goodReplies, missingReplies, finished,
      }));
      cy.intercept({ url: '**', middleware: true }, (req) => {
        const url = new URL(req.url);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          mutations.push(`${req.method} ${url.href}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
        }
        if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
        if (!['/mypage', '/offline.html'].includes(url.pathname) && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
          && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
          unexpected.push(`route:${url.pathname}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
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
      cy.intercept('GET', missingUrl, (req) => { missingReplies++; req.reply({ statusCode: 404, headers: { 'cache-control': 'no-store' }, body: '' }); });
      cy.intercept('GET', `${origin}/api/cheer/me/posts?*`, (req) => {
        const url = new URL(req.url), number = url.searchParams.get('page');
        expect(Array.from(url.searchParams.keys()).sort()).to.deep.equal(['page', 'size']);
        expect(url.searchParams.get('size')).to.equal('10'); expect(['0', '1']).to.include(number); reads.push(`${mode}:${number}`); req.alias = `own-posts-${number}`;
        if (mode === 'error') return initialGate.then(() => req.reply({ statusCode: 503, body: { message: '합성 내 글 조회 실패' } }));
        if (mode === 'empty') { expect(number).to.equal('0'); return req.reply({ body: page([]) }); }
        if (number === '0') return req.reply({ body: page(Array.from({ length: 10 }, (_, index) => post(index)), 0, 11, 2) });
        if (!moreRecovery) return moreGate.then(() => req.reply({ statusCode: 503, body: { message: '합성 내 글 추가 조회 실패' } }));
        return recoveryGate.then(() => req.reply({ body: page([post(10)], 1, 11, 2) }));
      });
      const visit = () => cy.visit('/mypage?view=cheerPosts', { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
        win.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabEvents.push({ trusted: event.isTrusted }); });
      } });
      const align = (selector: string) => cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
      const assertPosts = (count: number) => cy.get(cards).should(($cards) => {
        expect($cards).to.have.length(count);
        Array.from($cards).forEach((card, index) => expect(card.textContent, `ordered own record ${index + 1}`).to.include(content(index)));
      });
      const sample = (state: string) => {
        cy.get(section).then(async ($el) => { await $el[0].ownerDocument.fonts.ready; });
        cy.get(section).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
          const escaped = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="cheer-post-card"]')).flatMap((card, index) => {
            const cr = card.getBoundingClientRect(); return cr.left < r.left - 1 || cr.right > r.right + 1
              ? [{ index, cardLeft: cr.left, cardRight: cr.right, sectionLeft: r.left, sectionRight: r.right }] : [];
          });
          observations.push({ state, documentWidth, escaped, count: el.querySelectorAll('[data-testid="cheer-post-card"]').length, text: el.textContent?.slice(0, 500) });
          if (documentWidth > width + 1 || escaped.length) findings.push(`${state}: card/section horizontal overflow`);
        }); persist(); cy.screenshot(`own-cheer-${id}-${state}`, { capture: 'viewport' });
      };
      const measure = (selector: string, state: string) => {
        align(selector); cy.get(selector).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, r = el.getBoundingClientRect();
          const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), clear = Boolean(hit && (hit === el || el.contains(hit)));
          observations.push({ state, width: r.width, height: r.height, clear, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
          if (r.width < 43.99 || r.height < 43.99 || !clear || el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: control size/center/clipping`);
        });
      };
      cy.viewport(width, width === 1280 ? 900 : 844); visit();
      cy.wrap(null).should(() => expect(reads).to.deep.equal(['error:0']));
      cy.contains(section, '응원석 글을 불러오는 중...').should('exist'); align(section); sample('held');
      cy.then(() => releaseInitial()); cy.wait('@own-posts-0').its('response.statusCode').should('equal', 503);
      cy.get(error).should('contain.text', '응원석 글을 불러오지 못했습니다.'); cy.get(empty).should('not.exist'); sample('initial-error'); measure(retry, 'initial-retry');
      cy.then(() => { mode = 'empty'; }); cy.get(retry).click(); cy.wait('@own-posts-0');
      cy.get(empty).should('contain.text', '작성한 응원석 글이 없습니다'); cy.get(error).should('not.exist'); sample('healthy-empty'); measure(write, 'empty-write');
      cy.then(() => { mode = 'data'; }); visit(); cy.wait('@own-posts-0'); assertPosts(10); sample('page0');
      const image = `${cards} img[alt="게시 이미지 1"]`, placeholder = `${cards} [role="img"][aria-label="게시 이미지 2을 불러올 수 없습니다"]`;
      align(image); cy.get(image).should(($el) => { const img = $el[0] as HTMLImageElement; expect(img.complete && img.naturalWidth > 0).to.equal(true); });
      cy.get(placeholder).should('exist'); sample('decoded-and-fallback');
      align(placeholder);
      cy.get(placeholder).should('be.visible').then(($el) => {
        const el = $el[0], r = el.getBoundingClientRect(), visible = Cypress.dom.isVisible($el);
        observations.push({ state: 'image-placeholder', visible, width: r.width, height: r.height });
        if (!visible || r.width <= 0 || r.height <= 0) findings.push('image-placeholder: collapsed/invisible');
      });
      cy.get(cards).last().find('button').last().then(($el) => { $el[0].focus(); $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); });
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
      cy.document().then((doc) => {
        const el = doc.activeElement as HTMLElement, r = el.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const expected = doc.querySelector(more), clear = Boolean(hit && (hit === el || el.contains(hit)));
        observations.push({ state: 'more-native', actual: el.textContent, isExpected: el === expected, clear, focusVisible: el.matches(':focus-visible'), width: r.width, height: r.height });
        if (el !== expected || !clear || !el.matches(':focus-visible')) findings.push('more: native focus/order/center');
      }); persist(); cy.screenshot(`own-cheer-${id}-more-native`, { capture: 'viewport' });
      measure(more, 'more-control');
      cy.get(more).click(); cy.get(more).should('be.disabled').and('contain.text', '불러오는 중...'); assertPosts(10); sample('more-held');
      cy.then(() => releaseMore()); cy.wait('@own-posts-1').its('response.statusCode').should('equal', 503);
      cy.get(error).should('not.exist'); cy.get(pagingError).should('be.visible'); assertPosts(10); sample('more-error');
      align(pagingError); cy.get(pagingError).then(($el) => {
        const el = $el[0], r = el.getBoundingClientRect(), doc = el.ownerDocument;
        const contained = r.left >= 0 && r.right <= doc.documentElement.clientWidth + 1 && el.scrollWidth <= el.clientWidth + 1;
        observations.push({ state: 'paging-error-copy', left: r.left, right: r.right, width: r.width, contained });
        if (!contained) findings.push('paging error: clipped copy');
      }); persist(); cy.screenshot(`own-cheer-${id}-paging-error-copy`, { capture: 'viewport' });
      cy.get(section).then(($el) => {
        const count = $el.find('[data-testid="cheer-post-card"]').length;
        observations.push({ state: 'paging-retention', count }); if (count !== 10) findings.push('next-page503: existing10 records hidden');
      });
      measure(more, 'paging-retry');
      cy.then(() => { moreRecovery = true; }); align(more); cy.get(more).should('contain.text', '다시 시도').click();
      cy.get(more).should('be.disabled').and('contain.text', '불러오는 중...'); assertPosts(10); sample('retry-held'); measure(more, 'retry-held-control');
      cy.then(() => releaseRecovery());
      cy.wait('@own-posts-1'); assertPosts(11); cy.get(more).should('not.exist'); cy.get(pagingError).should('not.exist'); sample('recovered11');
      cy.then(() => {
        expect(reads).to.deep.equal(['error:0', 'empty:0', 'data:0', 'data:1', 'data:1']);
        expect(goodReplies).to.be.greaterThan(0); expect(missingReplies).to.be.greaterThan(0);
        expect(tabEvents).to.have.length(1); expect(tabEvents[0].trusted).to.equal(true);
        expect(mutations).to.deep.equal([]); expect(unexpected).to.deep.equal([]); finished = true;
      }); persist(); cy.then(() => expect(findings, 'own Cheer design findings').to.deep.equal([]));
    });
  }
});
