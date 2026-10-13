/// <reference types="cypress" />

const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 900 },
] as const;

const longSyntheticRooms = Array.from({ length: 8 }, (_, index) => ({
    roomId: 901 + index,
    targetUser: {
        id: 456 + index,
        name: index === 0 ? '가나다라마바사아자차카타파하 친구와 야구 이야기' : `응원 친구 ${index + 1}`,
        handle: index === 0 ? '@야구장친구의긴계정이름확인용' : `@friend${index + 1}`,
        favoriteTeam: 'LG',
        profileImageUrl: null,
    },
    lastMessage: {
        content: index === 0
            ? '가나다라마바사아자차카타파하가연속으로이어지는합성미리보기메시지입니다'
            : `합성 메시지 ${index + 1}`,
        createdAt: '2026-10-08T16:00:00+09:00',
        senderId: 456 + index,
    },
    hasUnread: index === 0,
}));

const assertNoHorizontalOverflow = () => {
    cy.document().should((document) => {
        const viewportWidth = document.documentElement.clientWidth;
        expect(document.documentElement.scrollWidth).to.be.at.most(viewportWidth);
        expect(document.body.scrollWidth).to.be.at.most(viewportWidth);
    });
};

describe('DM inbox responsive visual acceptance', () => {
    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();
    });

    it('captures the empty state at mobile and desktop viewports', () => {
        cy.intercept('GET', '**/api/dm/rooms/my', {
            statusCode: 200,
            body: { success: true, data: [] },
        }).as('getDmInbox');

        for (const viewport of viewports) {
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/messages');
            cy.wait('@getDmInbox');
            cy.get('[data-testid="dm-inbox-runtime"]').should('be.visible');
            cy.get('[data-testid="dm-inbox-title"]').should('be.visible');
            cy.contains('아직 대화가 없습니다').should('be.visible');
            assertNoHorizontalOverflow();
            cy.screenshot(`dm-inbox-empty-${viewport.name}`, { capture: 'viewport' });
        }
    });

    it('captures a populated inbox with long Korean text at mobile and desktop viewports', () => {
        cy.intercept('GET', '**/api/dm/rooms/my', {
            statusCode: 200,
            body: { success: true, data: longSyntheticRooms },
        }).as('getDmInbox');

        for (const viewport of viewports) {
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/messages');
            cy.wait('@getDmInbox');
            cy.get('[data-testid="dm-inbox-list"]').should('be.visible');
            cy.get('[data-testid="dm-inbox-room-row"]').should('have.length', longSyntheticRooms.length);
            cy.contains('친구와 야구 이야기').should('be.visible');
            assertNoHorizontalOverflow();
            cy.screenshot(`dm-inbox-populated-${viewport.name}`, { capture: 'viewport' });
        }
    });
});

export {};
