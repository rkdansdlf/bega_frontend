/// <reference types="cypress" />

describe('Leaderboard page', () => {
  const leaderboardResponse = {
    content: [
      {
        rank: 1,
        userName: '한화스타',
        handle: 'testuser',
        profileImageUrl: null,
        level: 8,
        score: 12500,
        streak: 12,
        rankTitle: 'MAJOR_LEAGUER',
        rankChange: 3,
      },
      {
        rank: 2,
        userName: '부산불',
        handle: 'busanbull',
        profileImageUrl: null,
        level: 7,
        score: 11230,
        streak: 4,
        rankTitle: 'MINOR_LEAGUER',
        rankChange: -1,
      },
      {
        rank: 3,
        userName: '서울불매',
        handle: 'seoul',
        profileImageUrl: null,
        level: 5,
        score: 10880,
        streak: 2,
        rankTitle: 'ROOKIE',
      },
    ],
    totalPages: 2,
    totalElements: 3,
  };

  const myRankResponse = {
    handle: 'testuser',
    userName: 'TestUser',
    rank: 1,
    totalScore: 12500,
    seasonScore: 12500,
    monthlyScore: 6400,
    weeklyScore: 1800,
    level: 8,
    rankTitle: 'MAJOR_LEAGUER',
    currentStreak: 12,
    maxStreak: 18,
    experiencePoints: 640,
    nextLevelExp: 900,
    accuracy: 88.8,
    totalPredictions: 1400,
    correctPredictions: 1242,
  };

  const hotStreakResponse = [
    {
      handle: 'fireone',
      userName: '파이어원',
      streak: 7,
      level: 10,
    },
    {
      handle: 'lightning',
      userName: '라이트닝',
      streak: 5,
      level: 9,
    },
  ];

  const recentScoreResponse = [
    {
      id: 1,
      handle: 'commentator',
      userName: '해설자',
      eventType: 'UPSET_BONUS',
      score: 150,
      streak: 2,
      timestamp: '2026-02-07T12:00:00.000Z',
    },
  ];

  beforeEach(() => {
    (cy as any).mockAPI();

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard' }, {
      statusCode: 200,
      body: leaderboardResponse,
    }).as('getLeaderboard');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/hot-streaks' }, {
      statusCode: 200,
      body: hotStreakResponse,
    }).as('getHotStreaks');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/recent-scores' }, {
      statusCode: 200,
      body: recentScoreResponse,
    }).as('getRecentScores');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/powerups' }, {
      statusCode: 200,
      body: {
        MAGIC_BAT: 3,
        GOLDEN_GLOVE: 1,
        SCOUTER: 2,
      },
    }).as('getPowerups');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/powerups/active' }, {
      statusCode: 200,
      body: [
        {
          type: 'SCOUTER',
          gameId: '20260207HHLG0',
          expiresAt: '2026-12-31T23:59:59.000Z',
        },
      ],
    }).as('getActivePowerups');

    cy.intercept({ method: 'GET', pathname: '/api/matches/day' }, (request) => {
      request.reply({
        statusCode: 200,
        body: {
          date: request.query.date,
          games: [{
            gameId: 'fixture-game-42',
            gameDate: request.query.date,
            homeTeam: '합성 홈팀',
            awayTeam: '합성 원정팀',
            stadium: '합성 구장',
            startTime: '18:30',
            gameStatus: 'SCHEDULED',
          }, {
            gameId: 'completed-fixture-game',
            gameDate: request.query.date,
            homeTeam: '완료 홈팀',
            awayTeam: '완료 원정팀',
            stadium: '합성 구장',
            gameStatus: 'COMPLETED',
          }],
          prevDate: null,
          nextDate: null,
          hasPrev: false,
          hasNext: false,
        },
      });
    }).as('getPowerupGameSchedule');
  });

  it('renders leaderboard list, user stats card, ticker and powerups for logged-in users', () => {
    (cy as any).login('user');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
      statusCode: 200,
      body: myRankResponse,
    }).as('getMyRank');

    cy.visit('/leaderboard');

    cy.wait('@getLeaderboard');
    cy.wait('@getMyRank');
    cy.wait('@getHotStreaks');
    cy.wait('@getRecentScores');
    cy.wait('@getPowerups');
    cy.wait('@getActivePowerups');

    cy.contains('야구경기 예측 결과').should('be.visible');
    cy.contains('적중률').should('be.visible');
    cy.contains('88.8%').should('be.visible');
    cy.contains('12연승').should('be.visible');
    cy.contains(/1,?400회/).should('be.visible');
    cy.contains(/1,?242회/).should('be.visible');
    cy.contains('한화스타').should('be.visible');
    cy.contains('부산불').should('be.visible');
    cy.scrollTo('bottom');
    cy.contains('POWER-UPS', { timeout: 10000 }).should('be.visible');
    cy.contains('매직 배트').should('be.visible');
    cy.contains('x3').should('be.visible');
    cy.contains('연승 중인 플레이어').should('be.visible');
    cy.contains('파이어원').should('be.visible');
  });

  it('keeps the guest leaderboard stable even if my-rank returns 401', () => {
    cy.visit('about:blank');
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
      statusCode: 401,
      body: { message: 'UNAUTHORIZED' },
    }).as('getMyRank');

    cy.intercept({ method: 'GET', pathname: '/auth/mypage' }, {
      statusCode: 401,
      body: { message: 'UNAUTHORIZED' },
    }).as('getMe');

    cy.visit('/leaderboard', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
        win.localStorage.removeItem('auth-storage');
        win.localStorage.removeItem('auth-bootstrap-hint');
      },
    });

    cy.wait('@getLeaderboard');
    cy.wait('@getHotStreaks');
    cy.wait('@getRecentScores');
    cy.wait('@getPowerups');
    cy.wait('@getActivePowerups');
    cy.get('@getMyRank.all').should('have.length.gte', 1);
    cy.contains('야구경기 예측 결과').should('be.visible');
    cy.get('body').should('not.contain.text', 'UNAUTHORIZED');
  });

  it('requires selecting a game from the internal schedule and sends its ID when using a powerup', () => {
    (cy as any).login('user');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
      statusCode: 200,
      body: myRankResponse,
    });
    cy.intercept({ method: 'POST', pathname: '/api/leaderboard/powerups/MAGIC_BAT/use' }, {
      statusCode: 200,
      body: { success: true, message: '사용 완료', remainingCount: 2 },
    }).as('useMagicBat');

    cy.visit('/leaderboard');
    cy.scrollTo('bottom');
    cy.contains('POWER-UPS', { timeout: 10000 }).should('be.visible');
    cy.wait('@getPowerupGameSchedule');
    cy.get('[data-testid="retro-powerup-game-select"]')
      .should('have.value', '')
      .and('contain', '합성 원정팀 vs 합성 홈팀')
      .and('not.contain', '완료 원정팀 vs 완료 홈팀')
      .select('fixture-game-42');
    cy.get('[data-testid="retro-powerup-card-scouter"]').should('not.be.disabled');
    cy.get('[data-testid="retro-powerup-card-magic_bat"]').should('not.be.disabled').click();
    cy.get('[data-testid="retro-powerup-modal-use"]').click();

    cy.wait('@useMagicBat')
      .its('request.body')
      .should('deep.equal', { gameId: 'fixture-game-42' });
  });

  it('surfaces MANUAL_BASEBALL_DATA_REQUIRED without enabling powerup use when internal schedule data is missing', () => {
    (cy as any).login('user');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
      statusCode: 200,
      body: myRankResponse,
    });
    cy.intercept({ method: 'GET', pathname: '/api/matches/day' }, {
      statusCode: 503,
      body: {
        code: 'MANUAL_BASEBALL_DATA_REQUIRED',
        message: '운영자 제공 경기 일정 데이터가 필요합니다.',
      },
    }).as('missingInternalSchedule');
    cy.intercept({ method: 'POST', pathname: '/api/leaderboard/powerups/MAGIC_BAT/use' })
      .as('unexpectedPowerupUse');

    cy.visit('/leaderboard');
    cy.scrollTo('bottom');
    cy.contains('POWER-UPS', { timeout: 10000 }).should('be.visible');
    cy.wait('@missingInternalSchedule');
    cy.contains('[role="alert"]', 'MANUAL_BASEBALL_DATA_REQUIRED').should('be.visible');
    cy.get('[data-testid="retro-powerup-card-magic_bat"]').should('be.disabled');
    cy.get('@unexpectedPowerupUse.all').should('have.length', 0);
  });
});
