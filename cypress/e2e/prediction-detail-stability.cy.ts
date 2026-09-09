/// <reference types="cypress" />

describe('Prediction detail stability', () => {
  const fakeToken = 'prediction-detail-stability-token';
  const targetDate = '2026-02-04';
  const targetGameId = '20240510LGLK0';

  const seedAuthState = (win: Window) => {
    win.localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          id: 123,
          email: 'test@example.com',
          name: 'TestUser',
          handle: 'testuser',
          favoriteTeam: 'LG',
          role: 'ROLE_USER',
          hasPassword: true,
          profileImageUrl: null,
        },
        isLoggedIn: true,
        isAdmin: false,
      },
      version: 0,
    }));
    win.localStorage.setItem('accessToken', fakeToken);
    win.localStorage.setItem('bega_has_visited', 'true');
    win.localStorage.setItem('bega_dont_show_guide', 'true');
  };

  beforeEach(() => {
    (cy as any).login('user');
    (cy as any).mockAPI({ skipRankings: true });

    // 응답이 flat 객체가 아니라 { success, data } 엔벨로프여야 한다 — 아니면
    // 인증 파싱이 조용히(콘솔 에러 없이) 실패해 isAuthLoading이 계속 true로
    // 남고, 이후 모든 인증 의존 데이터 fetch(예측 bootstrap 포함)가 아예
    // 시작되지 않는다.
    cy.intercept('GET', '**/api/auth/mypage*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 123,
          email: 'test@example.com',
          name: 'TestUser',
          handle: 'testuser',
          favoriteTeam: 'LG',
          role: 'ROLE_USER',
          profileImageUrl: null,
          hasPassword: true,
        },
      },
    }).as('getMe');

    // 예측 페이지 초기 진입은 /api/matches/day가 아니라 스케줄+상세를 한 번에
    // 묶어 내려주는 /api/predictions/bootstrap을 사용한다. 여기서는 detail을
    // 비워(null) 둬서, 아래 getGameDetailFailure(500)로 목업한 별도 상세
    // 조회로 앱이 폴백하도록 한다.
    cy.intercept('GET', '**/api/predictions/bootstrap*', {
      statusCode: 200,
      body: {
        schedule: {
          date: targetDate,
          games: [
            {
              gameId: targetGameId,
              gameDate: targetDate,
              time: '18:30',
              stadium: '잠실',
              gameStatus: 'SCHEDULED',
              homeTeam: 'LG',
              awayTeam: 'KT',
            },
          ],
          prevDate: null,
          nextDate: null,
          hasPrev: false,
          hasNext: false,
        },
        selectedGameId: targetGameId,
        selectedGameFound: true,
        detail: null,
        voteStatus: null,
      },
    }).as('getScheduleDay');

    cy.intercept('GET', `**/api/matches/${targetGameId}*`, {
      statusCode: 500,
      body: {
        message: 'detail fetch failed',
      },
    }).as('getGameDetailFailure');

    cy.intercept('**/api/predictions/my-votes*', {
      statusCode: 200,
      body: {
        votes: {
          [targetGameId]: null,
        },
      },
    }).as('getUserVotes');

    cy.intercept('GET', '**/api/predictions/my-vote/*', {
      statusCode: 410,
      body: { message: 'legacy endpoint removed' },
    }).as('getUserVote');

    cy.intercept('**/api/predictions/status/*', {
      statusCode: 200,
      body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
    }).as('getVoteStatus');

    cy.intercept('**/api/kbo/rankings/snapshot*', {
      statusCode: 200,
      body: [],
    }).as('getRankings');
  });

  it('keeps the current match card visible and shows the inline error banner when detail fetch fails', () => {
    cy.visit(`/prediction?gameId=${targetGameId}&date=${targetDate}`, {
      onBeforeLoad: seedAuthState,
    });
    cy.window().then((win) => {
      seedAuthState(win);
    });
    cy.setCookie('Authorization', fakeToken);

    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    cy.wait('@getMe');
    cy.wait('@getScheduleDay');
    cy.wait('@getGameDetailFailure');
    cy.wait('@getVoteStatus');
    cy.wait('@getRankings');

    cy.contains(/LG(\s*트윈스)?/).should('be.visible');
    cy.contains(/KT(\s*위즈)?/).should('be.visible');
    cy.get('[data-testid="prediction-detail-error-banner"]').should('be.visible');
    cy.contains('예측으로 돌아가기').should('be.visible');
  });
});
