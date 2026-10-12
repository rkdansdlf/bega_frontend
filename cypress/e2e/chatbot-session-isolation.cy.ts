/// <reference types="cypress" />

export {};

describe('Chatbot viewer-session isolation', () => {
  it('discards legacy ownerless state and ignores a delayed prior-viewer transcript', () => {
    const viewerAId = 123;
    const viewerBId = 202;
    const sessionId = 990123;
    const viewerATitle = 'VIEWER_A_PRIVATE_TITLE_SENTINEL';
    const viewerAPendingMessage = 'VIEWER_A_PRIVATE_PENDING_SENTINEL';
    const viewerAMessage = 'VIEWER_A_PRIVATE_TRANSCRIPT_SENTINEL';
    let viewerAMessagesRequestStarted = false;
    let releaseViewerAMessages: (() => void) | null = null;

    cy.login('user');
    cy.mockAPI();
    cy.failOnUnexpectedApi401();
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

    cy.intercept('GET', `**/ai/chat/sessions/${sessionId}/messages*`, (request) => {
      viewerAMessagesRequestStarted = true;
      return new Cypress.Promise<void>((resolve) => {
        releaseViewerAMessages = () => {
          request.reply({
            statusCode: 200,
            body: {
              success: true,
              data: [{
                messageId: 99012301,
                sessionId,
                role: 'USER',
                status: 'COMPLETED',
                content: viewerAMessage,
                cancelled: false,
                favorite: false,
                createdAt: '2026-09-30T00:00:00Z',
                updatedAt: '2026-09-30T00:00:00Z',
              }],
            },
          });
          resolve();
        };
      });
    }).as('delayedViewerAMessages');

    cy.visit('/mypage');
    cy.contains('TestUser', { timeout: 20000 }).should('be.visible');
    cy.get('button[aria-label="챗봇 열기"]', { timeout: 20000 }).should('be.visible');
    cy.window().then(async (win) => {
      const authModule = await win.eval("import('/src/store/authStore.ts')") as {
        useAuthStore: { getState: () => { user: { id: number } | null } };
      };
      expect(authModule.useAuthStore.getState().user?.id).to.eq(viewerAId);
    });

    cy.window().then((win) => {
      win.sessionStorage.setItem(`chatbot_current_session_id:viewer:${viewerAId}`, String(sessionId));
      win.sessionStorage.setItem(`chatbot_current_session_title:viewer:${viewerAId}`, viewerATitle);
      win.sessionStorage.setItem(`last_pending_msg:viewer:${viewerAId}`, viewerAPendingMessage);
      win.sessionStorage.setItem('chatbot_current_session_id', '777');
      win.sessionStorage.setItem('chatbot_current_session_title', 'OWNERLESS_LEGACY_TITLE_SENTINEL');
      win.sessionStorage.setItem('last_pending_msg', 'OWNERLESS_LEGACY_MESSAGE_SENTINEL');
    });

    cy.get('button[aria-label="챗봇 열기"]').click();
    cy.get('[data-testid="chatbot-session-title"]').should('contain', viewerATitle);
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(`last_pending_msg:viewer:${viewerAId}`)).to.eq(viewerAPendingMessage);
    });
    cy.wrap(null).should(() => {
      expect(viewerAMessagesRequestStarted).to.eq(true);
    });

    cy.window().then(async (win) => {
      const authModule = await win.eval("import('/src/store/authStore.ts')") as {
        useAuthStore: {
          getState: () => {
            login: (
              email: string,
              name: string,
              profileImageUrl?: string | null,
              role?: string,
              favoriteTeam?: string,
              id?: number,
              cheerPoints?: number,
              handle?: string,
              provider?: string,
              hasPassword?: boolean,
            ) => void;
          };
        };
      };
      authModule.useAuthStore.getState().login(
        'viewer-b@example.invalid',
        'Viewer B',
        null,
        'ROLE_USER',
        undefined,
        viewerBId,
        0,
        'viewer-b',
        undefined,
        true,
      );
    });

    cy.get('[data-testid="chatbot-session-title"]').should('contain', '새 대화');
    cy.get('[data-testid="chatbot-message-input"]').should('have.value', '');
    cy.get('[aria-label="대화 내용"]').should('not.contain.text', viewerAMessage);
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('chatbot_current_session_id')).to.eq(null);
      expect(win.sessionStorage.getItem('chatbot_current_session_title')).to.eq(null);
      expect(win.sessionStorage.getItem('last_pending_msg')).to.eq(null);
      expect(win.sessionStorage.getItem(`chatbot_current_session_id:viewer:${viewerBId}`)).to.eq(null);
      expect(win.sessionStorage.getItem(`last_pending_msg:viewer:${viewerBId}`)).to.eq(null);
    });

    cy.then(() => {
      expect(releaseViewerAMessages).to.be.a('function');
      releaseViewerAMessages?.();
    });
    cy.wait('@delayedViewerAMessages');
    cy.get('[data-testid="chatbot-session-title"]').should('contain', '새 대화');
    cy.get('[data-testid="chatbot-message-input"]').should('have.value', '');
    cy.get('[aria-label="대화 내용"]').should('not.contain.text', viewerAMessage);
  });
});
