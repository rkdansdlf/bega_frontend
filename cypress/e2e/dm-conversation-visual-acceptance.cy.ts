/// <reference types="cypress" />

const viewports = [
    { name: 'mobile-320', width: 320, height: 844 },
    { name: 'mobile-320-short', width: 320, height: 568 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-landscape-640', width: 640, height: 360 },
    { name: 'desktop', width: 1280, height: 900 },
] as const;

const bootstrapResponse = {
    roomId: 901,
    membershipState: 'ACTIVE',
    targetUser: {
        id: 456,
        name: '응원 친구 긴 이름 화면 확인용',
        handle: '@long_korean_fan_handle',
        favoriteTeam: 'LG',
        profileImageUrl: null,
    },
};

const longMessages = [
    {
        id: 1001,
        roomId: 901,
        senderId: 456,
        content: '가나다라마바사아자차카타파하가 이어지는 긴 합성 DM입니다. 좁은 화면에서 문장이 카드와 메시지 영역 안에서 줄바꿈되는지 확인합니다.',
        clientMessageId: null,
        createdAt: '2026-10-08T08:00:00.000Z',
    },
    {
        id: 1002,
        roomId: 901,
        senderId: 123,
        content: '확인했습니다! 경기장에서 만나요.\n긴 메시지와 줄바꿈이 가로 화면을 밀어내지 않아야 합니다.',
        clientMessageId: null,
        createdAt: '2026-10-08T08:01:00.000Z',
    },
];

const installDmSocketFactory = (win: Window) => {
    (win as Window & {
        __begaDmSocketFactory?: unknown;
        __begaDmSocketConnected?: boolean;
    }).__begaDmSocketFactory = ({ onConnect }: { onConnect: () => void }) => {
        (win as Window & { __begaDmSocketConnected?: boolean }).__begaDmSocketConnected = true;
        onConnect();
        return () => {
            (win as Window & { __begaDmSocketConnected?: boolean }).__begaDmSocketConnected = false;
        };
    };
};

const assertNoHorizontalOverflow = () => {
    cy.document().should((document) => {
        const viewportWidth = document.documentElement.clientWidth;
        expect(document.documentElement.scrollWidth).to.be.at.most(viewportWidth);
        expect(document.body.scrollWidth).to.be.at.most(viewportWidth);
    });
};

const findVisibleExactTextElement = (document: Document, text: string): HTMLElement | null => (
    Array.from(document.querySelectorAll<HTMLElement>('body *')).find((element) => {
        if (element.textContent?.trim() !== text) {
            return false;
        }
        const hasMatchingChild = Array.from(element.children).some(
            (child) => child.textContent?.trim() === text,
        );
        const rect = element.getBoundingClientRect();
        return !hasMatchingChild && rect.width > 0 && rect.height > 0;
    }) ?? null
);

const assertRecipientHeaderReadable = (viewportWidth: number) => {
    cy.contains(bootstrapResponse.targetUser.name).should('be.visible');
    if (viewportWidth <= 390) {
        cy.contains('실시간 연결됨').should('be.visible');
    }
    cy.document().then((document) => {
        const name = findVisibleExactTextElement(document, bootstrapResponse.targetUser.name);
        if (!name) {
            throw new Error('recipient name should be present');
        }
        const nameRect = name.getBoundingClientRect();

        expect(nameRect.left).to.be.at.least(0);
        expect(nameRect.right).to.be.at.most(viewportWidth);
        expect(name.scrollWidth).to.be.at.most(name.clientWidth);

        if (viewportWidth <= 390) {
            const status = findVisibleExactTextElement(document, '실시간 연결됨');
            if (!status) {
                throw new Error('connection status should be present');
            }
            const statusRect = status.getBoundingClientRect();
            expect(statusRect.top).to.be.at.least(nameRect.bottom);
            expect(statusRect.height).to.be.at.most(40);
        }
    });
};

const assertMessageViewportHasMinimumHeight = (viewportWidth: number) => {
    if (viewportWidth >= 768) {
        return;
    }
    cy.get('[data-testid="dm-message-viewport"]').should(($viewport) => {
        const rect = $viewport[0].getBoundingClientRect();
        expect(rect.height, 'mobile conversation viewport should retain a usable minimum height').to.be.at.least(224);
    });
};

const assertComposerHintDoesNotOverlapSendButton = () => {
    cy.contains('p', 'Enter로 전송, Shift+Enter로 줄바꿈').should('be.visible').then(($hint) => {
        const hintRect = $hint[0].getBoundingClientRect();
        expect(hintRect.width, 'composer keyboard hint should have width').to.be.greaterThan(0);
        expect(hintRect.height, 'composer keyboard hint should have height').to.be.greaterThan(0);

        cy.contains('button', '메시지 보내기').should('be.visible').then(($button) => {
            const buttonRect = $button[0].getBoundingClientRect();
            expect(buttonRect.width, 'send button should have width').to.be.greaterThan(0);
            expect(buttonRect.height, 'send button should have height').to.be.greaterThan(0);
            const overlaps = hintRect.left < buttonRect.right
                && hintRect.right > buttonRect.left
                && hintRect.top < buttonRect.bottom
                && hintRect.bottom > buttonRect.top;

            expect(overlaps, 'composer keyboard hint should not overlap its send button').to.equal(false);
        });
    });
};

const assertFooterReachableAboveMobileDock = (viewportName: string) => {
    cy.get('[data-testid="site-footer-email"]', { timeout: 6000 }).should('be.visible');
    cy.scrollTo('bottom', { duration: 0 });
    cy.get('[data-testid="auth-mobile-bottom-nav"]').should('be.visible');
    cy.window().then((win) => {
        const dock = win.document.querySelector('[data-testid="auth-mobile-bottom-nav"]');
        const emailLink = win.document.querySelector('[data-testid="site-footer-email"]');

        expect(dock).not.to.equal(null);
        expect(emailLink).not.to.equal(null);
        const dockRect = dock!.getBoundingClientRect();
        const emailRect = emailLink!.getBoundingClientRect();
        expect(emailRect.top).to.be.at.least(0);
        expect(emailRect.bottom).to.be.at.most(dockRect.top);
        expect(emailRect.width, 'footer email should have visible width').to.be.greaterThan(0);
        expect(emailRect.height, 'footer email should have visible height').to.be.greaterThan(0);
    });
    cy.screenshot(`dm-conversation-footer-end-${viewportName}`, { capture: 'viewport' });

    cy.get('[data-testid="site-footer-home"]').then(($homeLink) => {
        const homeLink = $homeLink[0];
        const header = homeLink.ownerDocument.querySelector('header.sticky');
        expect(header, 'sticky site header should exist').not.to.equal(null);
        homeLink.scrollIntoView({ block: 'start', behavior: 'instant' });
        const headerHeight = header!.getBoundingClientRect().height;
        homeLink.ownerDocument.defaultView!.scrollBy(0, -headerHeight - 12);
    });
    cy.window().then((win) => {
        const header = win.document.querySelector('header.sticky');
        const dock = win.document.querySelector('[data-testid="auth-mobile-bottom-nav"]');
        const homeLink = win.document.querySelector('[data-testid="site-footer-home"]');

        expect(header).not.to.equal(null);
        expect(dock).not.to.equal(null);
        expect(homeLink).not.to.equal(null);
        const headerRect = header!.getBoundingClientRect();
        const dockRect = dock!.getBoundingClientRect();
        const homeRect = homeLink!.getBoundingClientRect();
        expect(homeRect.top).to.be.at.least(headerRect.bottom);
        expect(homeRect.bottom).to.be.at.most(dockRect.top);
        expect(homeRect.width, 'home link should have visible width').to.be.greaterThan(0);
        expect(homeRect.height, 'home link should have visible height').to.be.greaterThan(0);
        const hit = win.document.elementFromPoint(
            homeRect.left + homeRect.width / 2,
            homeRect.top + homeRect.height / 2,
        );
        expect(hit === homeLink || homeLink!.contains(hit), 'home link should not be occluded by page chrome').to.equal(true);
    });
    cy.screenshot(`dm-conversation-footer-links-${viewportName}`, { capture: 'viewport' });
};

const assertComposerReachable = () => {
    cy.get('textarea[placeholder="메시지를 입력하세요"]')
        .scrollIntoView({ duration: 0 })
        .should('be.visible')
        .type('전송 버튼 hit-test 확인');
    cy.contains('button', '메시지 보내기').should('be.visible').and('be.enabled').then(($button) => {
        const button = $button[0];
        const rect = button.getBoundingClientRect();
        const hit = button.ownerDocument.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
        );
        const hitDescription = hit
            ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ''}${typeof hit.className === 'string' && hit.className ? `.${hit.className.trim().replace(/\s+/g, '.')}` : ''}`
            : 'null';
        expect(
            hit === button || button.contains(hit),
            `send-button center hit test at (${rect.left + rect.width / 2}, ${rect.top + rect.height / 2}); viewport=${button.ownerDocument.documentElement.clientWidth}x${button.ownerDocument.documentElement.clientHeight}; top=${hitDescription}`,
        ).to.equal(true);
    });
};

describe('DM conversation responsive visual acceptance', () => {
    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();
    });

    it('renders the empty conversation and keeps its composer reachable on narrow, mobile, and desktop viewports', () => {
        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 200,
            body: { success: true, data: bootstrapResponse },
        }).as('bootstrapDmRoom');
        cy.intercept('GET', '**/api/dm/rooms/901/messages', {
            statusCode: 200,
            body: { success: true, data: [] },
        }).as('getDmMessages');

        for (const viewport of viewports) {
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/messages/long_korean_fan_handle', {
                onBeforeLoad: installDmSocketFactory,
            });
            cy.wait('@bootstrapDmRoom');
            cy.wait('@getDmMessages');
            cy.contains('응원 친구 긴 이름 화면 확인용').should('be.visible');
            cy.contains('첫 메시지를 보내보세요.').should('be.visible');
            assertRecipientHeaderReadable(viewport.width);
            assertMessageViewportHasMinimumHeight(viewport.width);
            assertNoHorizontalOverflow();
            cy.screenshot(`dm-conversation-empty-top-${viewport.name}`, { capture: 'viewport' });
            assertComposerReachable();
            assertComposerHintDoesNotOverlapSendButton();
            cy.screenshot(`dm-conversation-empty-composer-${viewport.name}`, { capture: 'viewport' });
            if (viewport.width <= 390) {
                assertFooterReachableAboveMobileDock(viewport.name);
            }
        }
    });

    it('contains long populated messages and the composer within narrow, mobile, and desktop layouts', () => {
        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 200,
            body: { success: true, data: bootstrapResponse },
        }).as('bootstrapDmRoom');
        cy.intercept('GET', '**/api/dm/rooms/901/messages', {
            statusCode: 200,
            body: { success: true, data: longMessages },
        }).as('getDmMessages');

        for (const viewport of viewports) {
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/messages/long_korean_fan_handle', {
                onBeforeLoad: installDmSocketFactory,
            });
            cy.wait('@bootstrapDmRoom');
            cy.wait('@getDmMessages');
            cy.contains('긴 합성 DM입니다').should('be.visible');
            cy.contains('확인했습니다! 경기장에서 만나요.').should('be.visible');
            assertNoHorizontalOverflow();
            assertMessageViewportHasMinimumHeight(viewport.width);
            if (viewport.width < 768) {
                cy.get('button[aria-label="메시지 삭제"]').should('be.visible');
            } else {
                cy.get('button[aria-label="메시지 삭제"]').first().focus().should('be.visible');
            }
            cy.screenshot(`dm-conversation-populated-top-${viewport.name}`, { capture: 'viewport' });
            assertComposerReachable();
            cy.screenshot(`dm-conversation-populated-composer-${viewport.name}`, { capture: 'viewport' });
        }
    });

    it('renders the access-denied recovery state at mobile and desktop widths', () => {
        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 403,
            body: {
                success: false,
                code: 'DM_FOLLOW_REQUIRED',
                message: '팔로우한 사용자에게만 메시지를 보낼 수 있습니다.',
            },
        }).as('bootstrapDmRoomForbidden');

        for (const viewport of [viewports[2], viewports[4]]) {
            cy.viewport(viewport.width, viewport.height);
            cy.visit('/messages/long_korean_fan_handle', {
                onBeforeLoad: installDmSocketFactory,
            });
            cy.wait('@bootstrapDmRoomForbidden');
            cy.contains('메시지 대화방에 접근할 수 없습니다.').should('be.visible');
            cy.contains('팔로우한 사용자에게만 메시지를 보낼 수 있습니다.').should('be.visible');
            cy.contains('button', '프로필로 돌아가기').should('be.visible');
            assertNoHorizontalOverflow();
            cy.screenshot(`dm-conversation-access-denied-${viewport.name}`, { capture: 'viewport' });
        }
    });
});

export {};
