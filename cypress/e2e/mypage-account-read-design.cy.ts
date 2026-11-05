/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('My Page account read states without account actions', () => {
  const focusOnly = Cypress.expose('accountFocusOnly') === true;
  for (const width of focusOnly ? [320] : [320, 390, 768, 1280]) for (const font of focusOnly ? [32] : [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const viewer = { id: 990110, email: 'account-ui@example.invalid', name: '합성 작성자', handle: 'synthetic_account_viewer',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
      const account = '[data-testid="account-settings-section"]', security = '[data-testid="account-settings-security-runtime"]';
      const providers = `${account} > section:first-of-type`, sessions = `${security} > section:nth-of-type(1)`, events = `${security} > section:nth-of-type(2)`;
      const providerButtons = `${providers} [data-testid^="account-settings-provider-"]`;
      const assertData = () => {
        cy.get(`${providers} .mypage-account-provider-card`).should('have.length', 3);
        for (const [provider, label] of [['google', '연동 해제'], ['kakao', '연동하기'], ['naver', '연동 해제']]) {
          cy.get(`[data-testid="account-settings-provider-${provider}"]`).should('not.be.disabled').and('contain.text', label);
        }
        cy.contains(providers, 'google@example.invalid').should('exist');
        cy.contains(providers, 'naver@example.invalid').should('exist');
        cy.get(`${sessions} .mypage-account-session-card`).should(($cards) => {
          expect($cards).to.have.length(2);
          expect($cards[0].textContent).to.include('합성 현재 기기');
          expect($cards[1].textContent).to.include('합성 다른 기기');
        });
        cy.get(`${events} .mypage-account-event-card`).should(($cards) => {
          expect($cards).to.have.length(2);
          expect($cards[0].textContent).to.include('합성 로그인 기록');
          expect($cards[1].textContent).to.include('합성 보안 기록');
        });
      };
      const datasets = ['providers', 'sessions', 'events'] as const;
      type Dataset = typeof datasets[number];
      const providerData = [{ provider: 'GOOGLE', providerId: 'synthetic-google', email: 'google@example.invalid', connectedAt: '2020-01-01T00:00:00Z' },
        { provider: 'NAVER', providerId: 'synthetic-naver', email: 'naver@example.invalid', connectedAt: '2020-01-01T00:00:00Z' }];
      const sessionData = [{ id: 'synthetic-other', deviceLabel: '합성 다른 기기', deviceType: 'mobile', browser: 'Synthetic Browser', os: 'Synthetic OS',
        lastActiveAt: '2020-01-02T00:00:00Z', isCurrent: false, isRevoked: false, ip: '192.0.2.20' },
      { id: 'synthetic-current', deviceLabel: '합성 현재 기기', deviceType: 'desktop', browser: 'Synthetic Browser', os: 'Synthetic OS',
        lastActiveAt: '2020-01-01T00:00:00Z', isCurrent: true, isRevoked: false, ip: '192.0.2.10' }];
      const eventData = [{ id: 990401, eventType: 'LOGIN_SUCCESS', message: '합성 로그인 기록', occurredAt: '2020-01-02T00:00:00Z',
        deviceLabel: '합성 다른 기기', browser: 'Synthetic Browser', os: 'Synthetic OS', ip: '192.0.2.20' },
      { id: 990402, eventType: 'LOGIN_SUCCESS', message: '합성 보안 기록', occurredAt: '2020-01-01T00:00:00Z',
        deviceLabel: '합성 현재 기기', browser: 'Synthetic Browser', os: 'Synthetic OS', ip: '192.0.2.10' }];
      const reads: string[] = [], mutations: string[] = [], unexpected: string[] = [], findings: string[] = [];
      const observations: Array<Record<string, unknown>> = [], tabs: boolean[] = [];
      const cacheChecked = (width === 320 && font === 32) || (width === 1280 && font === 16);
      let mode: 'error' | 'empty' | 'data' | 'cached-error' = 'error', foreignBlocked = 0, profileReads = 0, finished = false, release!: () => void, releaseEmpty!: () => void, releaseCached!: () => void;
      const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
      const emptyGate = new Cypress.Promise<void>((resolve) => { releaseEmpty = resolve; });
      const cachedGate = new Cypress.Promise<void>((resolve) => { releaseCached = resolve; });
      const cacheReads: string[] = [];
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/account-${id}.json`, {
        width, font, theme, focusOnly, cacheChecked, cacheReads, reads, mutations, unexpected, findings, observations, tabs, foreignBlocked, profileReads, finished,
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
      cy.intercept('GET', `${origin}/api/auth/mypage`, (req) => { profileReads++; req.reply({ body: { success: true, data: toAuthApiUser(viewer) } }); });
      cy.intercept('GET', `${origin}/api/users/me/follow-counts`, { body: { followerCount: 0, followingCount: 0 } });
      cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
      cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
      cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
      cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
      cy.intercept('GET', `${origin}/api/users/me/blocked?*`, (req) => {
        expect(new URL(req.url).searchParams.get('page')).to.equal('0');
        expect(new URL(req.url).searchParams.get('size')).to.equal('20');
        cacheReads.push('blocked'); req.alias = 'cache-blocked';
        req.reply({ body: { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, last: true } });
      });
      for (const dataset of datasets) {
        const path = dataset === 'events' ? 'security-events' : dataset;
        cy.intercept('GET', `${origin}/api/auth/${path}`, (req) => {
          reads.push(`${mode}:${dataset}`); req.alias = `read-${dataset}`;
          if (mode === 'error' || mode === 'cached-error') return (mode === 'error' ? gate : cachedGate).then(() => req.reply({ statusCode: 503, body: { message: '합성 계정 정보 조회 실패' } }));
          if (mode === 'empty') return emptyGate.then(() => req.reply({ body: { success: true, data: [] } }));
          const data = dataset === 'providers' ? providerData : dataset === 'sessions' ? sessionData : eventData;
          return req.reply({ body: { success: true, data } });
        });
      }
      const visit = () => cy.visit('/mypage?view=accountSettings', { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
        win.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabs.push(event.isTrusted); });
      } });
      const align = (selector: string) => cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
      const activateSecurity = () => {
        cy.get(account).children('div').should('have.length', 2).last().then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
        cy.get(security).should('exist');
      };
      const sample = (selector: string, state: string) => {
        align(selector); cy.get(selector).then(async ($el) => { await $el[0].ownerDocument.fonts.ready; });
        cy.get(selector).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          const panel = doc.querySelector(account)!.getBoundingClientRect(), outer = doc.querySelector('[data-testid="profile-edit-section-runtime"]')!.getBoundingClientRect();
          const escaped = Array.from(el.querySelectorAll<HTMLElement>('p,button,span')).flatMap((node) => {
            if (!node.textContent?.trim()) return [];
            const nr = node.getBoundingClientRect(); return nr.left < r.left - 1 || nr.right > r.right + 1
              ? [{ tag: node.tagName, text: node.textContent.slice(0, 60), left: nr.left, right: nr.right }] : [];
          });
          const panelEscapes = panel.left < 0 || panel.right > doc.documentElement.clientWidth + 1 || panel.left < outer.left - 1 || panel.right > outer.right + 1;
          observations.push({ state, panelEscapes, panelWidth: panel.width, outerWidth: outer.width, escaped, text: el.textContent?.slice(0, 500) });
          if (panelEscapes || escaped.length) findings.push(`${state}: panel/content overflow`);
        }); persist(); cy.screenshot(`account-${id}-${state}`, { capture: 'viewport' });
      };
      const providerState = (state: string) => cy.get(providerButtons).then(($buttons) => {
        const labels = Array.from($buttons).map((button) => button.textContent?.trim()), disabled = Array.from($buttons).map((button) => (button as HTMLButtonElement).disabled);
        observations.push({ state, labels, disabled });
        if (state === 'providers-error' && labels.every((label) => label === '연동하기')) findings.push('providers503: presented as disconnected');
      });
      const failureMessage = (selector: string, dataset: Dataset) => cy.get(selector).then(($el) => {
        const nodes = Array.from($el[0].querySelectorAll<HTMLElement>('p,strong,[role="alert"]')).filter((node) => /불러오지 못|실패|오류/.test(node.textContent ?? ''));
        observations.push({ state: `${dataset}-failure-message`, present: nodes.length > 0, visible: nodes.some((node) => Cypress.dom.isVisible(Cypress.$(node))) });
        if (!nodes.length) findings.push(`${dataset}503: failure message absent`);
      });
      const waitReads = () => { for (const dataset of datasets) cy.wait(`@read-${dataset}`); };
      const probeControls = (controls: string[], phase: string) => {
        align(controls[0]); cy.get(controls[0]).then(($el) => $el[0].focus());
        for (let index = 0; index < controls.length; index++) {
          if (index) cy.press(Cypress.Keyboard.Keys.TAB);
          cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
          cy.document().then((doc) => {
            const el = doc.activeElement as HTMLElement, r = el.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            const expected = doc.querySelector(controls[index]), clear = Boolean(hit && (hit === el || el.contains(hit)));
            observations.push({ state: `native-${phase}-${index}`, expected: el === expected, clear, focusVisible: el.matches(':focus-visible'), width: r.width, height: r.height,
              left: r.left, top: r.top, right: r.right, bottom: r.bottom, viewportWidth: doc.documentElement.clientWidth, viewportHeight: doc.defaultView!.innerHeight,
              hit: hit?.outerHTML.slice(0, 250) ?? null });
            if (el !== expected || !clear || !el.matches(':focus-visible')) findings.push(`native-${phase}-${index}: order/center/visibility`);
            if (r.width < 43.99 || r.height < 43.99) findings.push(`native-${phase}-${index}: target size`);
          });
        }
      };
      cy.viewport(width, width === 1280 ? 900 : 844); visit();
      cy.get(providerButtons).should('have.length', 3).and(($buttons) => expect(Array.from($buttons).every((button) => (button as HTMLButtonElement).disabled)).to.equal(true));
      sample(providers, 'providers-held'); providerState('providers-held'); activateSecurity();
      cy.contains(providers, '연동되지 않음').should('not.exist');
      cy.contains(sessions, '기기 정보를 불러오는 중입니다.').should('exist'); cy.contains(events, '최근 보안 활동을 불러오는 중입니다.').should('exist');
      sample(sessions, 'sessions-held'); sample(events, 'events-held');
      cy.then(() => release()); waitReads(); waitReads();
      cy.contains(sessions, '기기 정보를 불러오지 못했습니다.').should('exist');
      cy.contains(events, '최근 보안 활동을 불러오는 중입니다.').should('not.exist');
      for (const dataset of datasets) cy.get(`[data-testid="account-settings-${dataset}-error"]`).should('be.visible');
      cy.get(providerButtons).should(($buttons) => expect(Array.from($buttons).every((button) => (button as HTMLButtonElement).disabled)).to.equal(true));
      cy.contains(providers, '연동되지 않음').should('not.exist');
      sample(providers, 'providers-error'); providerState('providers-error'); sample(sessions, 'sessions-error'); sample(events, 'events-error');
      failureMessage(providers, 'providers'); failureMessage(events, 'events');
      cy.get(events).then(($el) => {
        const falseEmpty = $el.text().includes('아직 보안 활동 기록이 없습니다.');
        observations.push({ state: 'events-error-classification', falseEmpty });
        if (falseEmpty) findings.push('securityEvents503: healthy empty shown');
      });
      probeControls(['account-settings-providers-retry', 'mypage-account-logout', 'account-settings-sessions-retry', 'account-settings-events-retry', 'account-settings-advanced-open'].map((testid) => `[data-testid="${testid}"]`), 'error');
      cy.then(() => { mode = 'empty'; });
      for (const dataset of datasets) {
        const selector = `[data-testid="account-settings-${dataset}-retry"]`; align(selector); cy.get(selector).click();
      }
      cy.contains(providers, '연동 정보를 불러오는 중입니다.').should('exist');
      cy.contains(sessions, '기기 정보를 불러오는 중입니다.').should('exist'); cy.contains(events, '최근 보안 활동을 불러오는 중입니다.').should('exist');
      cy.get(providerButtons).should(($buttons) => expect(Array.from($buttons).every((button) => (button as HTMLButtonElement).disabled)).to.equal(true));
      sample(providers, 'providers-retry-held'); sample(sessions, 'sessions-retry-held'); sample(events, 'events-retry-held');
      cy.then(() => releaseEmpty()); waitReads();
      cy.contains(sessions, '기기 정보가 없습니다.').should('exist'); cy.contains(events, '아직 보안 활동 기록이 없습니다.').should('exist');
      sample(providers, 'providers-empty'); sample(sessions, 'sessions-empty'); sample(events, 'events-empty');
      cy.then(() => { mode = 'data'; }); visit(); cy.wait('@read-providers'); activateSecurity(); cy.wait('@read-sessions'); cy.wait('@read-events');
      assertData();
      sample(providers, 'providers-data'); sample(sessions, 'sessions-data'); sample(events, 'events-data');
      const controls = ['account-settings-provider-google', 'account-settings-provider-kakao', 'account-settings-provider-naver', 'mypage-account-logout',
        'account-settings-session-end-synthetic-other', 'account-settings-other-sessions', 'account-settings-advanced-open'].map((testid) => `[data-testid="${testid}"]`);
      probeControls(controls, 'data');
      sample(`${security} > section:nth-of-type(3)`, 'advanced-readonly');
      if (cacheChecked) {
        cy.then(() => cy.clock(Date.now(), ['Date']));
        cy.contains('[data-testid="profile-edit-section-runtime"] [role="tab"]', '차단 관리').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
        cy.contains('[data-testid="profile-edit-section-runtime"] [role="tab"]', '차단 관리').click(); cy.wait('@cache-blocked');
        cy.get('[data-testid="mypage-blocked-users-section"]').should('exist'); cy.tick(61_000);
        cy.then(() => { mode = 'cached-error'; });
        cy.contains('[data-testid="profile-edit-section-runtime"] [role="tab"]', '계정 설정').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
        cy.contains('[data-testid="profile-edit-section-runtime"] [role="tab"]', '계정 설정').click(); activateSecurity();
        cy.wrap(null).should(() => { for (const dataset of datasets) expect(reads.filter((value) => value === `cached-error:${dataset}`)).to.have.length(1); });
        assertData();
        sample(providers, 'providers-cache-held'); sample(sessions, 'sessions-cache-held'); sample(events, 'events-cache-held');
        cy.then(() => releaseCached()); waitReads(); waitReads();
        for (const dataset of datasets) cy.get(`[data-testid="account-settings-${dataset}-error"]`).should('be.visible');
        assertData();
        sample(providers, 'providers-cache-error'); sample(sessions, 'sessions-cache-error'); sample(events, 'events-cache-error');
      }
      cy.then(() => {
        for (const dataset of datasets) expect(reads.filter((value) => value.endsWith(`:${dataset}`))).to.deep.equal([`error:${dataset}`, `error:${dataset}`, `empty:${dataset}`, `data:${dataset}`, ...(cacheChecked ? [`cached-error:${dataset}`, `cached-error:${dataset}`] : [])]);
        expect(cacheReads).to.deep.equal(cacheChecked ? ['blocked'] : []);
        expect(mutations).to.deep.equal([]); expect(unexpected).to.deep.equal([]); expect(tabs).to.deep.equal(Array(10).fill(true)); finished = true;
      }); persist(); cy.then(() => expect(findings, 'bounded design findings').to.deep.equal([]));
    });
  }
});
