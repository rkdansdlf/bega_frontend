/// <reference types="cypress" />

describe('Theme visual checks for public pages', () => {
  type ThemeMode = 'light' | 'dark';
  type ViewportCase = {
    id: string;
    width: number;
    height: number;
    rootFontSize: number;
  };

  const viewportCases: ViewportCase[] = [
    { id: 'desktop-1280-16px', width: 1280, height: 900, rootFontSize: 16 },
    { id: 'mobile-390-16px', width: 390, height: 844, rootFontSize: 16 },
    { id: 'mobile-390-32px', width: 390, height: 844, rootFontSize: 32 },
    { id: 'mobile-320-16px', width: 320, height: 844, rootFontSize: 16 },
    { id: 'mobile-320-32px', width: 320, height: 844, rootFontSize: 32 },
  ];

  const offseasonMovements = [
    {
      id: 1,
      date: '2026-12-01',
      section: 'FA',
      team: 'HH',
      player: '이정후',
      remarks: 'KBO 리그 이적',
      isBigEvent: true,
      estimatedAmount: 180,
    },
    {
      id: 2,
      date: '2026-12-10',
      section: '트레이드',
      team: 'SS',
      player: '김도영',
      remarks: '시즌 초반 영입 이슈',
      isBigEvent: false,
      estimatedAmount: 90,
    },
  ];

  const offseasonMetadata = {
    awards: [
      {
        award: 'MVP',
        playerName: '김도영',
        team: 'KIA',
        stats: '타율 .347 / 32홈런 / 109타점',
      },
    ],
    postSeasonResults: [],
    finalRankings: [
      {
        rank: 1,
        teamId: 'HH',
        teamName: '한화 이글스',
        wins: 87,
        losses: 55,
        draws: 2,
        winRate: '.613',
      },
      {
        rank: 2,
        teamId: 'SS',
        teamName: '삼성 라이온즈',
        wins: 78,
        losses: 63,
        draws: 3,
        winRate: '.553',
      },
    ],
  };

  const cheerPosts = {
    content: [
      {
        id: 101,
        teamId: 'HH',
        team: '한화',
        postType: 'NORMAL',
        author: '테스트 유저',
        authorHandle: 'testuser',
        authorProfileImageUrl: null,
        content: '직관 메이트 모임 같이 가요',
        createdAt: '2026-03-22T08:00:00.000Z',
        updatedAt: '2026-03-22T08:00:00.000Z',
        likeCount: 3,
        commentCount: 2,
        bookmarkCount: 0,
        repostCount: 0,
        views: 18,
        liked: false,
        bookmarked: false,
        repostedByMe: false,
        isOwner: false,
        isHot: false,
      },
    ],
    last: true,
    totalPages: 1,
    totalElements: 1,
    size: 20,
    number: 0,
  };

  const noticePosts = {
    content: [
      {
        id: 201,
        teamId: 'HH',
        team: '한화',
        postType: 'NOTICE',
        author: '운영자',
        authorHandle: 'admin',
        authorProfileImageUrl: null,
        content: '점검 안내 공지',
        createdAt: '2026-03-20T06:00:00.000Z',
        updatedAt: '2026-03-20T06:00:00.000Z',
        likeCount: 0,
        commentCount: 0,
        bookmarkCount: 0,
        repostCount: 0,
        views: 2,
        liked: false,
        bookmarked: false,
        repostedByMe: false,
        isOwner: false,
        isHot: false,
      },
    ],
    last: true,
    totalPages: 1,
    totalElements: 1,
    size: 20,
    number: 0,
  };

  const leaderboardData = {
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
      },
      {
        rank: 2,
        userName: '야구팬',
        handle: 'fan01',
        profileImageUrl: null,
        level: 7,
        score: 11870,
        streak: 6,
        rankTitle: 'MINOR_LEAGUER',
      },
    ],
    totalPages: 1,
    totalElements: 2,
  };

  const myRank = {
    handle: 'testuser',
    userName: 'TestUser',
    rank: 1,
    totalScore: 12500,
    seasonScore: 12500,
    monthlyScore: 6400,
    weeklyScore: 1600,
    level: 8,
    rankTitle: 'MAJOR_LEAGUER',
    currentStreak: 12,
    maxStreak: 18,
    experiencePoints: 580,
    nextLevelExp: 900,
    accuracy: 88.9,
    totalPredictions: 1410,
    correctPredictions: 1252,
  };

  const hotStreakData = [
    { handle: 'fireone', userName: '파이어원', streak: 7, level: 10 },
    { handle: 'lightning', userName: '라이트닝', streak: 5, level: 9 },
  ];

  const recentScoreData = [
    {
      id: 1,
      handle: 'commentator',
      userName: '해설가',
      eventType: 'UPSET_BONUS',
      score: 150,
      streak: 2,
      timestamp: '2026-03-22T09:00:00.000Z',
    },
  ];

  const stadiums = [
    {
      stadiumId: 'JAMSIL',
      stadiumName: '서울 · 잠실야구장',
      lat: 37.5122,
      lng: 127.072,
      address: '서울 송파구',
      team: 'LG/두산',
      phone: null,
    },
    {
      stadiumId: 'DAEJEON',
      stadiumName: '대전 · 한화생명볼파크',
      lat: 36.318,
      lng: 127.43,
      address: '대전광역시',
      team: 'HH',
      phone: null,
    },
  ];

  const stadiumPlaces = [
    {
      id: 1,
      stadiumName: '잠실야구장',
      category: 'food',
      name: '잠실한식당',
      description: '응원 포인트',
      lat: 37.5124,
      lng: 127.0721,
      address: '서울 송파구',
      phone: null,
      rating: 4.6,
      openTime: null,
      closeTime: null,
    },
  ];

  const predictionDate = '2026-03-22';
  const previousPredictionDate = '2026-03-21';
  const nextPredictionDate = '2026-03-23';
  const predictionGameId = `${predictionDate.replace(/-/g, '')}HHSS0`;
  let unmatchedLocalApiRequests: string[] = [];

  const buildMatchDayResponse = (
    date: string,
    games: Array<Record<string, unknown>>,
    prevDate: string | null,
    nextDate: string | null
  ) => ({
    date,
    games,
    prevDate,
    nextDate,
    hasPrev: Boolean(prevDate),
    hasNext: Boolean(nextDate),
  });

  const seedTheme = (win: Window, theme: ThemeMode) => {
    win.localStorage.setItem('kbo-theme', theme);
    win.localStorage.removeItem('bega-theme');
    win.localStorage.removeItem('theme');
    const nativeMatchMedia = win.matchMedia.bind(win);

    Object.defineProperty(win, 'matchMedia', {
      configurable: true,
      writable: true,
      value: ((query: string) => {
        const nativeMediaQuery = nativeMatchMedia(query);
        return {
          matches: query === '(prefers-color-scheme: dark)'
            ? theme === 'dark'
            : nativeMediaQuery.matches,
          media: query,
          onchange: null,
          addListener: nativeMediaQuery.addListener.bind(nativeMediaQuery),
          removeListener: nativeMediaQuery.removeListener.bind(nativeMediaQuery),
          addEventListener: nativeMediaQuery.addEventListener.bind(nativeMediaQuery),
          removeEventListener: nativeMediaQuery.removeEventListener.bind(nativeMediaQuery),
          dispatchEvent: nativeMediaQuery.dispatchEvent.bind(nativeMediaQuery),
        };
      }) as typeof win.matchMedia,
    });
  };

  const visitWithTheme = (path: string, theme: ThemeMode, rootFontSize: number) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        seedTheme(win, theme);
        win.document.documentElement.style.fontSize = `${rootFontSize}px`;
      },
    });

    cy.window().then((win) => {
      seedTheme(win, theme);
      const root = win.document.documentElement;
      root.style.fontSize = `${rootFontSize}px`;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    });
  };

  const setupCommonMocks = () => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', {
      forceNetworkError: true,
    }).as('getKakao');

    cy.intercept('GET', '**/api/cheer/posts/hot*', {
      statusCode: 200,
      body: cheerPosts,
    }).as('getCheerHotPosts');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard' }, {
      statusCode: 200,
      body: leaderboardData,
    }).as('getHomeWeeklyLeaderboard');

    cy.intercept('GET', '**/parties*', {
      statusCode: 200,
      body: [],
    }).as('getParties');
  };

  const setupCheerMocks = () => {
    cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, (req) => {
      const isNotice = req.url.includes('postType=NOTICE');
      req.reply({
        statusCode: 200,
        body: isNotice ? noticePosts : cheerPosts,
      });
    }).as('getCheerPosts');

    cy.intercept('GET', '**/api/cheer/posts/changes*', {
      statusCode: 200,
      body: {
        newCount: 0,
        latestId: null,
      },
    }).as('getCheerChanges');
  };

  const setupOffseasonMocks = () => {
    cy.intercept('GET', '**/kbo/offseason/movements*', {
      statusCode: 200,
      body: offseasonMovements,
    }).as('getOffseasonMovements');

    cy.intercept('GET', '**/kbo/offseason/metadata*', {
      statusCode: 200,
      body: offseasonMetadata,
    }).as('getOffseasonMetadata');

    cy.intercept('GET', '**/kbo/rankings/2025*', {
      statusCode: 200,
      body: offseasonMetadata.finalRankings,
    }).as('getOffseasonRankings');
  };

  const setupLeaderboardMocks = () => {
    cy.intercept({ method: 'GET', pathname: '/api/leaderboard' }, {
      statusCode: 200,
      body: leaderboardData,
    }).as('getLeaderboard');

    cy.intercept('GET', '**/api/matches/day*', (req) => {
      const date = new URL(req.url).searchParams.get('date') || predictionDate;
      req.reply({
        statusCode: 200,
        body: buildMatchDayResponse(date, [], null, null),
      });
    }).as('getLeaderboardMatchDay');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
      statusCode: 200,
      body: myRank,
    }).as('getMyRank');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/hot-streaks' }, {
      statusCode: 200,
      body: hotStreakData,
    }).as('getHotStreaks');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/recent-scores' }, {
      statusCode: 200,
      body: recentScoreData,
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
          gameId: `${predictionDate.replace(/-/g, '')}HHSS0`,
          expiresAt: '2026-12-31T23:59:59.000Z',
        },
      ],
    }).as('getActivePowerups');
  };

  const setupStadiumMocks = () => {
    cy.intercept('GET', '**/api/stadiums', {
      statusCode: 200,
      body: stadiums,
    }).as('getStadiums');

    cy.intercept('GET', '**/api/stadiums/*/places*', {
      statusCode: 200,
      body: stadiumPlaces,
    }).as('getStadiumPlaces');
  };

  const setupPredictionMocks = () => {
    cy.intercept('GET', '**/api/matches/bounds*', {
      statusCode: 200,
      body: {
        hasData: true,
        earliestGameDate: previousPredictionDate,
        latestGameDate: nextPredictionDate,
      },
    }).as('getMatchBounds');

    cy.intercept('GET', '**/api/matches/day*', (req) => {
      const date = new URL(req.url).searchParams.get('date') || '';

      if (date === predictionDate) {
        req.reply({
          statusCode: 200,
          body: buildMatchDayResponse(predictionDate, [
            {
              gameId: predictionGameId,
              gameDate: predictionDate,
              homeTeam: 'HH',
              awayTeam: 'SS',
              stadium: '대전',
              homeScore: null,
              awayScore: null,
              winner: null,
            },
          ], previousPredictionDate, nextPredictionDate),
        });
        return;
      }

      if (date === previousPredictionDate) {
        req.reply({
          statusCode: 200,
          body: buildMatchDayResponse(previousPredictionDate, [], null, predictionDate),
        });
        return;
      }

      if (date === nextPredictionDate) {
        req.reply({
          statusCode: 200,
          body: buildMatchDayResponse(nextPredictionDate, [], predictionDate, null),
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: buildMatchDayResponse(date, [], null, null),
      });
    }).as('getMatchDay');

    cy.intercept('GET', '**/api/matches/range*', {
      statusCode: 200,
      body: {
        content: [],
        page: 0,
        size: 150,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    }).as('getMatchRange');

    cy.intercept('**/api/predictions/my-votes*', {
      statusCode: 200,
      body: {
        votes: {
          [predictionGameId]: null,
        },
      },
    }).as('getUserVotes');

    cy.intercept('GET', '**/api/predictions/my-vote/*', {
      statusCode: 410,
      body: { message: 'legacy endpoint removed' },
    }).as('getUserVotePredictionTheme');

    cy.intercept('GET', '**/api/predictions/status/*', {
      statusCode: 200,
      body: {
        homeVotes: 0,
        awayVotes: 0,
        totalVotes: 0,
      },
    }).as('getVoteStatus');

    cy.intercept('GET', '**/api/matches/*', (req) => {
      if (
        req.url.includes('/api/matches/day') ||
        req.url.includes('/api/matches/range') ||
        req.url.includes('/api/matches/bounds')
      ) {
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          gameId: predictionGameId,
          gameDate: predictionDate,
          homeTeam: 'HH',
          awayTeam: 'SS',
          stadium: '대전',
          gameStatus: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
          winner: null,
        },
      });
    }).as('getMatchDetail');
  };

  const captureThemeCases = (
    label: string,
    path: string,
    setup: () => void,
    assert: () => void
  ) => {
    viewportCases.forEach((viewport) => {
      (['light', 'dark'] as const).forEach((mode) => {
        it(`${label} - ${viewport.id} - ${mode}`, () => {
          cy.viewport(viewport.width, viewport.height);
          setup();
          visitWithTheme(path, mode, viewport.rootFontSize);
          assert();
          cy.get('[data-testid="navbar-capsule"]', { timeout: 20000 })
            .should('be.visible');
          cy.get('[data-testid="site-footer"]', { timeout: 20000 }).should('exist');
          cy.document().should((document) => {
            expect(document.documentElement.scrollWidth, 'document horizontal overflow')
              .to.be.at.most(viewport.width);
            expect(document.body.scrollWidth, 'body horizontal overflow')
              .to.be.at.most(viewport.width);
          });
          cy.window().then((win) => {
            win.document.documentElement.style.scrollBehavior = 'auto';
            win.document.body.style.scrollBehavior = 'auto';
            win.scrollTo(0, 0);
          });
          cy.window().should((win) => expect(win.scrollY).to.eq(0));
          if (label === 'home' && viewport.rootFontSize === 32) {
            cy.get('[data-testid="home-date-prev"]').parent().find('h2').then(($heading) => {
              const heading = $heading[0] as HTMLElement;
              const document = heading.ownerDocument;
              const dock = document.querySelector<HTMLElement>('[data-testid="public-mobile-bottom-nav"]');

              expect(dock, 'Home fixed public dock').not.to.equal(null);
              if (!dock) return;

              expect(
                heading.getBoundingClientRect().bottom,
                `Home date-card heading remains above the fixed dock at ${viewport.width}px / 32px`,
              ).to.be.at.most(dock.getBoundingClientRect().top - 8);
            });
            cy.contains('button', '날짜 변경').then(($dateChange) => {
              const dateChange = $dateChange[0] as HTMLElement;
              const document = dateChange.ownerDocument;
              const dock = document.querySelector<HTMLElement>('[data-testid="public-mobile-bottom-nav"]');

              expect(dock, 'Home fixed public dock').not.to.equal(null);
              if (!dock) return;

              expect(
                dateChange.getBoundingClientRect().bottom,
                `Home date-change control remains above the fixed dock at ${viewport.width}px / 32px`,
              ).to.be.at.most(dock.getBoundingClientRect().top - 8);
            });
          }
          cy.screenshot(`theme-page-visual-${label}-${viewport.id}-${mode}-top`, { capture: 'viewport' });
          cy.window().then((win) => {
            const documentHeight = Math.max(
              win.document.documentElement.scrollHeight,
              win.document.body.scrollHeight,
            );
            win.scrollTo(0, documentHeight);
          });
          cy.window().should((win) => {
            const documentHeight = Math.max(
              win.document.documentElement.scrollHeight,
              win.document.body.scrollHeight,
            );
            expect(win.scrollY + win.innerHeight)
              .to.be.at.least(documentHeight - 2);
          });
          cy.document().should((document) => {
            expect(document.documentElement.scrollWidth, 'document horizontal overflow at page end')
              .to.be.at.most(viewport.width);
            expect(document.body.scrollWidth, 'body horizontal overflow at page end')
              .to.be.at.most(viewport.width);
          });
          cy.screenshot(`theme-page-visual-${label}-${viewport.id}-${mode}-bottom`, { capture: 'viewport' });
          cy.then(() => {
            expect(
              unmatchedLocalApiRequests,
              `${label} must not fall through to the local API proxy without a synthetic fixture`,
            ).to.deep.equal([]);
          });
        });
      });
    });
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    const configuredBaseUrl = Cypress.config('baseUrl');
    if (typeof configuredBaseUrl !== 'string') {
      throw new Error('A loopback baseUrl is required for this synthetic visual spec.');
    }
    const localUrl = new URL(configuredBaseUrl);
    if (!['localhost', '127.0.0.1'].includes(localUrl.hostname)) {
      throw new Error('A loopback baseUrl is required for this synthetic visual spec.');
    }
    const localOrigin = localUrl.origin;
    unmatchedLocalApiRequests = [];
    cy.intercept({ url: /^https?:\/\// }, (request) => {
      if (new URL(request.url).origin !== localOrigin) request.destroy();
    });
    cy.intercept({ method: 'GET', url: `${localOrigin}/api/**` }, (request) => {
      unmatchedLocalApiRequests.push(`${request.method} ${new URL(request.url).pathname}`);
      request.reply({
        statusCode: 599,
        body: { message: 'Missing synthetic API fixture in theme visual test.' },
      });
    });
    cy.mockAPI();
    setupCommonMocks();
  });

  captureThemeCases('home', '/home', () => {}, () => {
    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets', { timeout: 15000 });
    cy.contains('KBO LEAGUE', { timeout: 20000 }).should('be.visible');
    cy.contains('경기가 없는 날입니다.', { timeout: 20000 }).should('be.visible');
    cy.get('[data-testid="home-game-card"]').should('not.exist');
  });

  captureThemeCases('offseason', '/offseason', () => {
    setupOffseasonMocks();
  }, () => {
    cy.wait('@getOffseasonMovements');
    cy.wait('@getOffseasonMetadata');
    cy.wait('@getOffseasonRankings');
    cy.contains(/스토브리그 하이라이트|2025 주요 이적 소식|2026 시즌 개막까지/, { timeout: 20000 }).should('be.visible');
    cy.contains('KBO').should('be.visible');
  });

  captureThemeCases('offseason-list', '/offseason/list', () => {
    setupOffseasonMocks();
  }, () => {
    cy.wait('@getOffseasonMovements');
    cy.contains('이적').should('be.visible');
    cy.contains('이정후').should('be.visible');
  });

  captureThemeCases('cheer', '/cheer', () => {
    setupCheerMocks();
  }, () => {
    cy.wait('@getCheerPosts');
    cy.contains('전체').should('be.visible');
    cy.contains('직관 메이트 모임 같이 가요').should('be.visible');
  });

  captureThemeCases('notice', '/notice', () => {
    setupCheerMocks();
  }, () => {
    cy.wait('@getCheerPosts');
    cy.contains('공지사항').should('be.visible');
    cy.contains('점검 안내 공지').should('be.visible');
  });

  captureThemeCases('terms', '/terms', () => {}, () => {
    cy.contains('이용약관').should('be.visible');
  });

  captureThemeCases('privacy', '/privacy', () => {}, () => {
    cy.contains('개인정보처리방침').should('be.visible');
  });

  captureThemeCases('leaderboard', '/leaderboard', () => {
    setupLeaderboardMocks();
  }, () => {
    cy.wait('@getLeaderboard');
    cy.contains('야구경기 예측 결과').should('be.visible');
    cy.contains('적중률').should('be.visible');
  });

  captureThemeCases('stadium', '/stadium', () => {
    setupStadiumMocks();
  }, () => {
    cy.wait('@getStadiums');
    cy.wait('@getStadiumPlaces');
    cy.contains('구장 가이드', { timeout: 20000 }).should('be.visible');
    cy.contains('서울 · 잠실야구장', { timeout: 20000 }).should('be.visible');
    cy.contains('잠실한식당', { timeout: 20000 }).should('exist');
  });

  captureThemeCases('prediction', '/prediction', () => {
    setupPredictionMocks();
    cy.clock(new Date('2026-03-22T12:00:00.000Z').getTime(), ['Date']);
  }, () => {
    cy.wait('@getMatchDay');
    cy.contains('h2', '전력분석실', { timeout: 20000 }).should('be.visible');
    cy.contains('h2', '전력분석실').should(($heading) => {
      const heading = $heading[0] as HTMLElement;
      const rootFontSize = Number.parseFloat(
        heading.ownerDocument.defaultView?.getComputedStyle(heading.ownerDocument.documentElement).fontSize ?? '16px',
      );

      if (rootFontSize >= 32) {
        expect(heading.scrollWidth, 'prediction title has no clipped horizontal text')
          .to.be.at.most(heading.clientWidth + 1);
        expect(heading.scrollHeight, 'prediction title has no clipped vertical text')
          .to.be.at.most(heading.clientHeight + 1);
      }
    });
    cy.get('[data-testid="prediction-schedule-match-row"]', { timeout: 20000 })
      .should('have.length', 1)
      .and('be.visible');
    cy.get('@getUserVotes.all').should('have.length', 0);
    cy.get('@getUserVotePredictionTheme.all').should('have.length', 0);
  });
});
