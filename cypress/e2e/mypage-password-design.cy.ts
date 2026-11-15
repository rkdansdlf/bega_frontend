/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('My Page password presentation without password writes', () => {
  const pressureOnly = Cypress.expose('passwordPressureOnly') === true;
  for (const hasPassword of [true, false]) for (const width of pressureOnly ? [320, 390] : [320, 390, 1280]) for (const font of pressureOnly ? [32] : [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${hasPassword ? 'change' : 'set'} / ${width}px / ${font}px / ${theme}`, () => {
      const mode = hasPassword ? 'change' : 'set', id = `${mode}-${width}-${font}-${theme}`;
      const origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const viewer = { id: 990100, email: 'password-ui@example.invalid', name: '합성 작성자', handle: 'synthetic_password_viewer',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword, provider: hasPassword ? 'LOCAL' : 'GOOGLE' };
      const section = '[data-testid="mypage-password-change-section"]', error = '[data-testid="mypage-password-change-error"]';
      const prefix = '[data-testid="mypage-password-change-', submit = `${prefix}submit"]`, cancel = `${prefix}cancel"]`, toggle = `${prefix}new-visibility"]`;
      const fields = hasPassword ? ['current', 'new', 'confirm'] : ['new', 'confirm'];
      const reads: string[] = [], mutations: string[] = [], unexpected: string[] = [], findings: string[] = [];
      const observations: Array<Record<string, unknown>> = [], keys: Array<{ key: string; trusted: boolean }> = [];
      let foreignBlocked = 0, finished = false;
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/password-${id}.json`, {
        mode, width, font, theme, pressureOnly, reads, mutations, unexpected, findings, observations, keys, foreignBlocked, finished,
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
      cy.intercept('GET', `${origin}/api/auth/mypage`, (req) => {
        reads.push('profile'); req.reply({ body: { success: true, data: toAuthApiUser(viewer) } });
      });
      cy.intercept('GET', `${origin}/api/users/me/follow-counts`, { body: { followerCount: 0, followingCount: 0 } });
      cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
      cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
      cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
      cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
      const align = (selector: string) => cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
      const sample = (state: string) => {
        cy.get(section).then(async ($el) => { await $el[0].ownerDocument.fonts.ready; });
        cy.get(section).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          const outer = doc.querySelector('.mypage-season-view-scope')!.getBoundingClientRect();
          const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
          const escaped = Array.from(el.querySelectorAll<HTMLElement>('input,button,label,h2,p,[role="alert"]')).flatMap((node) => {
            const nr = node.getBoundingClientRect(); return nr.left < r.left - 1 || nr.right > r.right + 1
              ? [{ tag: node.tagName, testid: node.dataset.testid, left: nr.left, right: nr.right }] : [];
          });
          observations.push({ state, documentWidth, panelLeft: r.left, panelRight: r.right, outerLeft: outer.left, outerRight: outer.right, escaped });
          if (documentWidth > width + 1 || r.left < outer.left - 1 || r.right > outer.right + 1 || escaped.length) findings.push(`${state}: panel/control horizontal overflow`);
          const textNodes = state === 'default' ? Array.from(el.querySelectorAll<HTMLElement>('h2,label'))
            : state.endsWith('-error') ? Array.from(el.querySelectorAll<HTMLElement>('[data-slot="alert-title"],[data-slot="alert-description"]')) : [];
          if (state === 'default') expect(textNodes).to.have.length(fields.length + 1);
          if (state.endsWith('-error')) expect(textNodes).to.have.length(2);
          for (const textEl of textNodes) {
            const tr = textEl.getBoundingClientRect(), parent = textEl.closest('[role="alert"]')?.getBoundingClientRect() ?? r;
            const walker = doc.createTreeWalker(textEl, NodeFilter.SHOW_TEXT), splitWords: string[] = [], unmeasurableWords: string[] = [];
            let wordCount = 0;
            while (walker.nextNode()) {
              const node = walker.currentNode;
              for (const match of (node.textContent ?? '').matchAll(/\S+/gu)) {
                wordCount++;
                const range = doc.createRange(); range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
                const lines = new Set(Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0).map((rect) => Math.round(rect.top * 10)));
                if (!lines.size) unmeasurableWords.push(match[0]);
                if (lines.size > 1) splitWords.push(match[0]);
              }
            }
            const contained = tr.left >= parent.left - 1 && tr.right <= parent.right + 1;
            expect(wordCount).to.be.greaterThan(0);
            observations.push({ state: `${state}-copy`, tag: textEl.tagName, slot: textEl.dataset.slot, width: tr.width, height: tr.height, wordCount, splitWords, unmeasurableWords, contained });
            if (splitWords.length || unmeasurableWords.length || !contained) findings.push(`${state}: fragmented/escaping copy`);
          }
        }); persist(); cy.screenshot(`password-${id}-${state}`, { capture: 'viewport' });
      };
      const measureFields = (state: string) => {
        for (const field of fields) {
          const input = `${prefix}${field}"]`, eye = `${prefix}${field}-visibility"]`;
          align(input); cy.get(input).then(($el) => {
            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
            const button = doc.querySelector<HTMLElement>(eye)!, br = button.getBoundingClientRect(), style = win.getComputedStyle(el);
            const usable = r.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
            const context = doc.createElement('canvas').getContext('2d')!;
            context.font = style.font;
            const glyphWidth = context.measureText('M').width;
            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            const eyeCoversCenter = Boolean(hit && (hit === button || button.contains(hit)));
            const overlaps = br.left < r.right && br.right > r.left && br.top < r.bottom && br.bottom > r.top;
            const reserved = parseFloat(style.paddingRight), required = overlaps ? Math.max(0, r.right - br.left) : 0;
            const eyeName = button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent?.trim() || '';
            observations.push({ state: `${state}-${field}`, width: r.width, height: r.height, usable, glyphWidth, inputFont: style.font, reserved, required, overlaps, eyeCoversCenter,
              eyeWidth: br.width, eyeHeight: br.height, eyeName });
            if (eyeCoversCenter || usable < glyphWidth || reserved + 1 < required) findings.push(`${state}-${field}: input/visibility space`);
            if (!eyeName && !button.getAttribute('aria-labelledby')) findings.push(`${state}-${field}: unnamed visibility control`);
          });
        }
      };
      const activate = (selector: string, force = false) => {
        align(selector); cy.get(selector).should('not.be.disabled').click({ force });
      };
      const fill = (selector: string, value: string) => { align(selector); cy.get(selector).clear({ log: false }).type(value, { log: false }); };
      cy.viewport(width, width === 1280 ? 900 : 844);
      cy.visit('/mypage?view=changePassword', { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
        win.addEventListener('keydown', (event) => { if (['Tab', 'Enter'].includes(event.key)) keys.push({ key: event.key, trusted: event.isTrusted }); });
      } });
      cy.get(section).should('exist'); cy.contains(`${section} h2`, hasPassword ? '비밀번호 변경' : '비밀번호 설정').should('exist');
      cy.get(`${prefix}current"]`).should(hasPassword ? 'exist' : 'not.exist'); cy.get(submit).should('be.disabled'); align(section); sample('default'); measureFields('default');
      persist();
      if (hasPassword) fill(`${prefix}current"]`, 'synthetic-current-only');
      fill(`${prefix}new"]`, 'abc'); fill(`${prefix}confirm"]`, 'abc');
      activate(submit, true); cy.get(error).should('contain.text', '비밀번호는 8자 이상이어야 합니다.'); align(error); sample('short-error'); measureFields('short-error');
      fill(`${prefix}new"]`, 'synthetic-new-only');
      fill(`${prefix}confirm"]`, 'synthetic-other-only');
      activate(submit, true); cy.get(error).should('contain.text', '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.'); align(error); sample('mismatch-error');
      fill(`${prefix}confirm"]`, 'synthetic-new-only'); cy.get(error).should('not.exist');
      cy.contains(section, '비밀번호가 일치합니다.').should('exist'); cy.get(submit).should('not.be.disabled'); align(section); sample('matching');
      for (const field of fields) {
        const eye = `${prefix}${field}-visibility"]`, input = `${prefix}${field}"]`;
        const label = field === 'current' ? '현재 비밀번호' : field === 'new' ? '새 비밀번호' : '비밀번호 확인';
        activate(eye); cy.get(input).should('have.attr', 'type', 'text');
        cy.get(eye).should('have.attr', 'aria-label', `${label} 숨기기`).and('have.attr', 'aria-pressed', 'true');
        cy.then(() => { observations.push({ state: 'visibility-toggle', field, masked: false }); });
        if (field === 'new') sample('revealed');
        activate(eye); cy.get(input).should('have.attr', 'type', 'password');
        cy.get(eye).should('have.attr', 'aria-label', `${label} 보기`).and('have.attr', 'aria-pressed', 'false');
        cy.then(() => { observations.push({ state: 'visibility-toggle', field, masked: true }); });
        if (field === 'new') sample('remasked');
      }
      const controls = fields.flatMap((field) => [`${prefix}${field}"]`, `${prefix}${field}-visibility"]`]).concat([cancel, submit]);
      align(controls[0]); cy.get(controls[0]).then(($el) => $el[0].focus());
      for (let index = 0; index < controls.length; index++) {
        if (index) cy.press(Cypress.Keyboard.Keys.TAB);
        cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
        cy.document().then((doc) => {
          const el = doc.activeElement as HTMLElement, r = el.getBoundingClientRect(), expected = doc.querySelector(controls[index]);
          const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), clear = Boolean(hit && (hit === el || el.contains(hit)));
          observations.push({ state: `native-${index}`, expected: el === expected, clear, focusVisible: el.matches(':focus-visible'),
            width: r.width, height: r.height, hit: hit?.outerHTML.slice(0, 250) ?? null });
          if (el !== expected || !clear || !el.matches(':focus-visible')) findings.push(`native-${index}: order/center/visibility`);
          if (['BUTTON', 'INPUT'].includes(el.tagName) && (r.width < 43.99 || r.height < 43.99)) findings.push(`native-${index}: target size`);
        });
      }
      sample('native-last');
      cy.then(() => {
        expect(mutations).to.deep.equal([]); expect(unexpected).to.deep.equal([]);
        expect(keys.filter((key) => key.key === 'Tab')).to.deep.equal(Array(controls.length - 1).fill({ key: 'Tab', trusted: true }));
        expect(keys.filter((key) => key.key === 'Enter')).to.deep.equal([]);
        finished = true;
      }); persist(); cy.then(() => expect(findings, 'bounded design findings').to.deep.equal([]));
    });
  }
});
