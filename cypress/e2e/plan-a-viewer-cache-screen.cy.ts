/// <reference types="cypress" />

import type { CyHttpMessages, Interception } from 'cypress/types/net-stubbing';
import type { QueryClient } from '@tanstack/react-query';
import type { NotificationData } from '../../src/types/notification';

type PrivateQueryKeyFactories = typeof import('../../src/utils/privateQueryKeys').PRIVATE_QUERY_KEYS;
type ViewerQueryScopeRuntime = {
  getViewerQueryScope: () => { viewerId: number | null; sessionEpoch: number };
};
type QueryClientRuntime = {
  queryClient: {
    getQueryCache: () => {
      getAll: () => Array<{ queryKey: readonly unknown[] }>;
    };
  };
};

import { seedCypressAuthState } from '../support/auth';

type AuthStoreModule = {
  useAuthStore: {
    getState: () => {
      user: { id: number } | null;
      logout: (skipServerLogout?: boolean) => Promise<boolean>;
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

describe('Viewer-scoped QueryClient screen regressions', () => {
  const partyId = 901;
  const fakeToken = 'plan-a-viewer-cache-no-network';
  const viewerA = {
    id: 101,
    email: 'viewer-a@example.invalid',
    name: 'Viewer A',
    handle: 'viewer-a',
    role: 'ROLE_USER',
    favoriteTeam: 'HH',
    hasPassword: true,
    profileImageUrl: null,
  };
  const viewerB = {
    id: 202,
    email: 'viewer-b@example.invalid',
    name: 'Viewer B',
    handle: 'viewer-b',
    role: 'ROLE_USER',
    favoriteTeam: 'HH',
    hasPassword: true,
    profileImageUrl: null,
  };
  const party = {
    id: partyId,
    hostId: 303,
    hostHandle: 'synthetic-host',
    hostName: 'A_PRIVATE_DETAIL_SENTINEL',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.8,
    hostReviewCount: 15,
    hostProfileImageUrl: null,
    hostFavoriteTeam: 'SS',
    status: 'PENDING',
    gameDate: '2026-03-28',
    gameTime: '18:30',
    stadium: '대구삼성라이온즈파크',
    teamId: 'SS',
    homeTeam: 'SS',
    awayTeam: 'LG',
    section: '블루존',
    maxParticipants: 4,
    currentParticipants: 2,
    ticketPrice: 26000,
    ticketVerified: true,
    description: 'synthetic viewer-scope regression fixture',
    createdAt: '2026-03-01T09:00:00',
    favorited: true,
  };
  const mateListParty = { ...party, hostName: 'Synthetic host' };

  const installNetworkGuards = () => {
    cy.intercept({ pathname: /^\/api\// }, {
      statusCode: 503,
      body: { success: false, message: 'Blocked by local Plan A regression fixture' },
    });
    cy.intercept('https://**/*', { forceNetworkError: true });
  };

  const tokenForViewer = (viewer: typeof viewerA) => `${fakeToken}-viewer-${viewer.id}`;

  const visitAsViewer = (path: string, viewer: typeof viewerA) => cy.visit(path, {
    onBeforeLoad(win) {
      seedCypressAuthState(win, viewer, tokenForViewer(viewer));
    },
  });

  const switchToViewer = (viewer: typeof viewerA, beforeLogin?: () => void) => cy.window().then(async (win) => {
    const authStoreModuleUrl = win.performance.getEntriesByType('resource')
      .map((entry) => new URL(entry.name, win.location.href))
      .filter((url) => url.pathname.endsWith('/src/store/authStore.ts'))
      .slice(-1)[0]?.href ?? new URL('/src/store/authStore.ts', win.location.origin).href;
    Cypress.log({ name: 'auth store module url', message: authStoreModuleUrl });
    const authModule = await win.eval(`import(${JSON.stringify(authStoreModuleUrl)})`) as AuthStoreModule;
    await authModule.useAuthStore.getState().logout(true);
    beforeLogin?.();
    authModule.useAuthStore.getState().login(
      viewer.email,
      viewer.name,
      viewer.profileImageUrl,
      viewer.role,
      viewer.favoriteTeam,
      viewer.id,
      0,
      viewer.handle,
      undefined,
      viewer.hasPassword,
    );
    seedCypressAuthState(win, viewer, tokenForViewer(viewer), { skipPublicBootstrap: true });
    expect(authModule.useAuthStore.getState().user?.id, 'in-memory viewer after login').to.eq(viewer.id);
    expect(win.localStorage.getItem('accessToken'), 'synthetic viewer token after login')
      .to.eq(tokenForViewer(viewer));
    const viewerScopeModule = await win.eval("import('/src/utils/viewerQueryScope.ts')") as ViewerQueryScopeRuntime;
    const queryClientModule = await win.eval("import('/src/lib/queryClient.ts')") as QueryClientRuntime;
    const scope = viewerScopeModule.getViewerQueryScope();
    expect(scope.viewerId, 'query-scope viewer after login').to.eq(viewer.id);
    const scopedKeys = queryClientModule.queryClient.getQueryCache().getAll()
      .map((query) => query.queryKey)
      .filter((key) => key.includes('viewer'));
    Cypress.log({ name: 'viewer cache scope', message: JSON.stringify({ scope, scopedKeys }) });
  });

  const navigateClientSide = (path: string) => cy.window().then((win) => {
    win.history.pushState({}, '', path);
    win.dispatchEvent(new win.PopStateEvent('popstate', { state: {} }));
  });

  const remountThroughHome = (path: string) => {
    navigateClientSide('/home');
    cy.location('pathname').should('eq', '/home');
    navigateClientSide(path);
    cy.location('pathname').should('eq', path.split('?')[0]);
  };

  it('hides viewer A party detail after same-SPA switch when viewer B is denied', () => {
    let denyPartyForViewerB = false;

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);

    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: { success: true, data: viewerA },
    }).as('getViewerProfile');
    cy.intercept('GET', `**/api/parties/${partyId}*`, (request: CyHttpMessages.IncomingHttpRequest) => {
      if (!denyPartyForViewerB) {
        request.reply({ statusCode: 200, body: party });
        return;
      }

      request.reply({ statusCode: 403, body: { message: 'Forbidden for current viewer' } });
    }).as('partyDetailRequest');
    cy.intercept('GET', `**/api/applications/party/${partyId}/mine`, { statusCode: 404, body: {} });
    cy.intercept('GET', `**/api/applications/party/${partyId}*`, { statusCode: 200, body: [] });
    cy.intercept('GET', '**/api/diary/seat-views*', { statusCode: 200, body: [] });
    cy.intercept('GET', `**/api/checkin/party/${partyId}*`, { statusCode: 200, body: [] });

    cy.visit(`/mate/${partyId}`, {
      onBeforeLoad(win) {
        seedCypressAuthState(win, viewerA, tokenForViewer(viewerA));
      },
    });

    cy.get('@partyDetailRequest.all').should((requests: Interception[]) => {
      expect(requests.some((request: Interception) => request.response?.statusCode === 200)).to.eq(true);
    });
    cy.contains('A_PRIVATE_DETAIL_SENTINEL').should('be.visible');
    cy.screenshot('plan-a-party-detail-viewer-a', { capture: 'viewport' });

    switchToViewer(viewerB, () => {
      denyPartyForViewerB = true;
    });

    cy.contains('A_PRIVATE_DETAIL_SENTINEL').should('not.exist');
    cy.get('@partyDetailRequest.all').should((requests: Interception[]) => {
      expect(requests.some((request: Interception) => request.response?.statusCode === 403)).to.eq(true);
    });
    cy.contains('A_PRIVATE_DETAIL_SENTINEL').should('not.exist');
    cy.location('pathname').should('eq', `/mate/${partyId}`);
    cy.screenshot('plan-a-party-detail-viewer-b-denied', { capture: 'viewport' });
  });

  it('does not carry viewer A favorite state into viewer B Mate list (BUG-265)', () => {
    let viewerBActive = false;

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: { success: true, data: viewerA },
    });
    cy.intercept({ method: 'GET', pathname: '/api/parties' }, (request: CyHttpMessages.IncomingHttpRequest) => {
      const requestUrl = new URL(request.url);
      if (requestUrl.searchParams.get('size') !== '9') {
        request.reply({
          statusCode: 200,
          body: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, last: true },
        });
        return;
      }

      if (!viewerBActive) {
        request.alias = 'getMatePartyListViewerA';
        request.reply({
          statusCode: 200,
          body: { content: [mateListParty], totalElements: 1, totalPages: 1, number: 0, size: 9, last: true },
        });
        return;
      }

      const viewerBPartyList = {
        content: [{ ...mateListParty, favorited: false }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 9,
        last: true,
      };
      request.alias = 'getMatePartyListViewerB';
      request.reply({ statusCode: 200, body: viewerBPartyList });
    });

    visitAsViewer('/mate', viewerA);
    cy.wait('@getMatePartyListViewerA');
    cy.get('[data-testid="mate-party-card-favorite"]')
      .should('have.attr', 'aria-pressed', 'true');
    cy.screenshot('plan-a-mate-list-viewer-a', { capture: 'viewport' });

    switchToViewer(viewerB, () => {
      viewerBActive = true;
    });
    cy.get('[data-testid="mate-party-card-favorite"]')
      .should('have.attr', 'aria-pressed', 'false');
    cy.screenshot('plan-a-mate-list-viewer-b', { capture: 'viewport' });
  });

  it('does not apply viewer A favorite rollback to viewer B after a delayed failure (BUG-265)', () => {
    let viewerBActive = false;
    let releaseViewerAFavoriteFailure: (() => void) | null = null;

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: { success: true, data: viewerA },
    });
    cy.intercept({ method: 'GET', pathname: '/api/parties' }, (request: CyHttpMessages.IncomingHttpRequest) => {
      const requestUrl = new URL(request.url);
      if (requestUrl.searchParams.get('size') !== '9') {
        request.reply({
          statusCode: 200,
          body: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, last: true },
        });
        return;
      }

      if (!viewerBActive) {
        request.alias = 'getMatePartyListViewerAForRollback';
        request.reply({
          statusCode: 200,
          body: { content: [{ ...mateListParty, favorited: false }], totalElements: 1, totalPages: 1, number: 0, size: 9, last: true },
        });
        return;
      }

      request.alias = 'getMatePartyListViewerBForRollback';
      request.reply({
        statusCode: 200,
        body: { content: [{ ...mateListParty, favorited: false }], totalElements: 1, totalPages: 1, number: 0, size: 9, last: true },
      });
    });
    cy.intercept('POST', `**/api/parties/${partyId}/favorite`, (request: CyHttpMessages.IncomingHttpRequest) => {
      request.alias = 'setViewerAFavorite';
      return new Promise<void>((resolve) => {
        releaseViewerAFavoriteFailure = () => {
          request.reply({ statusCode: 500, body: { message: 'Synthetic delayed favorite failure' } });
          resolve();
        };
      });
    });

    visitAsViewer('/mate', viewerA);
    cy.wait('@getMatePartyListViewerAForRollback');
    cy.get('[data-testid="mate-party-card-favorite"]').should('have.attr', 'aria-pressed', 'false').click();
    cy.get('[data-testid="mate-party-card-favorite"]').should('have.attr', 'aria-pressed', 'true');
    cy.wrap(null).should(() => {
      expect(releaseViewerAFavoriteFailure, 'viewer A favorite request is pending').to.be.a('function');
    });

    switchToViewer(viewerB, () => {
      viewerBActive = true;
    });
    cy.wait('@getMatePartyListViewerBForRollback');
    cy.get('[data-testid="mate-party-card-favorite"]').should('have.attr', 'aria-pressed', 'false');
    cy.then(() => releaseViewerAFavoriteFailure?.());
    cy.wait('@setViewerAFavorite').its('response.statusCode').should('eq', 500);
    cy.get('[data-testid="mate-party-card-favorite"]')
      .should('have.attr', 'aria-pressed', 'false')
      .and('not.be.disabled');
  });

  it('does not carry the host check-in roster into a different viewer (BUG-266)', () => {
    let viewerBActive = false;
    const hostParty = { ...party, hostId: viewerA.id, hostHandle: viewerA.handle, hostName: 'Synthetic host' };
    const privateRosterEntry = {
      id: 444,
      partyId,
      userId: 404,
      userName: 'ROSTER_PRIVATE_SENTINEL',
      userHandle: '@synthetic-attendee',
      checkedInAt: '2026-03-28T10:00:00Z',
    };

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: { success: true, data: viewerA },
    });
    cy.intercept('GET', `**/api/parties/${partyId}*`, {
      statusCode: 200,
      body: hostParty,
    }).as('getCheckInParty');
    cy.intercept('GET', `**/api/checkin/party/${partyId}*`, (request: CyHttpMessages.IncomingHttpRequest) => {
      if (!viewerBActive) {
        request.alias = 'getCheckInsViewerA';
        request.reply({ statusCode: 200, body: [privateRosterEntry] });
        return;
      }

      request.alias = 'getCheckInsViewerB';
      request.reply({ statusCode: 403, body: { message: 'Forbidden for current viewer' } });
    });

    visitAsViewer(`/mate/${partyId}/checkin`, viewerA);
    cy.wait('@getCheckInParty');
    cy.wait('@getCheckInsViewerA');
    cy.get('[data-testid="mate-check-in-roster"]')
      .contains('ROSTER_PRIVATE_SENTINEL')
      .should('be.visible');
    cy.screenshot('plan-a-checkin-roster-viewer-a', { capture: 'viewport' });

    switchToViewer(viewerB, () => {
      viewerBActive = true;
    });
    cy.wait('@getCheckInsViewerB')
      .its('response.statusCode')
      .should('eq', 403);
    cy.contains('ROSTER_PRIVATE_SENTINEL').should('not.exist');
    cy.screenshot('plan-a-checkin-roster-viewer-b-denied', { capture: 'viewport' });
  });

  it('replaces viewer A follow state in the open follower list after account switch (BUG-272)', () => {
    let viewerBActive = false;
    let releaseViewerBFollowers: (() => void) | null = null;
    const followedMember = {
      id: 505,
      handle: '@synthetic-member',
      name: 'FOLLOW_STATE_PRIVATE_SENTINEL',
      profileImageUrl: null,
      favoriteTeam: null,
      isFollowedByMe: true,
    };
    const profile = {
      id: 606,
      email: null,
      name: 'Synthetic profile',
      handle: '@otheruser',
      favoriteTeam: null,
      role: 'ROLE_USER',
      profileImageUrl: null,
      bio: null,
      cheerPoints: 0,
    };

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: { success: true, data: viewerA },
    });
    cy.intercept({ method: 'GET', pathname: /^\/api\/users\/profile\// }, (request: CyHttpMessages.IncomingHttpRequest) => {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      if (pathname.endsWith('/followers')) {
        if (!viewerBActive) {
          request.alias = 'getFollowersViewerA';
          request.reply({
            statusCode: 200,
            body: { content: [followedMember], last: true, totalPages: 1, totalElements: 1, size: 20, number: 0 },
          });
          return;
        }

        request.alias = 'getFollowersViewerB';
        return new Promise<void>((resolve) => {
          releaseViewerBFollowers = () => {
            request.reply({
              statusCode: 200,
              body: {
                content: [{ ...followedMember, isFollowedByMe: false }],
                last: true,
                totalPages: 1,
                totalElements: 1,
                size: 20,
                number: 0,
              },
            });
            resolve();
          };
        });
      }

      if (pathname.endsWith('/follow-counts')) {
        request.reply({
          statusCode: 200,
          body: { followerCount: 1, followingCount: 0, isFollowedByMe: false, notifyNewPosts: false },
        });
        return;
      }

      request.reply({ statusCode: 200, body: { success: true, data: profile } });
    });
    cy.intercept('GET', '**/api/cheer/user/**/posts*', {
      statusCode: 200,
      body: { content: [], last: true, totalElements: 0, totalPages: 0, size: 20, number: 0 },
    });

    visitAsViewer('/profile/@otheruser', viewerA);
    cy.contains('팔로워', { timeout: 10000 }).should('be.visible').click();
    cy.wait('@getFollowersViewerA');
    cy.get('[role="dialog"]')
      .contains('FOLLOW_STATE_PRIVATE_SENTINEL')
      .should('be.visible');
    cy.get('[role="dialog"] [data-testid="profile-following-button"]')
      .should('be.visible');
    cy.screenshot('plan-a-followers-viewer-a', { capture: 'viewport' });

    switchToViewer(viewerB, () => {
      viewerBActive = true;
    });
    cy.wrap(null).should(() => {
      expect(releaseViewerBFollowers, 'viewer B request is pending').to.be.a('function');
    });
    cy.get('[role="dialog"] [data-testid="profile-following-button"]')
      .should('not.exist');
    cy.then(() => releaseViewerBFollowers?.());
    cy.wait('@getFollowersViewerB').its('response.statusCode').should('eq', 200);
    cy.get('[role="dialog"] [data-testid="profile-follow-button"]')
      .should('be.visible');
    cy.screenshot('plan-a-followers-viewer-b', { capture: 'viewport' });
  });

  [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ].forEach((viewport) => {
    it(`does not carry viewer A follow state into viewer B's mounted public profile at ${viewport.width}px (BUG-270)`, () => {
      let viewerBActive = false;
      let releaseViewerBFollowCounts: (() => void) | null = null;
      const profile = {
        id: 606,
        email: null,
        name: 'Synthetic public profile',
        handle: '@otheruser',
        favoriteTeam: null,
        role: 'ROLE_USER',
        profileImageUrl: null,
        bio: null,
        cheerPoints: 0,
      };
      const viewerAFollowCounts = {
        followerCount: 8,
        followingCount: 3,
        isFollowedByMe: true,
        notifyNewPosts: true,
        blockedByMe: false,
        blockingMe: false,
      };
      const viewerBFollowCounts = {
        ...viewerAFollowCounts,
        isFollowedByMe: false,
        notifyNewPosts: false,
      };

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.viewport(viewport.width, viewport.height);
      installNetworkGuards();
      cy.intercept('GET', '**/auth/mypage*', {
        statusCode: 200,
        body: { success: true, data: viewerA },
      });
      cy.intercept({ method: 'GET', pathname: /^\/api\/users\/profile\// }, (request: CyHttpMessages.IncomingHttpRequest) => {
        const pathname = decodeURIComponent(new URL(request.url).pathname);
        if (pathname.endsWith('/follow-counts')) {
          if (!viewerBActive) {
            request.alias = 'getFollowCountsViewerA';
            request.reply({ statusCode: 200, body: viewerAFollowCounts });
            return;
          }

          request.alias = 'getFollowCountsViewerB';
          return new Promise<void>((resolve) => {
            releaseViewerBFollowCounts = () => {
              request.reply({ statusCode: 200, body: viewerBFollowCounts });
              resolve();
            };
          });
        }

        request.reply({ statusCode: 200, body: { success: true, data: profile } });
      });
      cy.intercept('GET', '**/api/cheer/user/**/posts*', {
        statusCode: 200,
        body: { content: [], last: true, totalElements: 0, totalPages: 0, size: 20, number: 0 },
      });

      visitAsViewer('/profile/@otheruser', viewerA);
      cy.wait('@getFollowCountsViewerA');
      cy.get('[data-testid="profile-following-button"]').should('be.visible');
      cy.contains('button', '메시지 보내기').should('not.be.disabled');

      switchToViewer(viewerB, () => {
        viewerBActive = true;
      });
      cy.wrap(null).should(() => {
        expect(releaseViewerBFollowCounts, 'viewer B follow-counts request is pending').to.be.a('function');
      });
      cy.get('[data-testid="profile-following-button"]').should('not.exist');
      cy.get('[data-testid="profile-follow-button"]').should('be.visible');
      cy.contains('button', '메시지 보내기').should('be.disabled');
      cy.then(() => releaseViewerBFollowCounts?.());
      cy.wait('@getFollowCountsViewerB').its('response.statusCode').should('eq', 200);
      cy.get('[data-testid="profile-follow-button"]').should('be.visible');
    });

    it(`does not render viewer A's personalized post interactions for viewer B at ${viewport.width}px (BUG-271)`, () => {
      let viewerBActive = false;
      let releaseViewerBPosts: (() => void) | null = null;
      const profile = {
        id: 606,
        email: null,
        name: 'Synthetic public profile',
        handle: '@otheruser',
        favoriteTeam: null,
        role: 'ROLE_USER',
        profileImageUrl: null,
        bio: null,
        cheerPoints: 0,
      };
      const makePost = (content: string, liked: boolean, isBookmarked: boolean, repostedByMe: boolean) => ({
        id: 777,
        teamId: 'HH',
        team: '한화 이글스',
        postType: 'NORMAL',
        author: 'Synthetic author',
        authorId: 303,
        authorHandle: '@synthetic-author',
        content,
        timeAgo: '방금 전',
        teamColor: '#F37321',
        likeCount: 7,
        commentCount: 2,
        bookmarkCount: 3,
        repostCount: 1,
        views: 0,
        isHot: false,
        createdAt: '2026-09-28T10:00:00.000Z',
        updatedAt: '2026-09-28T10:00:00.000Z',
        liked,
        isBookmarked,
        isOwner: false,
        repostedByMe,
      });
      const viewerAPost = makePost('VIEWER_A_PROFILE_POST_SENTINEL', true, true, true);
      const viewerBPost = makePost('VIEWER_B_PROFILE_POST_SENTINEL', false, false, false);

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.viewport(viewport.width, viewport.height);
      installNetworkGuards();
      cy.intercept('GET', '**/auth/mypage*', {
        statusCode: 200,
        body: { success: true, data: viewerA },
      });
      cy.intercept({ method: 'GET', pathname: /^\/api\/users\/profile\// }, (request: CyHttpMessages.IncomingHttpRequest) => {
        const pathname = decodeURIComponent(new URL(request.url).pathname);
        if (pathname.endsWith('/follow-counts')) {
          request.reply({
            statusCode: 200,
            body: { followerCount: 8, followingCount: 3, isFollowedByMe: false, notifyNewPosts: false },
          });
          return;
        }
        request.reply({ statusCode: 200, body: { success: true, data: profile } });
      });
      cy.intercept('GET', '**/api/cheer/user/**/posts*', (request: CyHttpMessages.IncomingHttpRequest) => {
        if (!viewerBActive) {
          request.alias = 'getUserPostsViewerA';
          request.reply({
            statusCode: 200,
            body: { content: [viewerAPost], last: true, totalElements: 1, totalPages: 1, size: 20, number: 0 },
          });
          return;
        }

        request.alias = 'getUserPostsViewerB';
        return new Promise<void>((resolve) => {
          releaseViewerBPosts = () => {
            request.reply({
              statusCode: 200,
              body: { content: [viewerBPost], last: true, totalElements: 1, totalPages: 1, size: 20, number: 0 },
            });
            resolve();
          };
        });
      });

      visitAsViewer('/profile/@otheruser', viewerA);
      cy.wait('@getUserPostsViewerA');
      cy.contains('VIEWER_A_PROFILE_POST_SENTINEL').scrollIntoView().should('be.visible');
      cy.get('button[aria-label^="리포스트 (현재"]').click();
      cy.get('[data-testid="cheer-card-interactions"]').should('be.visible');
      cy.get('[data-testid="cheer-card-like"]').should('have.attr', 'aria-pressed', 'true');
      cy.get('[data-testid="cheer-card-bookmark"]').should('have.attr', 'aria-pressed', 'true');
      cy.get('[data-testid="cheer-card-repost"]').should('have.attr', 'aria-pressed', 'true');

      switchToViewer(viewerB, () => {
        viewerBActive = true;
      });
      cy.wrap(null).should(() => {
        expect(releaseViewerBPosts, 'viewer B user-posts request is pending').to.be.a('function');
      });
      cy.contains('VIEWER_A_PROFILE_POST_SENTINEL').should('not.exist');
      cy.get('[data-testid="cheer-card-interactions"]').should('not.exist');
      cy.then(() => releaseViewerBPosts?.());
      cy.wait('@getUserPostsViewerB').its('response.statusCode').should('eq', 200);
      cy.contains('VIEWER_B_PROFILE_POST_SENTINEL').scrollIntoView().should('be.visible');
      cy.get('button[aria-label^="리포스트 (현재"]').click();
      cy.get('[data-testid="cheer-card-interactions"]').should('be.visible');
      cy.get('[data-testid="cheer-card-like"]').should('have.attr', 'aria-pressed', 'false');
      cy.get('[data-testid="cheer-card-bookmark"]').should('have.attr', 'aria-pressed', 'false');
      cy.get('[data-testid="cheer-card-repost"]').should('have.attr', 'aria-pressed', 'false');
    });
  });

  it('keeps a late viewer A profile response out of viewer B screen and QueryClient (BUG-273)', {
    defaultCommandTimeout: 30000,
  }, () => {
    const viewerAProfile = {
      id: 606,
      email: null,
      name: 'Synthetic private-profile owner',
      handle: '@otheruser',
      favoriteTeam: null,
      role: 'ROLE_USER',
      profileImageUrl: null,
      bio: 'VIEWER_A_PRIVATE_PROFILE_BIO_SENTINEL',
      cheerPoints: 0,
    };
    let resolveLateViewerAProfile: ((profile: typeof viewerAProfile) => void) | null = null;
    let lateViewerAProfileRequest: Promise<typeof viewerAProfile | undefined> | undefined;
    let releaseViewerBProfile: (() => void) | null = null;
    let viewerAProfileKey: readonly unknown[] = [];

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: { success: true, data: viewerA },
    });
    cy.intercept({ method: 'GET', pathname: /^\/api\/users\/profile\// }, (request: CyHttpMessages.IncomingHttpRequest) => {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      if (pathname.endsWith('/follow-counts')) {
        request.reply({
          statusCode: 200,
          body: { followerCount: 0, followingCount: 0, isFollowedByMe: false, notifyNewPosts: false },
        });
        return;
      }

      const requestCookie = request.headers.cookie ?? '';
      if (requestCookie.includes(tokenForViewer(viewerA))) {
        request.alias = 'getViewerAProfile';
        request.reply({ statusCode: 200, body: { success: true, data: viewerAProfile } });
        return;
      }

      if (!requestCookie.includes(tokenForViewer(viewerB))) {
        request.alias = 'getGuestPrivateProfile';
        request.reply({ statusCode: 403, body: { message: 'Forbidden for current viewer' } });
        return;
      }

      request.alias = 'getViewerBPrivateProfile';
      return new Promise<void>((resolve) => {
        releaseViewerBProfile = () => {
          request.reply({ statusCode: 403, body: { message: 'Forbidden for current viewer' } });
          resolve();
        };
      });
    });
    cy.intercept('GET', '**/api/cheer/user/**/posts*', {
      statusCode: 200,
      body: { content: [], last: true, totalElements: 0, totalPages: 0, size: 20, number: 0 },
    });

    visitAsViewer('/profile/@otheruser', viewerA);
    cy.wait('@getViewerAProfile');
    cy.contains('VIEWER_A_PRIVATE_PROFILE_BIO_SENTINEL').should('be.visible');
    cy.screenshot('plan-a-private-profile-viewer-a', { capture: 'viewport' });

    cy.window().then(async (win) => {
      const { queryClient } = await win.eval("import('/src/lib/queryClient.ts')") as { queryClient: QueryClient };
      const { profileQueryKeys } = await win.eval("import('/src/hooks/profileQueryKeys.ts')") as {
        profileQueryKeys: typeof import('../../src/hooks/profileQueryKeys').profileQueryKeys;
      };
      viewerAProfileKey = profileQueryKeys.publicProfile('@otheruser');
      lateViewerAProfileRequest = queryClient.fetchQuery({
        queryKey: viewerAProfileKey,
        queryFn: () => new Promise<typeof viewerAProfile>((resolve) => {
          resolveLateViewerAProfile = resolve;
        }),
        staleTime: 0,
      }).catch(() => undefined);
    });
    cy.wrap(null).should(() => {
      expect(resolveLateViewerAProfile, 'viewer A profile refresh is pending').to.be.a('function');
    });

    switchToViewer(viewerB);
    cy.wrap(null).should(() => {
      expect(releaseViewerBProfile, 'viewer B authorization check is pending').to.be.a('function');
    });
    cy.contains('VIEWER_A_PRIVATE_PROFILE_BIO_SENTINEL').should('not.exist');
    cy.screenshot('plan-a-private-profile-viewer-b-pending', { capture: 'viewport' });

    cy.then(async () => {
      resolveLateViewerAProfile?.(viewerAProfile);
      await lateViewerAProfileRequest;
    });
    cy.contains('VIEWER_A_PRIVATE_PROFILE_BIO_SENTINEL').should('not.exist');
    cy.window().then(async (win) => {
      const { queryClient } = await win.eval("import('/src/lib/queryClient.ts')") as { queryClient: QueryClient };
      expect(queryClient.getQueryData(viewerAProfileKey)).to.equal(undefined);
    });

    cy.then(() => releaseViewerBProfile?.());
    cy.wait('@getViewerBPrivateProfile').its('response.statusCode').should('eq', 403);
    cy.contains('사용자를 찾을 수 없습니다.').should('be.visible');
    cy.contains('VIEWER_A_PRIVATE_PROFILE_BIO_SENTINEL').should('not.exist');
    cy.screenshot('plan-a-private-profile-viewer-b-denied', { capture: 'viewport' });
    cy.window().then(async (win) => {
      const { queryClient } = await win.eval("import('/src/lib/queryClient.ts')") as { queryClient: QueryClient };
      const { profileQueryKeys } = await win.eval("import('/src/hooks/profileQueryKeys.ts')") as {
        profileQueryKeys: typeof import('../../src/hooks/profileQueryKeys').profileQueryKeys;
      };
      expect(queryClient.getQueryData(viewerAProfileKey)).to.equal(undefined);
      expect(queryClient.getQueryData(profileQueryKeys.publicProfile('@otheruser'))).to.equal(undefined);
    });
  });

  it('clears private caches and ignores a delayed A response after switching to B', () => {
    installNetworkGuards();
    visitAsViewer('/home', viewerA);

    let delayedKey: readonly unknown[] = [];
    let resolveDelayedA: ((value: { owner: string }) => void) | undefined;
    let delayedARequest: Promise<unknown> | undefined;

    cy.window().then(async (win) => {
      const { queryClient } = await win.eval("import('/src/lib/queryClient.ts')") as { queryClient: QueryClient };
      const { PRIVATE_QUERY_KEYS } = await win.eval("import('/src/utils/privateQueryKeys.ts')") as {
        PRIVATE_QUERY_KEYS: PrivateQueryKeyFactories;
      };
      const { useNotificationStore } = await win.eval("import('/src/store/notificationStore.ts')") as {
        useNotificationStore: {
          getState: () => {
            notifications: NotificationData[];
            addNotification: (notification: NotificationData) => void;
          };
        };
      };
      const scopeA = { viewerId: viewerA.id, sessionEpoch: 81 };
      const keys = [
        PRIVATE_QUERY_KEYS.connectedProviders(scopeA),
        PRIVATE_QUERY_KEYS.accountSessions(scopeA),
        PRIVATE_QUERY_KEYS.accountSecurityEvents(scopeA),
        PRIVATE_QUERY_KEYS.diaries(scopeA),
        PRIVATE_QUERY_KEYS.diaryStatistics(scopeA),
        PRIVATE_QUERY_KEYS.blockedUsers(scopeA),
        PRIVATE_QUERY_KEYS.powerupInventory(scopeA),
        PRIVATE_QUERY_KEYS.activePowerups(scopeA),
        PRIVATE_QUERY_KEYS.leaderboardMe(scopeA),
        PRIVATE_QUERY_KEYS.predictionStats(scopeA),
        PRIVATE_QUERY_KEYS.dmInbox(scopeA),
        PRIVATE_QUERY_KEYS.dmRoomBootstrap('@fixture-private', scopeA),
        PRIVATE_QUERY_KEYS.dmMessages(901, scopeA),
        PRIVATE_QUERY_KEYS.cheerBookmarks(scopeA),
        PRIVATE_QUERY_KEYS.cheerMyPosts({ size: 10 }, scopeA),
      ];
      keys.forEach((key) => queryClient.setQueryData(key, { owner: 'A_PRIVATE_SENTINEL' }));
      useNotificationStore.getState().addNotification({
        id: 9901,
        type: 'POST_COMMENT',
        title: 'A_PRIVATE_NOTIFICATION',
        message: 'synthetic fixture',
        relatedId: 91,
        isRead: false,
        createdAt: '2026-09-29T00:00:00.000Z',
      });

      delayedKey = PRIVATE_QUERY_KEYS.dmMessages(902, scopeA);
      delayedARequest = queryClient.fetchQuery({
        queryKey: delayedKey,
        queryFn: () => new Promise<{ owner: string }>((resolve) => {
          resolveDelayedA = resolve;
        }),
      }).catch(() => undefined);
    });

    cy.wrap(null).should(() => {
      expect(resolveDelayedA, 'viewer A response is pending').to.be.a('function');
    });
    switchToViewer(viewerB);
    cy.then(async () => {
      resolveDelayedA?.({ owner: 'A_PRIVATE_SENTINEL' });
      await delayedARequest;
    });
    cy.window().then(async (win) => {
      const { queryClient } = await win.eval("import('/src/lib/queryClient.ts')") as { queryClient: QueryClient };
      const { PRIVATE_QUERY_KEYS } = await win.eval("import('/src/utils/privateQueryKeys.ts')") as {
        PRIVATE_QUERY_KEYS: PrivateQueryKeyFactories;
      };
      const { useNotificationStore } = await win.eval("import('/src/store/notificationStore.ts')") as {
        useNotificationStore: { getState: () => { notifications: NotificationData[] } };
      };

      expect(queryClient.getQueryData(delayedKey)).to.equal(undefined);
      expect(queryClient.getQueryData(PRIVATE_QUERY_KEYS.dmMessages(902, {
        viewerId: viewerB.id,
        sessionEpoch: 82,
      }))).to.equal(undefined);
      expect(useNotificationStore.getState().notifications).to.deep.equal([]);
      expect(JSON.stringify(queryClient.getQueryCache().getAll().map((query) => query.queryKey)))
        .not.to.contain('A_PRIVATE_SENTINEL');
    });
  });

  it('keeps viewer A DM inbox data out of viewer B after route remount', () => {
    let activeViewerId = viewerA.id;
    let releaseViewerBInbox: (() => void) | null = null;
    const viewerARoom = {
      roomId: 99001,
      targetUser: {
        id: 99002,
        name: 'DM_VIEWER_A_PRIVATE_SENTINEL',
        handle: '@synthetic-dm-target',
      },
      lastMessage: {
        content: 'DM_VIEWER_A_MESSAGE_PRIVATE_SENTINEL',
        createdAt: '2026-10-07T10:00:00.000Z',
        senderId: viewerA.id,
      },
      hasUnread: false,
    };

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', (request) => {
      request.reply({ success: true, data: activeViewerId === viewerA.id ? viewerA : viewerB });
    });
    cy.intercept('GET', '**/api/dm/rooms/my', (request: CyHttpMessages.IncomingHttpRequest) => {
      if (activeViewerId === viewerA.id) {
        request.alias = 'getViewerAInboxForRemount';
        request.reply({ statusCode: 200, body: { success: true, data: [viewerARoom] } });
        return;
      }

      request.alias = 'getViewerBInboxForRemount';
      return new Promise<void>((resolve) => {
        releaseViewerBInbox = () => {
          request.reply({ statusCode: 403, body: { message: 'Forbidden for current viewer' } });
          resolve();
        };
      });
    });

    visitAsViewer('/messages', viewerA);
    cy.wait('@getViewerAInboxForRemount');
    cy.contains('DM_VIEWER_A_MESSAGE_PRIVATE_SENTINEL').should('be.visible');

    switchToViewer(viewerB, () => {
      activeViewerId = viewerB.id;
    });
    cy.wrap(null).should(() => {
      expect(releaseViewerBInbox, 'viewer B inbox authorization is pending').to.be.a('function');
    });
    cy.contains('DM_VIEWER_A_MESSAGE_PRIVATE_SENTINEL').should('not.exist');
    remountThroughHome('/messages');
    cy.get('[data-testid="dm-inbox-runtime"]').should('be.visible');
    cy.contains('DM_VIEWER_A_MESSAGE_PRIVATE_SENTINEL').should('not.exist');
    cy.then(() => releaseViewerBInbox?.());
    cy.wait('@getViewerBInboxForRemount').its('response.statusCode').should('eq', 403);
    cy.contains('DM_VIEWER_A_PRIVATE_SENTINEL').should('not.exist');
  });

  it('keeps viewer A diary content out of viewer B after route remount', () => {
    let activeViewerId = viewerA.id;
    let releaseViewerBDiaries: (() => void) | null = null;
    const viewerADiary = {
      id: 99011,
      date: '2026-10-07',
      type: 'scheduled',
      emoji: '',
      emojiName: '',
      winningName: null,
      gameId: 0,
      memo: 'DIARY_VIEWER_A_PRIVATE_SENTINEL',
      photos: [],
      team: '',
      stadium: '',
    };

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', (request) => {
      request.reply({ success: true, data: activeViewerId === viewerA.id ? viewerA : viewerB });
    });
    cy.intercept('GET', '**/api/diary/entries*', (request: CyHttpMessages.IncomingHttpRequest) => {
      if (activeViewerId === viewerA.id) {
        request.alias = 'getViewerADiariesForRemount';
        request.reply({ statusCode: 200, body: [viewerADiary] });
        return;
      }

      request.alias = 'getViewerBDiariesForRemount';
      return new Promise<void>((resolve) => {
        releaseViewerBDiaries = () => {
          request.reply({ statusCode: 403, body: { message: 'Forbidden for current viewer' } });
          resolve();
        };
      });
    });

    visitAsViewer('/mypage?view=diary', viewerA);
    cy.wait('@getViewerADiariesForRemount');
    cy.get('[data-testid="diary-memo"]').contains('DIARY_VIEWER_A_PRIVATE_SENTINEL').should('be.visible');

    switchToViewer(viewerB, () => {
      activeViewerId = viewerB.id;
    });
    cy.wrap(null).should(() => {
      expect(releaseViewerBDiaries, 'viewer B diary authorization is pending').to.be.a('function');
    });
    cy.get('[data-testid="diary-memo"]').should('not.exist');
    remountThroughHome('/mypage?view=diary');
    cy.get('[data-testid="diary-memo"]').should('not.exist');
    cy.then(() => releaseViewerBDiaries?.());
    cy.wait('@getViewerBDiariesForRemount').its('response.statusCode').should('eq', 403);
    cy.get('[data-testid="diary-memo"]').should('not.exist');
  });

  it('keeps viewer A diary statistics out of viewer B after route remount', () => {
    let activeViewerId = viewerA.id;
    let releaseViewerBStatistics: (() => void) | null = null;
    const viewerAStatistics = {
      totalCount: 17,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      winRate: 0,
      monthlyCount: 17,
      yearlyCount: 17,
      yearlyWins: 0,
      yearlyWinRate: 0,
      mostVisitedStadium: null,
      mostVisitedCount: 0,
      monthlyVisitCounts: {},
      stadiumVisitCounts: {},
      homeVisitCount: 0,
      awayVisitCount: 0,
      scheduledCount: 0,
      happiestMonth: null,
      happiestCount: 0,
      firstDiaryDate: null,
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
    };

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', (request) => {
      request.reply({ success: true, data: activeViewerId === viewerA.id ? viewerA : viewerB });
    });
    cy.intercept('GET', '**/api/diary/entries*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/api/diary/statistics*', (request: CyHttpMessages.IncomingHttpRequest) => {
      if (activeViewerId === viewerA.id) {
        request.alias = 'getViewerAStatisticsForRemount';
        request.reply({ statusCode: 200, body: viewerAStatistics });
        return;
      }

      request.alias = 'getViewerBStatisticsForRemount';
      return new Promise<void>((resolve) => {
        releaseViewerBStatistics = () => {
          request.reply({ statusCode: 403, body: { message: 'Forbidden for current viewer' } });
          resolve();
        };
      });
    });

    visitAsViewer('/mypage?view=stats', viewerA);
    cy.wait('@getViewerAStatisticsForRemount');
    cy.get('.mypage-season-stat-grid .mypage-season-stat-card').first().contains('17').should('be.visible');

    switchToViewer(viewerB, () => {
      activeViewerId = viewerB.id;
    });
    cy.wrap(null).should(() => {
      expect(releaseViewerBStatistics, 'viewer B statistics authorization is pending').to.be.a('function');
    });
    cy.contains('통계를 불러오는 중...').should('be.visible');
    cy.contains('17').should('not.exist');
    remountThroughHome('/mypage?view=stats');
    cy.contains('통계를 불러오는 중...').should('be.visible');
    cy.contains('17').should('not.exist');
    cy.then(() => releaseViewerBStatistics?.());
    cy.wait('@getViewerBStatisticsForRemount').its('response.statusCode').should('eq', 403);
    cy.contains('17').should('not.exist');
  });

  it('keeps viewer A connected-provider details out of viewer B after route remount', () => {
    let activeViewerId = viewerA.id;
    let releaseViewerBProviders: (() => void) | null = null;
    const viewerAProviderEmail = 'PROVIDER_VIEWER_A_PRIVATE_SENTINEL@example.invalid';

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(390, 844);
    installNetworkGuards();
    cy.intercept('GET', '**/auth/mypage*', (request) => {
      request.reply({ success: true, data: activeViewerId === viewerA.id ? viewerA : viewerB });
    });
    cy.intercept('GET', '**/api/auth/providers', (request: CyHttpMessages.IncomingHttpRequest) => {
      if (activeViewerId === viewerA.id) {
        request.alias = 'getViewerAProvidersForRemount';
        request.reply({
          statusCode: 200,
          body: { success: true, data: [{ provider: 'GOOGLE', email: viewerAProviderEmail, connectedAt: '2026-10-01T00:00:00.000Z' }] },
        });
        return;
      }

      request.alias = 'getViewerBProvidersForRemount';
      return new Promise<void>((resolve) => {
        releaseViewerBProviders = () => {
          request.reply({ statusCode: 403, body: { message: 'Forbidden for current viewer' } });
          resolve();
        };
      });
    });

    visitAsViewer('/mypage?view=accountSettings', viewerA);
    cy.wait('@getViewerAProvidersForRemount');
    cy.get('[data-testid="account-settings-section"]').contains(viewerAProviderEmail).should('be.visible');

    switchToViewer(viewerB, () => {
      activeViewerId = viewerB.id;
    });
    cy.wrap(null).should(() => {
      expect(releaseViewerBProviders, 'viewer B provider authorization is pending').to.be.a('function');
    });
    cy.contains(viewerAProviderEmail).should('not.exist');
    remountThroughHome('/mypage?view=accountSettings');
    cy.get('[data-testid="account-settings-section"]').should('be.visible');
    cy.contains(viewerAProviderEmail).should('not.exist');
    cy.then(() => releaseViewerBProviders?.());
    cy.wait('@getViewerBProvidersForRemount').its('response.statusCode').should('eq', 403);
    cy.contains(viewerAProviderEmail).should('not.exist');
  });
});
