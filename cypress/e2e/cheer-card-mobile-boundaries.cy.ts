/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

const viewer = {
  id: 970201, email: 'synthetic@example.invalid', name: '합성 작성자', handle: 'synthetic_author',
  favoriteTeam: null, role: 'ROLE_USER', hasPassword: true, profileImageUrl: null,
};
const scenarios = [
  { width: 320, font: 16, theme: 'light' },
  { width: 320, font: 32, theme: 'light' },
  { width: 390, font: 32, theme: 'dark' },
  { width: 1280, font: 16, theme: 'light' },
] as const;
class ClosedSocket extends EventTarget {
  static readonly CONNECTING = 0; static readonly OPEN = 1; static readonly CLOSING = 2; static readonly CLOSED = 3;
  readonly CONNECTING = 0; readonly OPEN = 1; readonly CLOSING = 2; readonly CLOSED = 3;
  readonly readyState = 3; readonly url: string; readonly protocol = ''; readonly extensions = ''; readonly bufferedAmount = 0;
  binaryType: BinaryType = 'blob'; onopen = null; onmessage = null; onerror = null; onclose = null;
  constructor(url: string | URL) { super(); this.url = String(url); }
  close() {} send() {}
}
const views = ['feed', 'profile', 'mypage', 'bookmarks'] as const;
const paths = { feed: '/cheer', profile: '/profile/@design_profile_qa', mypage: '/mypage?view=cheerPosts', bookmarks: '/cheer/bookmarks' };
const page = (content: unknown[]) => ({ content, last: true, number: 0, size: 20, totalPages: content.length ? 1 : 0, totalElements: content.length });

describe('shared Cheer card responsive boundaries', () => {
  for (const view of views) for (const { width, font, theme } of scenarios) {
    it(`${view} ${width}px / ${font}px / ${theme}`, () => {
      const origin = new URL(String(Cypress.config('baseUrl')));
      expect(['127.0.0.1', 'localhost']).to.include(origin.hostname);
      const writes: string[] = [], foreign: string[] = [], unknown: string[] = [], unknownLocal: string[] = [];
      const post = {
        id: 970101, author: viewer.name, authorId: viewer.id, authorHandle: viewer.handle, authorTeamId: null,
        teamId: 'LG', team: 'LG', content: '합성 게시글은 카드 경계를 지키면서 읽을 수 있어야 합니다.',
        createdAt: '2026-10-24T00:00:00Z', postType: 'NORMAL', isOwner: view === 'mypage', views: 0,
        likes: 1234, comments: 1234, likeCount: 1234, commentCount: 1234, bookmarkCount: 1234, repostCount: 1234, bookmarked: view === 'bookmarks', isBookmarked: view === 'bookmarks',
        imageUrls: [`${origin.origin}/synthetic-cheer-good.svg`, `${origin.origin}/synthetic-cheer-missing.svg`],
        ...(view === 'feed' ? { shareMode: 'EXTERNAL_LINK', sourceInfo: { url: 'https://example.invalid/synthetic' } } : {}),
        ...(view === 'profile' ? { author: 'syntheticauthor'.repeat(4), repostType: 'SIMPLE', originalPost: { id: 970102, author: '합성 원작성자', authorHandle: 'synthetic_original', teamId: 'LG', content: '합성 원문', likeCount: 1234, commentCount: 1234, repostCount: 1234, imageUrls: [`${origin.origin}/synthetic-cheer-good.svg`, `${origin.origin}/synthetic-cheer-missing.svg`] } } : {}),
      };
      cy.intercept({ url: '**', middleware: true }, (req) => {
        const url = new URL(req.url);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          writes.push(`${req.method} ${url.pathname}`); return req.reply({ statusCode: 503, body: {} });
        }
        if (url.origin !== origin.origin) { foreign.push(url.hostname); return req.reply({ forceNetworkError: true }); }
        const localRead = url.pathname.startsWith('/api/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/src/')
          || url.pathname.startsWith('/node_modules/.vite/') || url.pathname.startsWith('/@vite/') || url.pathname.startsWith('/@id/')
          || [new URL(paths[view], origin).pathname, '/favicon.ico', '/manifest.json', '/sw.js', '/theme-init.js',
            '/performance-shell-init.js', '/seo-routes.json', '/@react-refresh', '/node_modules/vite/dist/client/env.mjs',
            '/synthetic-cheer-good.svg', '/synthetic-cheer-missing.svg'].includes(url.pathname);
        if (!localRead) { unknownLocal.push(url.pathname); return req.reply({ statusCode: 404, body: '' }); }

        if (String(req.headers.accept || '').includes('text/html')) req.continue((res) => {
          const html = String(res.body)
            .replace(/<link[^>]*rel="(?:dns-prefetch|preconnect)"[^>]*>/g, '')
            .replace(/<noscript>[\s\S]*?cdn\.jsdelivr\.net[\s\S]*?<\/noscript>/, '')
            .replace(/<script>\s*\(function \(\) \{\s*var HREF = 'https:\/\/cdn\.jsdelivr\.net[\s\S]*?<\/script>/, '');
          expect(html).not.to.contain('cdn.jsdelivr.net'); res.body = html;
        });
      });
      cy.intercept({ pathname: '/api/**' }, (req) => {
        const p = new URL(req.url).pathname;
        let body: unknown;
        if (['/api/cheer/posts', '/api/cheer/user/design_profile_qa/posts', '/api/cheer/me/posts', '/api/cheer/bookmarks'].includes(p)) body = page([post]);
        else if (p === '/api/cheer/posts/hot' || p === '/api/leaderboard') body = page([]);
        else if (p === '/api/cheer/posts/changes') body = { newCount: 0, latestId: post.id };
        else if (p === '/api/kbo/schedule') body = [];
        else if (p === '/api/auth/mypage') body = { success: true, data: viewer };
        else if (p === '/api/users/profile/%40design_profile_qa' || p === '/api/users/profile/@design_profile_qa') body = { success: true, data: { name: '합成 프로필', handle: '@design_profile_qa', favoriteTeam: null, bio: '합성 자기소개', cheerPoints: 0, profileImageUrl: null } };
        else if (p.endsWith('/follow-counts')) body = { followerCount: 0, followingCount: 0, isFollowedByMe: false, blockedByMe: false, blockingMe: false };
        else if (p === '/api/dm/rooms/my') body = { success: true, data: [] };
        else if (p === '/api/chat/my/unread-counts') body = { success: true, data: 0 };
        else if (p === '/api/notifications/my') body = [];
        else if (p === '/api/notifications/my/unread-count') body = 0;
        else { unknown.push(p); return req.reply({ statusCode: 503, body: {} }); }
        req.reply({ statusCode: 200, body });
      });
      cy.intercept('GET', '**/synthetic-cheer-good.svg', { headers: { 'content-type': 'image/svg+xml' }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><rect width="120" height="100" fill="#375b50"/></svg>' });
      cy.intercept('GET', '**/synthetic-cheer-missing.svg', { statusCode: 404, body: '' });
      cy.intercept('GET', '**/sw.js', { statusCode: 404, body: '' });
      cy.viewport(width, width === 1280 ? 900 : 844);
      cy.visit(paths[view], { onBeforeLoad(win) {
        if ('serviceWorker' in win.navigator) {
          expect(win.navigator.serviceWorker.controller).to.equal(null);
          Object.defineProperty(win.navigator.serviceWorker, 'register', { configurable: true, value: () => Promise.reject(new Error('Synthetic test disables service workers')) });
        }
        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
        win.document.documentElement.style.fontSize = `${font}px`;
        win.document.documentElement.style.scrollBehavior = 'auto';
        win.WebSocket = ClosedSocket as unknown as typeof WebSocket;
      } });
      const card = '[data-testid="cheer-post-card"]';
      cy.get(card, { timeout: 25000 }).first().should(($card) => {
        const c = $card[0], doc = c.ownerDocument, r = c.getBoundingClientRect();
        const body = c.querySelector<HTMLElement>('.cheer-card-mobile-content')!;
        const b = body.getBoundingClientRect(), section = c.closest('section[data-screen-label="응원석 글"]')?.getBoundingClientRect();
        expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
        expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
        expect(doc.documentElement.scrollWidth).to.be.at.most(width + 1);
        expect(r.left).to.be.at.least(-1); expect(r.right).to.be.at.most(width + 1);
        expect(b.left).to.be.at.least(r.left - 1); expect(b.right).to.be.at.most(r.right + 1);
        if (section) {
          expect(r.left).to.be.at.least(section.left - 1); expect(r.right).to.be.at.most(section.right + 1);
          const panel = c.closest<HTMLElement>('.mypage-season-panel')!, p = panel.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(panel);
          expect(r.left).to.be.at.least(p.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft) - 1);
          expect(r.right).to.be.at.most(p.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight) + 1);
        }
        if (width === 1280) expect(doc.defaultView!.getComputedStyle(body.parentElement!).flexDirection).to.equal('row');
      });
      if (view !== 'profile' && width < 640) cy.get(`${card} .cheer-card-mobile-copy`).should(($el) => {
        const el = $el[0], doc = el.ownerDocument, walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const found = new Set<string>(); let node: Node | null;
        while ((node = walker.nextNode())) for (const word of ['게시글은', '지키면서', '있어야']) {
          const index = (node.textContent || '').indexOf(word); if (index < 0) continue;
          const range = doc.createRange(); range.setStart(node, index); range.setEnd(node, index + word.length);
          const lines = new Set(Array.from(range.getClientRects()).filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top)));
          expect(lines.size, word).to.equal(1); found.add(word);
        }
        expect(found.size).to.equal(3);
      });
      if (view === 'feed') cy.get(`${card} .cheer-card-mobile-label`).should(($el) => {
        const r = $el[0].getBoundingClientRect(), c = $el[0].closest(card)!.getBoundingClientRect();
        expect($el.text()).to.contain('example.invalid'); expect(r.left).to.be.at.least(c.left - 1); expect(r.right).to.be.at.most(c.right + 1);
      });
      if (view === 'profile' && width < 640) cy.get(`${card} .cheer-card-mobile-label > span`).should(($el) => {
        const e = $el[0], r = e.getBoundingClientRect(), c = e.closest(card)!.getBoundingClientRect();
        expect(e.textContent).to.contain('syntheticauthor'); expect(r.left).to.be.at.least(c.left - 1); expect(r.right).to.be.at.most(c.right + 1);
        expect(e.scrollWidth).to.be.at.most(e.clientWidth + 1);
      });
      cy.get(`${card} img[alt="게시 이미지 1"]`).first().then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
      cy.get(`${card} img[alt="게시 이미지 1"]`).first().should(($el) => expect(($el[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
      cy.get(`${card} [role="img"][aria-label="게시 이미지 2을 불러올 수 없습니다"]`).first().should('be.visible');
      cy.get(`${card} img[alt="게시 이미지 1"], ${card} [role="img"][aria-label="게시 이미지 2을 불러올 수 없습니다"]`).should('have.length', 2).each(($image) => {
        const rect = $image[0].getBoundingClientRect(), bounds = $image[0].closest(card)!.getBoundingClientRect();
        expect(rect.width).to.be.greaterThan(0); expect(rect.height).to.be.greaterThan(0);
        expect(rect.left).to.be.at.least(bounds.left - 1); expect(rect.right).to.be.at.most(bounds.right + 1);
      });
      cy.get(`${card} button[aria-label^="리포스트"]`).first().then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' })).click({ scrollBehavior: false });
      cy.get(`${card} [data-testid="cheer-card-interactions"]`).should('exist');
      cy.get(`${card} [data-testid="cheer-card-bookmark"]`).should('have.attr', 'aria-pressed', view === 'bookmarks' ? 'true' : 'false');
      cy.get('body').type('{esc}');
      cy.get(`${card} [data-testid="cheer-card-interactions"] button[data-testid^="cheer-card-"]`).should('have.length', 4).each(($button) => {
        cy.wrap($button).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' })).should(($el) => {
          const e = $el[0], doc = e.ownerDocument, r = e.getBoundingClientRect(), c = e.closest(card)!.getBoundingClientRect();
          const hit = doc.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
          const number = e.querySelector('[data-testid="rolling-number-current"]')!, range = doc.createRange(); range.selectNodeContents(number);
          const lines = new Set(Array.from(range.getClientRects()).filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top)));
          expect(r.width).to.be.at.least(44); expect(r.height).to.be.at.least(44);
          expect(r.left).to.be.at.least(c.left - 1); expect(r.right).to.be.at.most(c.right + 1);
          expect(hit === e || Boolean(hit && e.contains(hit))).to.equal(true);
          expect(number.textContent).to.equal('1234'); expect(e.scrollWidth).to.be.at.most(e.clientWidth + 1); expect(lines.size).to.equal(1);
        });
      });
      cy.then(() => { expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]); expect(unknownLocal).to.deep.equal([]); expect(foreign).to.deep.equal([]); });
    });
  }
});
