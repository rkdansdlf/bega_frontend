/// <reference types="cypress" />

export {};

const dialogSelector = '[role="dialog"][aria-modal="true"][aria-label="BEGA 야구 가이드 챗봇"]';

const expectPanelRect = (selector: string, expected: {
  left?: number;
  top?: number;
  width: number;
  height: number;
  right?: number;
  bottom?: number;
}) => {
  cy.get(selector).should(($element) => {
    const rect = $element[0].getBoundingClientRect();
    for (const [edge, value] of Object.entries(expected)) {
      expect(rect[edge as keyof DOMRect]).to.be.closeTo(Number(value), 2);
    }
  });
};

const expectPanelOnTop = (selector: string, point: { x: number; y: number }) => {
  cy.get(selector).should(($element) => {
    const element = $element[0];
    const hitTarget = element.ownerDocument.elementFromPoint(point.x, point.y);
    expect(hitTarget && element.contains(hitTarget)).to.eq(true);
  });
};

const waitForPanelEntrance = () => cy.get('[data-testid="chatbot-panel"]').should(($panel) => {
  const hasRunningEntrance = $panel[0].getAnimations().some((animation) => (
    animation.playState === 'running' || animation.pending
  ));
  expect(hasRunningEntrance).to.eq(false);
});

const expectPanelOpaque = (selector: string) => cy.get(selector).should(($panel) => {
  expect(getComputedStyle($panel[0]).opacity).to.eq('1');
});

const visitAuthenticatedMyPage = () => {
  cy.login('user');
  cy.mockAPI();
  cy.intercept('GET', '**/api/ai/chat/sessions*', {
    statusCode: 200,
    body: { success: true, data: [] },
  });
  cy.intercept('GET', '**/api/ai/chat/favorites*', {
    statusCode: 200,
    body: { success: true, data: [] },
  });
  cy.intercept('GET', '**/api/diary/entries*', {
    statusCode: 200,
    body: [],
  });
  cy.intercept('GET', '**/api/diary/statistics*', {
    statusCode: 200,
    body: {
      totalCount: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      winRate: 0,
      monthlyCount: 0,
      yearlyCount: 0,
      yearlyWins: 0,
      yearlyWinRate: 0,
      mostVisitedStadium: '',
      mostVisitedCount: 0,
      happiestMonth: '',
      happiestCount: 0,
      firstDiaryDate: '',
      cheerPostCount: 0,
      mateParticipationCount: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      currentLossStreak: 0,
      opponentWinRates: {},
      bestOpponent: '',
      worstOpponent: '',
      dayOfWeekStats: {},
      luckyDay: '',
      earnedBadges: [],
    },
  });
  cy.visit('/mypage');
  cy.contains('TestUser', { timeout: 20000 }).should('be.visible');
};

describe('authenticated chatbot modal accessibility', () => {
  it('contains mobile focus through lazy loading, closes on Escape, and restores the opener', () => {
    cy.viewport(390, 844);
    visitAuthenticatedMyPage();

    cy.intercept('GET', '**/src/components/chatbot/ChatBotSessionRuntime.tsx*', (request) => {
      request.on('response', (response) => {
        response.setDelay(700);
      });
    }).as('loadChatbotSessionRuntime');

    cy.get('[data-testid="auth-mobile-chatbot-tab"]')
      .should('be.visible')
      .click();

    cy.get(dialogSelector).should('be.visible').then(($dialog) => {
      cy.get('[data-testid="chatbot-panel"]').should('be.visible');
      cy.contains('챗봇 패널을 불러오는 중입니다.').should('be.visible');
      waitForPanelEntrance();
      expectPanelOpaque('[data-testid="chatbot-panel"]');
      expectPanelRect(dialogSelector, { left: 0, top: 0, width: 390, height: 844 });
      expectPanelRect('[data-testid="chatbot-panel"]', { left: 0, top: 0, width: 390, height: 844 });
      expectPanelOnTop('[data-testid="chatbot-panel"]', { x: 195, y: 400 });
      cy.screenshot('chatbot-modal-a11y/mobile-lazy-fallback', {
        capture: 'viewport',
        disableTimersAndAnimations: false,
      });
      cy.get('[data-testid="chatbot-panel"]').screenshot('chatbot-modal-a11y/mobile-lazy-fallback-panel', {
        disableTimersAndAnimations: false,
      });
      cy.get('[data-testid="chatbot-panel"] [aria-label="챗봇 닫기"]')
        .focus()
        .trigger('keydown', { key: 'Tab', keyCode: 9, which: 9, shiftKey: true });
      cy.focused().should(($focused) => {
        expect($dialog[0].contains($focused[0])).to.eq(true);
      });
    });

    cy.get('[data-testid="chatbot-message-input"]', { timeout: 15000 }).should('be.visible');
    waitForPanelEntrance();
    cy.get('[data-testid="chatbot-panel"]').should('have.length', 1);
    expectPanelOpaque('[data-testid="chatbot-panel"]');
    cy.get('[data-testid="chatbot-message-input"]')
      .closest('[data-testid="chatbot-panel"]')
      .should('have.length', 1)
      .and('be.visible');
    expectPanelRect(dialogSelector, { left: 0, top: 0, width: 390, height: 844 });
    expectPanelRect('[data-testid="chatbot-panel"]', { left: 0, top: 0, width: 390, height: 844 });
    expectPanelOnTop('[data-testid="chatbot-panel"]', { x: 195, y: 400 });
    cy.screenshot('chatbot-modal-a11y/mobile-loaded', {
      capture: 'viewport',
      disableTimersAndAnimations: false,
    });
    cy.get('[data-testid="chatbot-message-input"]')
      .closest('[data-testid="chatbot-panel"]')
      .screenshot('chatbot-modal-a11y/mobile-loaded-panel', { disableTimersAndAnimations: false });
    cy.get(dialogSelector).should('be.visible').then(($dialog) => {
      cy.focused().should(($focused) => {
        expect($dialog[0].contains($focused[0])).to.eq(true);
      });

      const focusable = Array.from($dialog[0].querySelectorAll<HTMLElement>([
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(','))).filter((element) => (
        element.offsetParent !== null || element.getClientRects().length > 0
      ));
      expect(focusable.length).to.be.greaterThan(1);

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      lastFocusable.focus();
      cy.wrap(lastFocusable).trigger('keydown', { key: 'Tab', keyCode: 9, which: 9 });
      cy.focused().should(($focused) => {
        expect($focused[0]).to.equal(firstFocusable);
      });

      firstFocusable.focus();
      cy.wrap(firstFocusable).trigger('keydown', {
        key: 'Tab',
        keyCode: 9,
        which: 9,
        shiftKey: true,
      });
      cy.focused().should(($focused) => {
        expect($focused[0]).to.equal(lastFocusable);
      });

      cy.get('[data-testid="chatbot-session-close"]')
        .focus()
        .trigger('keydown', { key: 'Escape', keyCode: 27, which: 27 });
    });

    cy.get(dialogSelector).should('not.exist');
    cy.get('[data-testid="auth-mobile-chatbot-tab"]').should('be.focused');
  });

  it('keeps the desktop chatbot as a non-modal panel', () => {
    cy.viewport(1440, 900);
    visitAuthenticatedMyPage();

    cy.get('[data-testid="chatbot-request-launcher"]').should('be.visible').click();
    cy.get('[data-testid="chatbot-message-input"]', { timeout: 15000 }).should('be.visible');
    waitForPanelEntrance();
    expectPanelOpaque('[data-testid="chatbot-panel"]');
    cy.get(dialogSelector).should('not.exist');
    cy.get('[data-testid="chatbot-panel"]').should('have.length', 1);
    cy.get('[data-testid="chatbot-message-input"]')
      .closest('[data-testid="chatbot-panel"]')
      .should('have.length', 1)
      .and('be.visible');
    cy.window().then((win) => cy.get('[data-testid="chatbot-panel"]').should(($panel) => {
      const panel = $panel[0];
      const rect = panel.getBoundingClientRect();
      const style = win.getComputedStyle(panel);
      expect(style.position).to.eq('fixed');
      expect(rect.width).to.be.at.least(390);
      expect(rect.height).to.eq(600);
      expect(rect.left).to.be.at.least(0);
      expect(rect.top).to.be.at.least(0);
      expect(rect.right).to.be.at.most(win.innerWidth);
      expect(rect.bottom).to.be.at.most(win.innerHeight);
      expect(rect.right).to.be.closeTo(win.document.documentElement.clientWidth - parseFloat(style.right), 2);
      expect(rect.bottom).to.be.closeTo(win.document.documentElement.clientHeight - parseFloat(style.bottom), 2);
    }));
    cy.window().then((win) => {
      expectPanelOnTop('[data-testid="chatbot-panel"]', {
        x: Math.floor(win.document.documentElement.clientWidth - 210),
        y: Math.floor(win.document.documentElement.clientHeight - 300),
      });
    });
    cy.screenshot('chatbot-modal-a11y/desktop-loaded', {
      capture: 'viewport',
      disableTimersAndAnimations: false,
    });
    cy.get('[data-testid="chatbot-message-input"]')
      .closest('[data-testid="chatbot-panel"]')
      .screenshot('chatbot-modal-a11y/desktop-loaded-panel', { disableTimersAndAnimations: false });

    cy.get('[data-testid="chatbot-message-input"]')
      .trigger('keydown', { key: 'Escape', keyCode: 27, which: 27 });
    cy.get('[data-testid="chatbot-panel"]').should('be.visible');
  });

  it('keeps the mobile panel visible when reduced motion is enabled', () => {
    cy.viewport(390, 844);
    visitAuthenticatedMyPage();
    cy.document().then((document) => {
      document.documentElement.dataset.reducedMotion = 'true';
    });

    cy.get('[data-testid="auth-mobile-chatbot-tab"]').click();
    cy.get('[data-testid="chatbot-message-input"]', { timeout: 15000 }).should('exist');
    waitForPanelEntrance();
    cy.get('[data-testid="chatbot-panel"]').should(($panel) => {
      expect(getComputedStyle($panel[0]).opacity).to.eq('1');
    });
    cy.screenshot('chatbot-modal-a11y/mobile-reduced-motion-loaded', {
      capture: 'viewport',
      disableTimersAndAnimations: false,
    });
  });
});
