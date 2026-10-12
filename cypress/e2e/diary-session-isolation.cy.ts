/// <reference types="cypress" />

export {};

describe('Diary viewer-session isolation', () => {
  it('does not show viewer A pending seat data to viewer B before B diary data loads', () => {
    const viewerAId = 123;
    const viewerBId = 202;
    const viewerASection = 'VIEWER_A_PRIVATE_SECTION_SENTINEL';
    let delayViewerBEntries = false;
    let viewerBEntriesRequestStarted = false;
    let releaseViewerBEntries: (() => void) | null = null;

    cy.login('user');
    cy.mockAPI();

    cy.intercept('GET', '**/api/diary/entries*', (request) => {
      if (!delayViewerBEntries) {
        request.reply({ statusCode: 200, body: [] });
        return;
      }

      viewerBEntriesRequestStarted = true;
      return new Cypress.Promise<void>((resolve) => {
        releaseViewerBEntries = () => {
          request.reply({ statusCode: 200, body: [] });
          resolve();
        };
      });
    }).as('getViewerScopedDiaryEntries');

    cy.intercept('GET', '**/api/diary/games*', {
      statusCode: 200,
      body: [{
        id: 990001,
        homeTeam: 'Synthetic Home',
        awayTeam: 'Synthetic Away',
        stadium: 'Synthetic venue',
        date: '2026-03-07',
        score: '0:0',
      }],
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
    cy.intercept('GET', '**/api/kbo/league-start-dates*', {
      statusCode: 200,
      body: {
        regularSeasonStart: '2026-03-01',
        postseasonStart: '2026-10-01',
        koreanSeriesStart: '2026-10-20',
      },
    });

    cy.visit('/mypage?view=diaryEditor&date=2026-03-07');
    cy.contains('직관 기록', { timeout: 20000 }).should('be.visible');
    cy.wait('@getViewerScopedDiaryEntries');

    cy.window().then(async (win) => {
      const diaryModule = await win.eval("import('/src/store/diaryStore.ts')") as {
        useDiaryStore: {
          getState: () => {
            setViewerId: (id: number | null) => void;
            setPendingDraft: (draft: {
              date: string;
              gameId: number;
              stadium: string;
              section: string;
              block: string;
              seatRow: string;
              seatNumber: string;
            }) => void;
          };
          persist: { rehydrate: () => Promise<void> | void };
        };
      };
      await diaryModule.useDiaryStore.persist.rehydrate();
      diaryModule.useDiaryStore.getState().setViewerId(viewerAId);
      diaryModule.useDiaryStore.getState().setPendingDraft({
        date: '2026-03-07',
        gameId: 990001,
        stadium: 'Synthetic venue',
        section: viewerASection,
        block: 'VIEWER_A_PRIVATE_BLOCK_SENTINEL',
        seatRow: 'VIEWER_A_PRIVATE_ROW_SENTINEL',
        seatNumber: 'VIEWER_A_PRIVATE_SEAT_SENTINEL',
      });
      win.sessionStorage.setItem('diary-draft-storage', JSON.stringify({
        state: {
          pendingDraft: {
            date: '2026-03-07',
            section: viewerASection,
          },
        },
        version: 0,
      }));
    });

    cy.get('input[placeholder="구역 (예: 1루 레드석)"]').should('have.value', viewerASection);
    cy.get('input[placeholder="블록 (예: 101블록)"]').should('have.value', 'VIEWER_A_PRIVATE_BLOCK_SENTINEL');

    cy.then(() => {
      delayViewerBEntries = true;
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

    cy.wrap(null).should(() => {
      expect(viewerBEntriesRequestStarted).to.eq(true);
    });
    cy.get('input[placeholder="구역 (예: 1루 레드석)"]').should('have.value', '');
    cy.get('input[placeholder="블록 (예: 101블록)"]').should('have.value', '');
    cy.get('input[placeholder="열 (예: 5열)"]').should('have.value', '');
    cy.get('input[placeholder="번 (예: 13번)"]').should('have.value', '');

    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('diary-draft-storage')).to.eq(null);
      expect(win.sessionStorage.getItem('diary-draft-storage:viewer:202') ?? '').not.to.contain(viewerASection);
    });

    cy.then(() => {
      expect(releaseViewerBEntries).to.be.a('function');
      releaseViewerBEntries?.();
    });
    cy.wait('@getViewerScopedDiaryEntries');
    cy.get('input[placeholder="구역 (예: 1루 레드석)"]').should('have.value', '');
  });
});
