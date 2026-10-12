/// <reference types="cypress" />

export {};

const uploadTicketImage = () => {
  cy.get('input#ticketFile').selectFile(
    {
      contents: Cypress.Buffer.from('fake-ticket-image'),
      fileName: 'ticket.png',
      mimeType: 'image/png',
      lastModified: Date.now(),
    },
    { force: true }
  );
};

const switchToViewerBThroughUi = () => {
  cy.window().then((win) => {
    const capturedWindow = win as Window & {
      __capturedAuthEvents?: { type: string; detail: unknown }[];
    };
    const events: { type: string; detail: unknown }[] = [];
    capturedWindow.__capturedAuthEvents = events;
    ['auth-session-expired', 'global-api-error'].forEach((eventType) => {
      win.addEventListener(eventType, (event) => {
        events.push({
          type: eventType,
          detail: (event as CustomEvent<unknown>).detail,
        });
      });
    });
  });
  cy.intercept('POST', '**/api/auth/logout', {
    statusCode: 200,
    body: { success: true },
  }).as('logoutViewerA');
  cy.window().then((win) => {
    win.document.cookie = 'XSRF-TOKEN=synthetic-csrf; path=/';
  });
  cy.get('[data-testid="public-navbar-desktop-logout"]').click();
  cy.wait('@logoutViewerA');
  cy.location('pathname').should('eq', '/home');

  cy.intercept('POST', '**/api/auth/login', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        accessToken: 'viewer-b-access-token',
        refreshToken: 'viewer-b-refresh-token',
        id: 202,
        email: 'viewer-b@example.invalid',
        name: 'Viewer B',
        handle: 'viewer-b',
        role: 'ROLE_USER',
        hasPassword: true,
      },
    },
  }).as('loginViewerB');
  cy.intercept('GET', '**/auth/mypage*', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        id: 202,
        email: 'viewer-b@example.invalid',
        name: 'Viewer B',
        handle: 'viewer-b',
        favoriteTeam: 'LG',
        role: 'ROLE_USER',
        hasPassword: true,
        profileImageUrl: null,
      },
    },
  }).as('getViewerBProfile');

  cy.get('[data-testid="public-navbar-desktop-login"]').click();
  cy.location('pathname').should('eq', '/login');
  cy.get('[data-testid="login-email"]').type('viewer-b@example.invalid');
  cy.get('[data-testid="login-password"]').type('password123');
  cy.get('[data-testid="login-submit"]').click();
  cy.wait('@loginViewerB');
  cy.wait('@getViewerBProfile');
  cy.location('pathname').should('eq', '/home');
  cy.window().then((win) => {
    const events = (win as Window & {
      __capturedAuthEvents?: { type: string; detail: unknown }[];
    }).__capturedAuthEvents ?? [];
    expect(events, 'auth-expiry and login-required events during viewer switch').to.deep.equal([]);
  });

  cy.get('[data-nav-id="mate"]').click();
  cy.location('pathname').should('eq', '/mate');
  cy.get('[data-testid="mate-controls-create-desktop"]').click();
  cy.location('pathname').should('eq', '/mate/create');
  cy.contains('직관메이트 파티 만들기').should('be.visible');
};

describe('Mate Create Session Recovery', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.login('user');
    cy.mockAPI();

    cy.intercept('GET', '**/api/users/123/social-verified', {
      statusCode: 200,
      body: { success: true, data: true },
    }).as('socialVerified');
  });

  it('redirects to login and restores the draft after submit-time session expiry', () => {
    cy.intercept('POST', '**/api/tickets/analyze', {
      statusCode: 200,
      body: {
        date: '2026-05-20',
        time: '18:30:00',
        stadium: '잠실야구장',
        homeTeam: 'LG',
        awayTeam: 'KT',
        section: '1루석',
        row: '12',
        seat: '15',
        peopleCount: 2,
        price: 22000,
        reservationNumber: 'R-123456',
        gameId: 1001,
        verificationToken: 'verification-token',
      },
    }).as('analyzeTicketForRestore');

    cy.intercept('GET', '**/api/kbo/schedule*', {
      statusCode: 200,
      body: [
        {
          gameId: 'match-restore',
          time: '18:30',
          stadium: '잠실야구장',
          homeTeam: 'LG',
          awayTeam: 'KT',
        },
      ],
    }).as('scheduleForRestore');

    let reissueAttemptCount = 0;
    cy.intercept('**/auth/reissue*', (req) => {
      reissueAttemptCount += 1;
      req.reply({
        statusCode: 401,
        body: { success: false, message: 'Unauthorized' },
      });
    }).as('reissueExpiredForCreate');

    cy.intercept('POST', '**/api/parties', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('createPartyUnauthorized');

    cy.visit('/mate/create');
    cy.contains('직관메이트 파티 만들기').should('be.visible');

    uploadTicketImage();
    cy.wait('@analyzeTicketForRestore');
    cy.contains('경기 선택').should('be.visible');

    cy.get('#gameDate').should('have.value', '2026-05-20');
    cy.wait('@scheduleForRestore');
    cy.contains('잠실야구장').click();
    cy.contains('button', '다음').click();

    cy.contains('좌석 정보').should('be.visible');
    cy.contains('button', '홈 팀 응원').click();
    cy.get('input[placeholder="예: 305"]').clear().type('305');
    cy.get('input[placeholder="예: 12"]').clear().type('12');
    cy.get('#ticketPrice').clear().type('22000');
    cy.contains('button', '다음').click();

    cy.get('#description').clear().type('세션 만료 후에도 이어서 작성할 소개글입니다.');
    cy.contains('button', '파티 만들기').click();
    cy.contains('button', '확인').click();

    cy.wait('@createPartyUnauthorized');
    cy.then(() => {
      expect(reissueAttemptCount).to.eq(0);
    });
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', '?redirect=%2Fmate%2Fcreate');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('mate-storage:viewer:123')).to.contain('세션 만료 후에도 이어서 작성할 소개글입니다.');
    });

    cy.login('user');
    cy.visit('/mate/create');

    cy.contains('단계 4 / 4').should('be.visible');
    cy.get('#description').should('have.value', '세션 만료 후에도 이어서 작성할 소개글입니다.');

    cy.window().then((win) => {
      win.sessionStorage.setItem('mate-storage', 'ownerless legacy draft');
      win.sessionStorage.setItem('mateApplyDraft:77', 'ownerless legacy application');
      win.localStorage.setItem('prediction-storage', 'ownerless legacy prediction');
    });

    switchToViewerBThroughUi();

    cy.contains('단계 1 / 4').should('be.visible');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('mate-storage:viewer:123'))
        .to.contain('세션 만료 후에도 이어서 작성할 소개글입니다.');
      expect(win.sessionStorage.getItem('mate-storage:viewer:202')).to.eq(null);
      expect(win.sessionStorage.getItem('mate-storage')).to.eq(null);
      expect(win.sessionStorage.getItem('mateApplyDraft:77')).to.eq(null);
      expect(win.localStorage.getItem('prediction-storage')).to.eq(null);
    });
  });

  it('ignores a delayed party-create response after switching viewers', () => {
    cy.intercept('POST', '**/api/tickets/analyze', {
      statusCode: 200,
      body: {
        date: '2026-05-20',
        time: '18:30:00',
        stadium: '잠실야구장',
        homeTeam: 'LG',
        awayTeam: 'KT',
        section: '1루석',
        row: '12',
        seat: '15',
        peopleCount: 2,
        price: 22000,
        reservationNumber: 'R-123456',
        gameId: 1001,
        verificationToken: 'viewer-a-verification-token',
      },
    }).as('analyzeTicketForViewerA');

    cy.intercept('GET', '**/api/kbo/schedule*', {
      statusCode: 200,
      body: [{
        gameId: 'match-viewer-a',
        time: '18:30',
        stadium: '잠실야구장',
        homeTeam: 'LG',
        awayTeam: 'KT',
      }],
    }).as('scheduleForViewerA');

    cy.intercept('GET', '**/api/users/202/social-verified', {
      statusCode: 200,
      body: { success: true, data: true },
    }).as('socialVerifiedViewerB');

    let createPartyRequestStarted = false;
    let createPartyResponseCompleted = false;
    cy.intercept('POST', '**/api/parties', (req) => {
      createPartyRequestStarted = true;
      req.on('response', () => {
        createPartyResponseCompleted = true;
      });
      req.reply({
        delay: 8000,
        statusCode: 200,
        body: {
          id: 999,
          hostId: 123,
          hostName: 'Viewer A',
          gameDate: '2026-05-20',
          stadium: '잠실야구장',
          homeTeam: 'lg',
          awayTeam: 'kt',
          description: 'Viewer A synthetic party',
        },
      });
    }).as('delayedPartyCreateForViewerA');

    cy.visit('/mate/create');
    cy.contains('직관메이트 파티 만들기').should('be.visible');
    uploadTicketImage();
    cy.wait('@analyzeTicketForViewerA');
    cy.contains('경기 선택').should('be.visible');
    cy.get('#gameDate').should('have.value', '2026-05-20');
    cy.wait('@scheduleForViewerA');
    cy.contains('잠실야구장').click();
    cy.contains('button', '다음').click();

    cy.contains('좌석 정보').should('be.visible');
    cy.contains('button', '홈 팀 응원').click();
    cy.get('input[placeholder="예: 305"]').clear().type('305');
    cy.get('input[placeholder="예: 12"]').clear().type('12');
    cy.get('#ticketPrice').clear().type('22000');
    cy.contains('button', '다음').click();
    cy.get('#description').clear().type('Viewer A synthetic party description.');
    cy.contains('button', '파티 만들기').click();
    cy.contains('button', '확인').click();
    cy.then(() => expect(createPartyRequestStarted).to.eq(true));

    switchToViewerBThroughUi();
    cy.then(() => expect(createPartyResponseCompleted).to.eq(false));

    cy.wait('@delayedPartyCreateForViewerA')
      .its('response.statusCode', { timeout: 30000 })
      .should('eq', 200);
    cy.location('pathname').should('eq', '/mate/create');
    cy.contains('단계 1 / 4').should('be.visible');
    cy.get('#description').should('not.exist');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('mate-storage:viewer:123'))
        .to.contain('Viewer A synthetic party description.');
      expect(win.sessionStorage.getItem('mate-storage:viewer:202')).to.eq(null);
    });
  });
});
