/// <reference types="cypress" />

describe('Offseason Mode', () => {
    const mockMovements = [
        {
            id: 1,
            date: '2024-12-01',
            section: 'FA',
            team: 'KIA',
            player: '이정후',
            remarks: 'KIA 타이거즈와 200억 계약',
            isBigEvent: true,
            estimatedAmount: 200,
        },
        {
            id: 2,
            date: '2024-11-15',
            section: 'FA',
            team: 'SSG',
            player: '김광현',
            remarks: 'SSG와 50억 계약',
            isBigEvent: false,
            estimatedAmount: 50,
        },
    ];

    const mockMetadata = {
        awards: [
            { award: 'MVP', playerName: '김도영', team: 'KIA', stats: '타율 .347 / 32홈런 / 109타점' },
        ],
        postSeasonResults: [],
        finalRankings: [
            { rank: 1, teamId: 'KIA', teamName: 'KIA 타이거즈', wins: 87, losses: 55, draws: 2, winRate: '.613', games: 144 },
            { rank: 2, teamId: 'SS', teamName: '삼성 라이온즈', wins: 78, losses: 63, draws: 3, winRate: '.553', games: 144 },
        ],
    };

    describe('OffSeasonHome Page (/offseason)', () => {
        beforeEach(() => {
            cy.intercept('GET', '**/kbo/offseason/movements*', {
                statusCode: 200,
                body: mockMovements,
            }).as('getMovements');

            cy.intercept('GET', '**/kbo/offseason/metadata*', {
                statusCode: 200,
                body: mockMetadata,
            }).as('getMetadata');

            cy.intercept('GET', '**/kbo/rankings/snapshot*', {
                statusCode: 200,
                body: {
                    rankingSeasonYear: 2025,
                    rankingSourceMessage: '2025 시즌 순위 데이터',
                    isOffSeason: false,
                    rankings: mockMetadata.finalRankings,
                },
            }).as('getRankings');

            cy.visit('/offseason');
        });

        it('displays offseason page with countdown', () => {
            cy.wait('@getMovements');
            cy.wait('@getMetadata');

            cy.contains(/D-\d+|개막|시즌/i).should('be.visible');
        });

        it('shows stove league movements section', () => {
            cy.wait('@getMovements');
            cy.wait('@getMetadata');

            cy.contains(/스토브리그|이적/i).should('be.visible');
        });

        it('displays award results', () => {
            cy.wait('@getMetadata');
            cy.contains('MVP').should('be.visible');
            cy.contains('김도영').should('be.visible');
        });

        it('shows Korean Series result', () => {
            cy.wait('@getMetadata');
            cy.contains(/한국시리즈/i).should('be.visible');
            cy.contains('KIA 타이거즈').should('be.visible');
        });

        it('has a link to full transfers list', () => {
            cy.wait('@getMovements');
            cy.contains(/전체 이적|이적 현황/i).should('be.visible');
        });
    });

    describe('OffSeasonList Page (/offseason/list)', () => {
        beforeEach(() => {
            cy.intercept('GET', '**/kbo/offseason/movements*', {
                statusCode: 200,
                body: mockMovements,
            }).as('getMovements');

            cy.visit('/offseason/list');
            cy.wait('@getMovements');
        });

        it('displays the full transfers list', () => {
            cy.contains('이정후').should('be.visible');
            cy.contains('김광현').should('be.visible');
        });

        it('filters results by search input', () => {
            cy.get('input[type="text"], input[placeholder*="검색"]')
                .first()
                .type('이정후');

            cy.contains('이정후').should('be.visible');
            cy.contains('김광현').should('not.exist');
        });

        it('sorts by latest date by default', () => {
            cy.contains(/최신순|날짜순/i).should('be.visible');
        });

        it('shows contract amounts', () => {
            cy.contains(/200|억/i).should('be.visible');
        });

        it('shows a sanitized error state when movements fetch fails', () => {
            cy.intercept('GET', '**/kbo/offseason/movements*', {
                statusCode: 500,
                body: { message: 'Internal Server Error' },
            }).as('getMovementsError');

            cy.visit('/offseason/list');
            cy.wait('@getMovementsError');

            cy.contains('이적 현황을 가져오지 못했습니다.').should('be.visible');
            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            cy.contains(/Internal Server Error|Request failed with status code 500/).should('not.exist');
            cy.contains('button', '다시 시도').should('be.visible');
        });
    });
});

describe('OffSeasonHome manual baseball data state', () => {
    it('preserves the requested metadata year and does not show unverified season results', () => {
        cy.intercept('GET', '**/kbo/offseason/movements*', {
            statusCode: 200,
            body: [],
        }).as('getMovements');

        cy.intercept('GET', '**/kbo/offseason/metadata*', (request) => {
            expect(new URL(request.url).searchParams.get('year')).to.equal('2025');
            request.reply({
                statusCode: 409,
                body: {
                    success: false,
                    code: 'MANUAL_BASEBALL_DATA_REQUIRED',
                    message: '야구 데이터 준비가 필요합니다. 운영자가 데이터를 제공하면 다시 확인할 수 있습니다.',
                    data: {
                        scope: 'kbo.offseason.metadata',
                        missingItems: [],
                        operatorMessage: '요청 시즌의 검증된 내부 자료가 필요합니다.',
                        blocking: true,
                    },
                },
            });
        }).as('getMetadataRequiresManualData');

        cy.intercept('GET', '**/kbo/rankings/2025', {
            statusCode: 200,
            body: { rankingSeasonYear: 2025, rankingSourceMessage: '', isOffSeason: true, rankings: [] },
        }).as('getRankings');

        cy.visit('/offseason');
        cy.wait('@getMovements');
        cy.wait('@getMetadataRequiresManualData');
        cy.wait('@getRankings');

        cy.get('[data-testid="offseason-manual-data-required"]').should('be.visible');
        cy.contains('요청한 시즌 결과는 아직 준비되지 않았습니다.').should('be.visible');
        cy.contains('운영자가 검증된 내부 자료를 제공하면 다시 표시됩니다.').should('be.visible');
        cy.contains(/시상식 결과|2025 포스트시즌 결과|최종 순위|V3/).should('not.exist');
    });
});
