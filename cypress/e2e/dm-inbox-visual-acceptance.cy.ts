/// <reference types="cypress" />

const viewports = [
    { name: 'mobile-320-large', width: 320, height: 844, rootTextSize: 32, mobile: true },
    { name: 'mobile-390-large', width: 390, height: 844, rootTextSize: 32, mobile: true },
    { name: 'desktop-1280-normal', width: 1280, height: 900, rootTextSize: 16, mobile: false },
    { name: 'desktop-1280-large', width: 1280, height: 900, rootTextSize: 32, mobile: false },
] as const;

const themes = ['light', 'dark'] as const;

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
        const viewportWidth = document.defaultView!.innerWidth;
        expect(document.documentElement.scrollWidth).to.be.at.most(viewportWidth);
        expect(document.body.scrollWidth).to.be.at.most(viewportWidth);
    });
};

const assertEmptyCopyReachableAboveMobileDock = (viewportName: string) => {
    cy.get('[data-testid="dm-inbox-runtime"] p')
        .last()
        .scrollIntoView()
        .should(($copy) => {
            const copy = $copy[0];
            const document = copy.ownerDocument;
            const header = document.querySelector('header.sticky');
            const dock = document.querySelector('[data-testid="auth-mobile-bottom-nav"]');
            expect(header, 'sticky header exists').not.to.equal(null);
            expect(dock, 'mobile navigation exists').not.to.equal(null);

            const range = document.createRange();
            range.selectNodeContents(copy);
            const lines = range.getClientRects();
            expect(lines.length, 'empty-state guidance has rendered lines').to.be.greaterThan(0);
            const lastLine = lines.item(lines.length - 1)!;
            expect(lastLine.top, 'empty-state guidance clears sticky header')
                .to.be.at.least(header!.getBoundingClientRect().bottom + 8);
            expect(lastLine.bottom, 'empty-state guidance clears mobile dock')
                .to.be.at.most(dock!.getBoundingClientRect().top - 8);
        });
    cy.screenshot(`dm-inbox-empty-copy-above-dock-${viewportName}`, { capture: 'viewport' });
};

const assertLastRoomReachableAboveMobileDock = (viewportName: string) => {
    cy.get('[data-testid="dm-inbox-room-row"]').last().scrollIntoView().should(($row) => {
        const row = $row[0];
        const document = row.ownerDocument;
        const header = document.querySelector('header.sticky');
        const dock = document.querySelector('[data-testid="auth-mobile-bottom-nav"]');
        expect(header, 'sticky header exists').not.to.equal(null);
        expect(dock, 'mobile navigation exists').not.to.equal(null);
        const rowRect = row.getBoundingClientRect();
        expect(rowRect.top, 'last room clears sticky header')
            .to.be.at.least(header!.getBoundingClientRect().bottom + 8);
        expect(rowRect.bottom, 'last room clears mobile dock')
            .to.be.at.most(dock!.getBoundingClientRect().top - 8);
        const hit = document.elementFromPoint(
            rowRect.left + rowRect.width / 2,
            rowRect.top + rowRect.height / 2,
        );
        expect(hit === row || row.contains(hit), 'last room center hit-tests to its button').to.equal(true);
    });
    cy.screenshot(`dm-inbox-last-room-above-dock-${viewportName}`, { capture: 'viewport' });
};

const captureFirstRoomAboveMobileDock = (viewportName: string) => {
    cy.get('[data-testid="dm-inbox-room-row"]').first().scrollIntoView().should(($row) => {
        const row = $row[0];
        const document = row.ownerDocument;
        const header = document.querySelector('header.sticky');
        const dock = document.querySelector('[data-testid="auth-mobile-bottom-nav"]');
        expect(header, 'sticky header exists').not.to.equal(null);
        expect(dock, 'mobile navigation exists').not.to.equal(null);
        const rowRect = row.getBoundingClientRect();
        expect(rowRect.top, 'first room clears sticky header')
            .to.be.at.least(header!.getBoundingClientRect().bottom + 8);
        expect(rowRect.bottom, 'first room clears mobile dock')
            .to.be.at.most(dock!.getBoundingClientRect().top - 8);
    });
    cy.screenshot(`dm-inbox-first-room-visible-${viewportName}`, { capture: 'viewport' });
};

const assertRoomPreviewTextHasLayout = () => {
    cy.get('[data-testid="dm-inbox-room-row"]').first().then(($row) => {
        const textColumn = $row[0].children.item(1);
        const recipientName = textColumn?.querySelector('span');
        const messagePreview = textColumn?.querySelector('p');
        expect(recipientName, 'recipient name element exists').not.to.equal(null);
        expect(messagePreview, 'message preview element exists').not.to.equal(null);

        const nameRect = recipientName!.getBoundingClientRect();
        const previewRect = messagePreview!.getBoundingClientRect();
        const textColumnWidth = (textColumn as HTMLElement).getBoundingClientRect().width;
        expect(
            nameRect.width,
            `recipient name retains visible width (name=${nameRect.width}px, column=${textColumnWidth}px, viewport=${$row[0].ownerDocument.defaultView!.innerWidth}px)`,
        ).to.be.greaterThan(0);
        expect(nameRect.height, 'recipient name retains visible height').to.be.greaterThan(0);
        expect(previewRect.width, 'message preview retains visible width').to.be.greaterThan(0);
        expect(previewRect.height, 'message preview retains visible height').to.be.greaterThan(0);
    });
};

describe('DM inbox responsive visual acceptance', () => {
    beforeEach(() => {
        cy.intercept('https://**', { forceNetworkError: true });
        cy.login('user');
        cy.mockAPI();
    });

    viewports.forEach((viewport) => {
        themes.forEach((theme) => {
            it(`captures the empty state at ${viewport.name} in ${theme}`, () => {
                cy.intercept('GET', '**/api/dm/rooms/my', {
                    statusCode: 200,
                    body: { success: true, data: [] },
                }).as('getDmInbox');
                cy.viewport(viewport.width, viewport.height);
                cy.visit('/messages', {
                    onBeforeLoad(win) {
                        win.localStorage.setItem('kbo-theme', theme);
                        win.localStorage.removeItem('bega-theme');
                        win.localStorage.removeItem('theme');
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${viewport.rootTextSize}px`;
                    },
                });
                cy.wait('@getDmInbox');
                cy.get('[data-testid="dm-inbox-runtime"]').should('be.visible');
                cy.get('[data-testid="dm-inbox-title"]').should('be.visible');
                cy.contains('아직 대화가 없습니다').should('be.visible');
                cy.document().should((document) => {
                    expect(document.documentElement.classList.contains('dark'))
                        .to.equal(theme === 'dark');
                    expect(document.documentElement.style.fontSize)
                        .to.equal(`${viewport.rootTextSize}px`);
                });
                if (viewport.mobile) {
                    cy.get('[data-testid="auth-mobile-bottom-nav"]').should('be.visible');
                    assertEmptyCopyReachableAboveMobileDock(`${viewport.name}-${theme}`);
                }
                assertNoHorizontalOverflow();
                cy.screenshot(`dm-inbox-empty-${viewport.name}-${theme}`, { capture: 'viewport' });
            });

            it(`captures a populated inbox at ${viewport.name} in ${theme}`, () => {
                cy.intercept('GET', '**/api/dm/rooms/my', {
                    statusCode: 200,
                    body: { success: true, data: longSyntheticRooms },
                }).as('getDmInbox');
                cy.viewport(viewport.width, viewport.height);
                cy.visit('/messages', {
                    onBeforeLoad(win) {
                        win.localStorage.setItem('kbo-theme', theme);
                        win.localStorage.removeItem('bega-theme');
                        win.localStorage.removeItem('theme');
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${viewport.rootTextSize}px`;
                    },
                });
                cy.wait('@getDmInbox');
                cy.get('[data-testid="dm-inbox-list"]').should('be.visible');
                cy.get('[data-testid="dm-inbox-room-row"]').should('have.length', longSyntheticRooms.length);
                cy.contains('친구와 야구 이야기').should('be.visible');
                cy.document().should((document) => {
                    expect(document.documentElement.classList.contains('dark'))
                        .to.equal(theme === 'dark');
                    expect(document.documentElement.style.fontSize)
                        .to.equal(`${viewport.rootTextSize}px`);
                });
                if (viewport.mobile) {
                    cy.get('[data-testid="auth-mobile-bottom-nav"]').should('be.visible');
                    captureFirstRoomAboveMobileDock(`${viewport.name}-${theme}`);
                    assertLastRoomReachableAboveMobileDock(`${viewport.name}-${theme}`);
                    assertRoomPreviewTextHasLayout();
                }
                assertNoHorizontalOverflow();
                cy.screenshot(`dm-inbox-populated-${viewport.name}-${theme}`, { capture: 'viewport' });
            });
        });
    });
});

export {};
