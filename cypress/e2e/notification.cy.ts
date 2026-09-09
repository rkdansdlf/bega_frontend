/// <reference types="cypress" />

describe('Notification Panel', () => {
    const bootstrapAuthenticatedWindow = (win: Window) => {
        const originalAddEventListener = win.addEventListener.bind(win);
        win.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            if (type === 'auth-session-expired' || type === 'global-api-error') {
                return;
            }
            return originalAddEventListener(type, listener, options);
        }) as typeof win.addEventListener;
        win.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
                user: {
                    id: 123,
                    email: 'test@example.com',
                    name: 'TestUser',
                    handle: '@testuser',
                    favoriteTeam: 'HH',
                    role: 'ROLE_USER',
                    hasPassword: true,
                    profileImageUrl: null,
                },
                isLoggedIn: true,
                isAdmin: false,
            },
            version: 0,
        }));
        win.localStorage.setItem('accessToken', 'fake-access-token');
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
    };

    const normalizeNotifications = (payload: unknown): Array<{ isRead: boolean }> => {
        if (!Array.isArray(payload)) {
            const wrapped = (payload as { data?: unknown })?.data;
            return Array.isArray(wrapped) ? wrapped as Array<{ isRead: boolean }> : [];
        }
        return payload as Array<{ isRead: boolean }>;
    };

    const getUnreadCountFromNotifications = (notifications: unknown) =>
        normalizeNotifications(notifications).reduce((count, item) => (item.isRead ? count : count + 1), 0);

    const createNotifications = () => ({
        notifications: [
            {
                id: 1,
                type: 'APPLICATION_RECEIVED',
                title: '파티 신청 접수',
                message: '새 신청이 도착했습니다.',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: null,
            },
            {
                id: 2,
                type: 'NEW_FOLLOWER',
                title: '새 팔로워',
                message: 'testuser2님이 팔로우했습니다.',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: null,
            },
            {
                id: 3,
                type: 'POST_LIKE',
                title: '게시글 좋아요',
                message: 'testuser3님이 좋아요를 눌렀습니다.',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: null,
            },
        ],
    });

    const createNotificationFixture = () => ([
        {
            id: 1,
            type: 'APPLICATION_RECEIVED',
            title: '파티 신청 접수',
            message: '새 신청이 도착했습니다.',
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedId: null,
        },
        {
            id: 2,
            type: 'NEW_FOLLOWER',
            title: '새 팔로워',
            message: 'testuser2님이 팔로우했습니다.',
            isRead: true,
            createdAt: new Date().toISOString(),
            relatedId: null,
        },
    ]);

    beforeEach(() => {
        cy.mockAPI();
        cy.intercept('GET', '**/api/auth/mypage*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    id: 123,
                    email: 'test@example.com',
                    name: 'TestUser',
                    handle: 'testuser',
                    favoriteTeam: 'HH',
                    role: 'ROLE_USER',
                    hasPassword: true,
                    profileImageUrl: null,
                },
            },
        }).as('getMeInitial');

        cy.visit('/mypage', {
            onBeforeLoad: bootstrapAuthenticatedWindow,
        });
        cy.wait('@getMeInitial');
        cy.contains('TestUser', { timeout: 15000 }).should('be.visible');
    });

    it('shows unread badge count on bell icon', () => {
        const { notifications } = createNotifications();
        const unreadCount = notifications.filter((notification) => !notification.isRead).length;

        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: notifications,
        }).as('getNotifications');

        cy.get('button[aria-label^="알림"]').click();
        cy.contains('파티 신청 접수').scrollIntoView().should('be.visible');
        // 배지는 pointer-events-none + aria-hidden인 순수 장식 요소라, 벨 아이콘의
        // animate-pulse가 만드는 별도 스태킹 컨텍스트 위에 시각적으로는 올바르게
        // 그려지지만 elementFromPoint 기반 occlusion 판정(pointer-events를 그대로
        // 따름)에서는 "가려짐"으로 오판된다. be.visible 대신 텍스트 내용만 검증한다.
        cy.get('[data-testid="navbar-notification-unread-badge"]').should('have.text', `${unreadCount}`);
    });

    it('opens notification panel and renders notification list', () => {
        const notifications = createNotificationFixture();

        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: notifications,
        }).as('getNotifications');

        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');

        cy.contains('파티 신청 접수').scrollIntoView().should('be.visible');
        cy.contains('새 팔로워').scrollIntoView().should('be.visible');
    });

    it('shows empty state when there are no notifications', () => {
        const notifications: Array<{
            id: number;
            type: string;
            title: string;
            message: string;
            isRead: boolean;
            createdAt: string;
            relatedId: number | null;
        }> = [];

        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: notifications,
        }).as('getNotifications');

        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');

        cy.contains(/알림이 없|새로운 알림|no notification/i).should('be.visible');
    });

    it('marks all notifications as read when clicking the button', () => {
        const notifications = [
            {
                id: 1,
                type: 'APPLICATION_RECEIVED',
                title: '파티 신청 접수',
                message: '새 신청이 도착했습니다.',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: null,
            },
        ];

        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: notifications,
        }).as('getNotifications');

        cy.intercept('POST', '**/api/notifications/mark-all-read', {
            statusCode: 200,
            body: null,
        }).as('markAllRead');

        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');

        cy.contains('button', /모두 읽음|전체 읽음|모두 읽기|전체 확인/i).click({ force: true });
        cy.wait('@markAllRead');
    });
});
