/// <reference types="cypress" />

const uploadVerificationTicket = () => {
  cy.get('input#ticketVerifyFile').selectFile(
    {
      contents: Cypress.Buffer.from('fake-verified-ticket-image'),
      fileName: 'verified-ticket.png',
      mimeType: 'image/png',
      lastModified: Date.now(),
    },
    { force: true }
  );
};

describe('Mate Apply Session Recovery', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('redirects to login and restores message plus verification after submit-time session expiry', () => {
    const partyId = 668;

    cy.intercept('GET', `**/api/parties/${partyId}`, {
      statusCode: 200,
      body: {
        id: partyId,
        hostId: 1,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostAverageRating: 5,
        hostReviewCount: 3,
        teamId: 'SYNTHETIC_TEAM_A',
        gameDate: '2099-01-01',
        gameTime: '12:00:00',
        stadium: 'Synthetic venue',
        homeTeam: 'Synthetic Team A',
        awayTeam: 'Synthetic Team B',
        section: 'Synthetic section',
        maxParticipants: 3,
        currentParticipants: 1,
        description: 'apply restore party',
        ticketVerified: false,
        status: 'PENDING',
        ticketPrice: 17000,
      },
    }).as('getRestoreApplyParty');

    cy.intercept('POST', '**/api/tickets/analyze', {
      statusCode: 200,
      body: {
        date: '2026-03-07',
        time: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '내야',
        row: '12',
        seat: '15',
        peopleCount: 1,
        price: 17000,
        reservationNumber: 'R-RESTORE',
        gameId: 2001,
        verificationToken: 'restored-verification-token',
      },
    }).as('analyzeApplyTicket');

    let reissueAttemptCount = 0;
    cy.intercept('**/auth/reissue*', (req) => {
      reissueAttemptCount += 1;
      req.reply({
        statusCode: 401,
        body: { success: false, message: 'Unauthorized' },
      });
    }).as('reissueExpiredForApply');

    let applyAttempt = 0;
    cy.intercept('POST', '**/api/applications', (req) => {
      applyAttempt += 1;

      if (applyAttempt === 1) {
        req.reply({
          statusCode: 401,
          body: { message: 'Unauthorized' },
        });
        return;
      }

      expect(req.body.message).to.eq('세션 만료 후에도 이어질 신청 메시지입니다.');
      expect(req.body.verificationToken).to.eq('restored-verification-token');
      expect(req.body.ticketVerified).to.eq(true);

      req.reply({
        statusCode: 201,
        body: {
          id: 33,
          partyId,
          applicantId: 123,
          applicantName: 'USER',
          applicantBadge: 'NEW',
          applicantRating: 5,
          message: '세션 만료 후에도 이어질 신청 메시지입니다.',
          isPaid: false,
          isApproved: false,
          isRejected: false,
          createdAt: '2026-03-03T10:00:02Z',
        },
      });
    }).as('createRestoredApplication');

    cy.visit(`/mate/${partyId}/apply`);
    cy.wait('@getRestoreApplyParty');

    cy.get('textarea#message').type('세션 만료 후에도 이어질 신청 메시지입니다.');
    uploadVerificationTicket();
    cy.wait('@analyzeApplyTicket');
    cy.contains('인증 완료').should('be.visible');

    cy.contains('참여 신청하기').click();
    cy.wait('@createRestoredApplication');
    cy.then(() => {
      expect(reissueAttemptCount).to.eq(0);
    });
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=%2Fmate%2F${partyId}%2Fapply`);
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(`mateApplyDraft:${partyId}:viewer:123`)).to.contain('세션 만료 후에도 이어질 신청 메시지입니다.');
    });

    cy.login('user');
    cy.visit(`/mate/${partyId}/apply`);
    cy.wait('@getRestoreApplyParty');

    cy.get('textarea#message').should('have.value', '세션 만료 후에도 이어질 신청 메시지입니다.');
    cy.contains('인증 완료').should('be.visible');
    cy.contains('참여 신청하기').click();
    cy.wait('@createRestoredApplication');
    cy.location('pathname').should('eq', `/mate/${partyId}`);
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(`mateApplyDraft:${partyId}:viewer:123`)).to.eq(null);
    });
  });

  it('does not persist the previous viewer draft while the next viewer is hydrating', () => {
    const partyId = 669;
    const viewerAMessage = 'VIEWER_A_PRIVATE_DRAFT_SENTINEL';
    const viewerBId = 202;

    cy.intercept('GET', `**/api/parties/${partyId}`, {
      statusCode: 200,
      body: {
        id: partyId,
        hostId: 303,
        hostName: 'Synthetic Host',
        hostBadge: 'NEW',
        hostAverageRating: 5,
        hostReviewCount: 1,
        teamId: 'SYNTHETIC_TEAM_A',
        gameDate: '2099-01-01',
        gameTime: '12:00:00',
        stadium: 'Synthetic venue',
        homeTeam: 'Synthetic Team A',
        awayTeam: 'Synthetic Team B',
        section: 'Synthetic section',
        maxParticipants: 3,
        currentParticipants: 1,
        description: 'Synthetic account-switch fixture',
        ticketVerified: false,
        status: 'PENDING',
        ticketPrice: 17000,
      },
    }).as('getAccountSwitchParty');

    cy.visit(`/mate/${partyId}/apply`);
    cy.wait('@getAccountSwitchParty');
    cy.get('textarea#message').type(viewerAMessage);

    cy.window().then(async (win) => {
      const viewerAKey = `mateApplyDraft:${partyId}:viewer:123`;
      expect(win.sessionStorage.getItem(viewerAKey)).to.contain(viewerAMessage);

      const writes: Array<[string, string]> = [];
      const storagePrototype = win.Storage.prototype;
      const originalSetItem = storagePrototype.setItem;
      Object.defineProperty(win, '__mateApplyDraftWrites', {
        configurable: true,
        value: writes,
      });
      storagePrototype.setItem = function setItem(key, value) {
        writes.push([key, value]);
        return originalSetItem.call(this, key, value);
      };

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

    cy.get('textarea#message').should('be.visible').and('have.value', '');
    cy.window().then((win) => {
      const viewerAKey = `mateApplyDraft:${partyId}:viewer:123`;
      const viewerBKey = `mateApplyDraft:${partyId}:viewer:${viewerBId}`;
      const writes = (win as unknown as Window & { __mateApplyDraftWrites: Array<[string, string]> })
        .__mateApplyDraftWrites;

      expect(win.sessionStorage.getItem(viewerAKey)).to.contain(viewerAMessage);
      expect(win.sessionStorage.getItem(viewerBKey)).to.eq(null);
      expect(writes.some(([key, value]) => key === viewerBKey && value.includes(viewerAMessage))).to.eq(false);
      delete (win as unknown as Window & { __mateApplyDraftWrites?: Array<[string, string]> }).__mateApplyDraftWrites;
    });
  });

  it('ignores a delayed successful application response after switching viewers', () => {
    const partyId = 671;
    let applicationRequestStarted = false;
    let releaseApplicationResponse: (() => void) | null = null;

    cy.intercept('GET', `**/api/parties/${partyId}`, {
      statusCode: 200,
      body: {
        id: partyId,
        hostId: 303,
        hostName: 'Synthetic Host',
        hostBadge: 'NEW',
        hostAverageRating: 5,
        hostReviewCount: 1,
        teamId: 'SYNTHETIC_TEAM_A',
        gameDate: '2099-01-01',
        gameTime: '12:00:00',
        stadium: 'Synthetic venue',
        homeTeam: 'Synthetic Team A',
        awayTeam: 'Synthetic Team B',
        section: 'Synthetic section',
        maxParticipants: 3,
        currentParticipants: 1,
        description: 'Synthetic delayed-success fixture',
        ticketVerified: false,
        status: 'PENDING',
        ticketPrice: 100,
      },
    }).as('getDelayedSuccessParty');

    cy.intercept('POST', '**/api/applications', (request) => {
      applicationRequestStarted = true;
      return new Cypress.Promise<void>((resolve) => {
        releaseApplicationResponse = () => {
          request.reply({
            statusCode: 201,
            body: {
              id: 34,
              partyId,
              applicantId: 123,
              applicantName: 'Viewer A',
              applicantBadge: 'NEW',
              applicantRating: 5,
              message: 'VIEWER_A_PENDING_APPLICATION_SENTINEL',
              isPaid: false,
              isApproved: false,
              isRejected: false,
              createdAt: '2026-10-03T00:00:00Z',
            },
          });
          resolve();
        };
      });
    }).as('delayedApplicationSuccess');

    cy.visit(`/mate/${partyId}/apply`);
    cy.wait('@getDelayedSuccessParty');
    cy.get('textarea#message').type('VIEWER_A_PENDING_APPLICATION_SENTINEL');
    cy.contains('button', '참여 신청하기').click();
    cy.wrap(null).should(() => {
      expect(applicationRequestStarted).to.eq(true);
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
        202,
        0,
        'viewer-b',
        undefined,
        true,
      );
    });

    cy.get('textarea#message').should('be.visible').and('have.value', '');
    cy.get('[data-testid="mate-apply-submit-desktop"]')
      .should('contain.text', '참여 신청하기')
      .and('not.contain.text', '신청 중');
    cy.then(() => {
      expect(releaseApplicationResponse).to.be.a('function');
      releaseApplicationResponse?.();
    });
    cy.wait('@delayedApplicationSuccess');

    cy.location('pathname').should('eq', `/mate/${partyId}/apply`);
    cy.get('textarea#message').should('have.value', '');
    cy.get('[data-testid="mate-apply-submit-desktop"]')
      .should('contain.text', '참여 신청하기')
      .and('not.contain.text', '신청 중');
    cy.contains('신청이 접수되었습니다.').should('not.exist');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(`mateApplyDraft:${partyId}:viewer:123`))
        .to.contain('VIEWER_A_PENDING_APPLICATION_SENTINEL');
      expect(win.sessionStorage.getItem(`mateApplyDraft:${partyId}:viewer:202`)).to.eq(null);
    });
  });

  it('ignores a delayed unauthorized application response after switching viewers', () => {
    const partyId = 670;
    let applicationRequestStarted = false;
    let releaseApplicationResponse: (() => void) | null = null;
    let viewerASessionEpoch = 0;

    cy.intercept('GET', `**/api/parties/${partyId}`, {
      statusCode: 200,
      body: {
        id: partyId,
        hostId: 303,
        hostName: 'Synthetic Host',
        hostBadge: 'NEW',
        hostAverageRating: 5,
        hostReviewCount: 1,
        teamId: 'SYNTHETIC_TEAM_A',
        gameDate: '2099-01-01',
        gameTime: '12:00:00',
        stadium: 'Synthetic venue',
        homeTeam: 'Synthetic Team A',
        awayTeam: 'Synthetic Team B',
        section: 'Synthetic section',
        maxParticipants: 3,
        currentParticipants: 1,
        description: 'Synthetic delayed-response fixture',
        ticketVerified: false,
        status: 'PENDING',
        ticketPrice: 100,
      },
    }).as('getDelayedResponseParty');

    cy.intercept('**/auth/reissue*', {
      statusCode: 401,
      body: { success: false, message: 'Synthetic expired session' },
    }).as('staleApplicationReissue');

    cy.intercept('POST', '**/api/applications', (request) => {
      applicationRequestStarted = true;
      return new Cypress.Promise<void>((resolve) => {
        releaseApplicationResponse = () => {
          request.reply({
            statusCode: 401,
            body: { message: 'Synthetic expired request' },
          });
          resolve();
        };
      });
    }).as('delayedApplicationUnauthorized');

    cy.visit(`/mate/${partyId}/apply`);
    cy.wait('@getDelayedResponseParty');
    cy.window().then(async (win) => {
      const generationModule = await win.eval("import('/src/api/authSessionGeneration.ts')") as {
        getAuthSessionEpoch: () => number;
      };
      viewerASessionEpoch = generationModule.getAuthSessionEpoch();
    });
    cy.get('textarea#message').type('VIEWER_A_PENDING_APPLICATION_SENTINEL');
    cy.contains('button', '참여 신청하기').click();
    cy.wrap(null).should(() => {
      expect(applicationRequestStarted).to.eq(true);
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
        202,
        0,
        'viewer-b',
        undefined,
        true,
      );
    });

    cy.location('pathname').should('eq', `/mate/${partyId}/apply`);
    cy.window().then(async (win) => {
      const authModule = await win.eval("import('/src/store/authStore.ts')") as {
        useAuthStore: { getState: () => { user: { id: number } | null } };
      };
      const generationModule = await win.eval("import('/src/api/authSessionGeneration.ts')") as {
        getAuthSessionEpoch: () => number;
      };
      expect(authModule.useAuthStore.getState().user?.id).to.eq(202);
      expect(generationModule.getAuthSessionEpoch()).to.be.greaterThan(viewerASessionEpoch);
    });
    cy.get('[data-testid="mate-apply-submit-desktop"]')
      .should('contain.text', '참여 신청하기')
      .and('not.contain.text', '신청 중');

    cy.then(() => {
      expect(releaseApplicationResponse).to.be.a('function');
      releaseApplicationResponse?.();
    });
    cy.wait('@delayedApplicationUnauthorized');
    cy.location('pathname').should('eq', `/mate/${partyId}/apply`);
    cy.get('[data-testid="mate-apply-submit-desktop"]')
      .should('contain.text', '참여 신청하기')
      .and('not.contain.text', '신청 중');
    cy.window().then(async (win) => {
      const authModule = await win.eval("import('/src/store/authStore.ts')") as {
        useAuthStore: { getState: () => { user: { id: number } | null } };
      };
      expect(authModule.useAuthStore.getState().user?.id).to.eq(202);
    });
    cy.contains('신청 처리 중 오류가 발생했습니다.').should('not.exist');
  });
});
