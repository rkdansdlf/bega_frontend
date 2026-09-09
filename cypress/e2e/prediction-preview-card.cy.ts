/// <reference types="cypress" />

import { installPredictionAuthenticatedSessionIntercept, visitPredictionPage } from '../support/predictionPage';

type PreviewPitcher = {
    name: string;
    era?: string | null;
    win?: number | null;
    loss?: number | null;
};

type PreviewGame = {
    gameId: string;
    gameDate: string;
    awayTeam: string;
    homeTeam: string;
    stadium: string;
    startTime: string;
    gameStatus: string;
    awayScore: number | null;
    homeScore: number | null;
    winner: string | null;
    awayPitcher?: PreviewPitcher | null;
    homePitcher?: PreviewPitcher | null;
    aiSummary?: string | null;
};

describe('Prediction preview schedule', () => {
    const targetDate = '2099-05-01';
    const secondGameId = '20990501LGKT0';
    const baseGames: PreviewGame[] = [
        {
            gameId: '20990501KIANC0',
            gameDate: targetDate,
            awayTeam: 'KIA',
            homeTeam: 'NC',
            stadium: '창원',
            startTime: '18:30:00',
            gameStatus: 'SCHEDULED',
            awayScore: null,
            homeScore: null,
            winner: null,
            awayPitcher: {
                name: '이의리',
            },
            homePitcher: {
                name: '구창모',
            },
        },
        {
            gameId: secondGameId,
            gameDate: targetDate,
            awayTeam: 'LG',
            homeTeam: 'KT',
            stadium: '수원',
            startTime: '18:30:00',
            gameStatus: 'SCHEDULED',
            awayScore: null,
            homeScore: null,
            winner: null,
            awayPitcher: {
                name: '이정용',
            },
            homePitcher: {
                name: '소형준',
            },
        },
    ];

    const buildDayResponse = (
        games: PreviewGame[],
        options: { prevDate?: string | null; nextDate?: string | null } = {},
        date = targetDate,
    ) => ({
        date,
        games,
        prevDate: options.prevDate ?? null,
        nextDate: options.nextDate ?? null,
        hasPrev: Boolean(options.prevDate),
        hasNext: Boolean(options.nextDate),
    });

    const interceptPreviewApis = (
        games: PreviewGame[] = baseGames,
        options: { prevDate?: string | null; nextDate?: string | null } = {},
        gamesByDate?: Record<string, PreviewGame[]>,
    ) => {
        const dayGamesByDate = gamesByDate ?? { [targetDate]: games };
        const allGames = Object.values(dayGamesByDate).flat();

        cy.mockAPI({ skipRankings: true });
        installPredictionAuthenticatedSessionIntercept('getPredictionPreviewSession');

        cy.intercept('GET', '**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [],
        }).as('getRankingsPreview');

        cy.intercept('GET', '**/api/matches/bounds*', {
            statusCode: 200,
            body: {
                hasData: true,
                earliestGameDate: '2099-04-30',
                latestGameDate: targetDate,
            },
        }).as('getMatchBoundsPreview');

        cy.intercept('GET', '**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getPredictionStatusPreview');

        cy.intercept('GET', /\/api\/matches\/(?!day|range|bounds)[^/?#]+(?:\?.*)?$/, (req) => {
            const gameId = req.url.split('/').pop()?.split('?')[0] || '';
            const game = allGames.find((candidate) => candidate.gameId === gameId) || allGames[0];
            if (!game) {
                req.reply({
                    statusCode: 404,
                    body: { message: 'Not found' },
                });
                return;
            }
            req.reply({
                statusCode: 200,
                body: {
                    ...game,
                    homePitcher: game?.homePitcher?.name ?? null,
                    awayPitcher: game?.awayPitcher?.name ?? null,
                    inningScores: [],
                    summary: [],
                },
            });
        }).as('getGameDetailPreview');

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const requestedUrl = new URL(req.url);
            const requestedDate = requestedUrl.searchParams.get('date') || targetDate;
            req.reply({
                statusCode: 200,
                body: buildDayResponse(dayGamesByDate[requestedDate] ?? [], options, requestedDate),
            });
        }).as('getMatchDayPreview');
    };

    const openPreview = () => {
        visitPredictionPage({
            path: `/prediction?date=${targetDate}`,
            token: 'prediction-preview-card-token',
            resetStorage: true,
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getMatchDayPreview');
    };

    beforeEach(() => {
        cy.visit('about:blank');
    });

    [
        { label: 'mobile-360', width: 360, height: 740, isCompact: true },
        { label: 'mobile-390', width: 390, height: 844, isCompact: true },
        { label: 'mobile-430', width: 430, height: 932, isCompact: true },
        { label: 'tablet-640', width: 640, height: 900, isCompact: true },
        { label: 'tablet-768', width: 768, height: 900, isCompact: true },
        { label: 'tablet-940', width: 940, height: 900, isCompact: true },
        { label: 'desktop-1024', width: 1024, height: 768, isCompact: false },
        { label: 'desktop-1280', width: 1280, height: 720, isCompact: false },
    ].forEach(({ label, width, height, isCompact }) => {
        it(`shows the date rail and KBO schedule rows at ${label} viewport`, () => {
            cy.viewport(width, height);
            interceptPreviewApis();
            openPreview();

            // The date rail toolbar is md:block-only (>=768px); below that the
            // page shows a compact mobile toolbar (today button + date-sheet
            // trigger) instead — both are valid ways to reach the same date nav.
            if (width >= 768) {
                cy.get('[data-testid="prediction-schedule-date-rail"]').should('be.visible');
                cy.get('[data-testid="prediction-schedule-date-rail-fade"]').should('exist');
                cy.get('[data-testid="prediction-schedule-month-title"]').should('contain', '2099.05');
            } else {
                cy.get('[data-testid="prediction-schedule-mobile-today-btn"]').should('be.visible');
                cy.get('[data-testid="prediction-schedule-mobile-date-trigger"]').should('be.visible');
            }
            cy.get('[data-testid="prediction-match-preview-root"]').should('be.visible').within(() => {
                cy.contains('KBO리그').should('be.visible');
                cy.get('[data-testid="prediction-schedule-match-row"]').should('have.length', 2);
                cy.get('[data-game-id="20990501KIANC0"]').should('contain', 'KIA').and('contain', '예정').and('contain', 'NC');
                cy.get(`[data-game-id="${secondGameId}"]`).should('contain', 'LG').and('contain', '예정').and('contain', 'KT');
                cy.get('[data-testid="prediction-match-enter-detail-btn"]').should('have.length', 2);
            });

            cy.get('[data-game-id="20990501KIANC0"] [data-testid="prediction-match-enter-detail-btn"]')
                .then(($button) => {
                    cy.get('[data-testid="prediction-match-preview-root"]').then(($card) => {
                        const buttonRect = $button[0].getBoundingClientRect();
                        const cardRect = $card[0].getBoundingClientRect();
                        expect(buttonRect.left).to.be.greaterThan(cardRect.left - 1);
                        expect(buttonRect.right).to.be.lessThan(cardRect.right + 1);
                    });
                });

            if (!isCompact) {
                cy.get('[data-game-id="20990501KIANC0"]').then(($row) => {
                    cy.get('[data-game-id="20990501KIANC0"] [data-testid="prediction-schedule-matchup"]').then(($matchup) => {
                        const rowRect = $row[0].getBoundingClientRect();
                        const matchupRect = $matchup[0].getBoundingClientRect();
                        const rowCenter = rowRect.left + rowRect.width / 2;
                        const matchupCenter = matchupRect.left + matchupRect.width / 2;
                        // lg: 그리드는 시간/구장 칼럼(고정폭)과 버튼 칼럼(11rem)의 폭이
                        // 다르고, 구장 칼럼도 minmax(8rem,10rem)라 뷰포트가 넓어질수록
                        // matchup 트랙 중심이 행 중심에서 더 벌어진다(1024px≈24px,
                        // 1280px≈40px) — 완벽한 중앙 정렬은 의도된 설계가 아니다.
                        expect(Math.abs(matchupCenter - rowCenter)).to.be.lessThan(50);
                    });
                });
            }

            if (isCompact) {
                cy.get('[data-testid="prediction-schedule-match-list"]').then(($list) => {
                    expect($list[0].scrollWidth).to.be.lessThan($list[0].clientWidth + 2);
                });

                cy.get('[data-game-id="20990501KIANC0"]').within(() => {
                    cy.get('img[alt*="로고"]').should('have.length.at.least', 2);
                    cy.get('img[alt*="로고"]').first().should('be.visible');
                    cy.get('[data-testid="prediction-match-enter-detail-btn"]').should('be.visible');
                });
            }

            cy.get('[data-testid="prediction-match-preview-root"]').should('not.contain', '응원');
            cy.contains('경기 상세 보기').should('not.exist');
            cy.get('@getGameDetailPreview.all').should('have.length', 0);
        });
    });

    it('loads new preview dates from the date rail and native date input', () => {
        const railDate = '2099-05-02';
        const nativeInputDate = '2099-05-03';
        const railDateGame: PreviewGame = {
            ...baseGames[0],
            gameId: '20990502KIANC0',
            gameDate: railDate,
            stadium: '광주',
        };
        const nativeDateGame: PreviewGame = {
            ...baseGames[1],
            gameId: '20990503LGKT0',
            gameDate: nativeInputDate,
            stadium: '잠실',
        };

        cy.viewport(1280, 720);
        interceptPreviewApis(baseGames, {}, {
            [targetDate]: baseGames,
            [railDate]: [railDateGame],
            [nativeInputDate]: [nativeDateGame],
        });
        openPreview();

        cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${railDate}"]`).click();
        cy.wait('@getMatchDayPreview').its('request.url').should('include', `date=${railDate}`);
        cy.get(`[data-game-id="${railDateGame.gameId}"]`).should('contain', '광주');

        cy.get('[data-testid="prediction-schedule-date-input"]')
            .clear({ force: true })
            .type(nativeInputDate, { force: true });
        cy.wait('@getMatchDayPreview').its('request.url').should('include', `date=${nativeInputDate}`);
        cy.get(`[data-game-id="${nativeDateGame.gameId}"]`).should('contain', '잠실');
    });

    it('opens the selected game detail only after clicking its power-analysis button', () => {
        cy.viewport(1280, 720);
        interceptPreviewApis();
        openPreview();
        cy.get('@getGameDetailPreview.all').should('have.length', 0);

        cy.get(`[data-game-id="${secondGameId}"] [data-testid="prediction-match-enter-detail-btn"]`)
            .scrollIntoView()
            .click();

        cy.location('pathname', { timeout: 20000 }).should('eq', `/prediction/matches/${secondGameId}`);
        cy.location('search').should('include', `date=${targetDate}`);
        cy.wait('@getGameDetailPreview');
    });

    it('returns to the prediction schedule preview after browser back from an internally opened detail', () => {
        cy.viewport(1280, 720);
        interceptPreviewApis();
        openPreview();

        cy.location('pathname').should('eq', '/prediction');
        cy.location('search').should('include', `date=${targetDate}`);
        cy.location('search').should('not.include', 'gameId=');

        cy.get(`[data-game-id="${secondGameId}"] [data-testid="prediction-match-enter-detail-btn"]`)
            .scrollIntoView()
            .click();

        cy.location('pathname', { timeout: 20000 }).should('eq', `/prediction/matches/${secondGameId}`);
        cy.get('[data-testid="prediction-match-detail-root"]', { timeout: 20000 }).should('be.visible');
        cy.wait('@getGameDetailPreview');

        cy.go('back');

        cy.location('pathname').should('eq', '/prediction');
        cy.location('search').should('include', `date=${targetDate}`);
        cy.location('search').should('not.include', 'gameId=');
        cy.get('[data-testid="prediction-schedule-preview"]').should('be.visible');
        cy.get('[data-testid="prediction-match-detail-root"]').should('not.exist');
    });

    it('keeps the selected preview date when returning from an internally opened detail', () => {
        const selectedDate = '2099-05-02';
        const selectedDateGame: PreviewGame = {
            ...baseGames[0],
            gameId: '20990502KIANC0',
            gameDate: selectedDate,
            stadium: '광주',
        };

        cy.viewport(1280, 720);
        interceptPreviewApis(baseGames, {}, {
            [targetDate]: baseGames,
            [selectedDate]: [selectedDateGame],
        });
        openPreview();

        cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${selectedDate}"]`).click();
        cy.wait('@getMatchDayPreview').its('request.url').should('include', `date=${selectedDate}`);
        cy.location('pathname').should('eq', '/prediction');
        cy.location('search').should('include', `date=${selectedDate}`);
        cy.location('search').should('not.include', 'gameId=');
        cy.get(`[data-game-id="${selectedDateGame.gameId}"]`).should('contain', '광주');

        cy.get(`[data-game-id="${selectedDateGame.gameId}"] [data-testid="prediction-match-enter-detail-btn"]`)
            .scrollIntoView()
            .click();

        cy.location('pathname', { timeout: 20000 }).should('eq', `/prediction/matches/${selectedDateGame.gameId}`);
        cy.location('search').should('include', `date=${selectedDate}`);
        cy.get('[data-testid="prediction-match-detail-root"]', { timeout: 20000 }).should('be.visible');
        cy.wait('@getGameDetailPreview');

        cy.go('back');

        cy.location('pathname').should('eq', '/prediction');
        cy.location('search').should('include', `date=${selectedDate}`);
        cy.location('search').should('not.include', 'gameId=');
        cy.get('[data-testid="prediction-schedule-preview"]').should('be.visible');
        cy.get(`[data-game-id="${selectedDateGame.gameId}"]`).should('contain', '광주');
        cy.get('[data-testid="prediction-match-detail-root"]').should('not.exist');
    });

    it('hides the power-analysis button for postponed and cancelled games', () => {
        cy.viewport(390, 844);
        interceptPreviewApis([
            {
                ...baseGames[0],
                gameId: '20990501KIANC1',
                gameStatus: 'POSTPONED',
            },
            {
                ...baseGames[1],
                gameId: '20990501LGKT1',
                gameStatus: 'CANCELLED',
            },
        ]);
        openPreview();

        cy.get('[data-testid="prediction-schedule-match-row"]').should('have.length', 2);
        cy.contains('연기').should('exist');
        cy.contains('취소').should('exist');
        cy.get('[data-testid="prediction-match-enter-detail-btn"]').should('not.exist');
        cy.get('@getGameDetailPreview.all').should('have.length', 0);
    });

    it('keeps the empty schedule state and nearest-date action for no-game dates', () => {
        cy.viewport(390, 844);
        interceptPreviewApis([], { prevDate: '2099-04-30' });
        openPreview();

        cy.get('[data-testid="prediction-schedule-mobile-date-trigger"]').should('be.visible');
        cy.contains('예정된 경기 일정이 없습니다').should('be.visible');
        cy.get('[data-testid="prediction-empty-nearest-date-btn"]').should('be.visible');
        cy.get('@getGameDetailPreview.all').should('have.length', 0);
    });
});
