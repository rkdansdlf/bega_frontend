/// <reference types="cypress" />

export {};

type ThemeMode = 'light' | 'dark';

interface Scenario {
  id: string;
  viewport: [number, number];
  theme: ThemeMode;
}

const postId = 7101;
const scenarios: Scenario[] = [
  { id: 'mobile-390-light', viewport: [390, 844], theme: 'light' },
  { id: 'mobile-390-dark', viewport: [390, 844], theme: 'dark' },
  { id: 'desktop-1440-light', viewport: [1440, 900], theme: 'light' },
  { id: 'desktop-1440-dark', viewport: [1440, 900], theme: 'dark' },
];

const post = {
  id: postId,
  content: '오늘도 한화와 함께 응원합니다 — 상세 화면 확인용 합성 샘플입니다.',
  author: '응원 기록자',
  authorId: 901,
  authorHandle: 'cheer-sample',
  authorTeamId: 'HH',
  teamId: 'HH',
  team: 'HH',
  teamColor: 'HH',
  createdAt: '2026-10-09T09:00:00.000Z',
  updatedAt: '2026-10-09T09:00:00.000Z',
  comments: 0,
  commentCount: 0,
  likes: 12,
  likeCount: 12,
  bookmarkCount: 2,
  repostCount: 1,
  views: 48,
  liked: false,
  likedByUser: false,
  bookmarked: false,
  isBookmarked: false,
  repostedByMe: false,
  repostType: undefined,
  postType: 'NORMAL',
  isOwner: false,
  isHot: false,
  images: [],
  imageUrls: [],
};

describe('Cheer post detail visual acceptance', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();

    cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
      statusCode: 200,
      body: post,
    }).as('getCheerDetail');

    cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
      statusCode: 200,
      body: {
        content: [],
        totalElements: 0,
        totalPages: 1,
        last: true,
        size: 20,
        number: 0,
      },
    }).as('getCheerComments');
  });

  it('renders the populated guest detail in mobile and desktop light/dark viewports', () => {
    scenarios.forEach((scenario) => {
      cy.viewport(...scenario.viewport);
      cy.visit(`/cheer/${postId}`, {
        onBeforeLoad(win) {
          win.localStorage.setItem('kbo-theme', scenario.theme);
        },
      });

      cy.wait('@getCheerDetail');
      cy.contains(post.content).should('be.visible');
      cy.get('html').should(($html) => {
        expect($html[0].scrollWidth).to.be.at.most(scenario.viewport[0]);
      });
      cy.window().then((win) => {
        win.scrollTo({ top: win.document.documentElement.scrollHeight, left: 0, behavior: 'instant' });
      });
      cy.window().should((win) => {
        expect(win.scrollY + win.innerHeight).to.be.at.least(win.document.documentElement.scrollHeight - 2);
      });
      cy.wait('@getCheerComments');
      cy.contains('아직 댓글이 없습니다').should('be.visible');
      cy.window().then((win) => {
        win.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
      cy.window().its('scrollY').should('eq', 0);
      cy.contains('응원 기록자').should('be.visible');
      cy.get('body').should(($body) => {
        expect($body[0].innerText.split(post.content).length - 1).to.eq(1);
      });
      cy.screenshot(`cheer-detail-${scenario.id}-top`, { capture: 'viewport' });

      cy.window().then((win) => {
        win.scrollTo({ top: win.document.documentElement.scrollHeight, left: 0, behavior: 'instant' });
      });
      cy.window().should((win) => {
        expect(win.scrollY + win.innerHeight).to.be.at.least(win.document.documentElement.scrollHeight - 2);
      });
      cy.get('body').should('be.visible');
      cy.get('html').should(($html) => {
        expect($html[0].scrollWidth).to.be.at.most(scenario.viewport[0]);
      });
      cy.screenshot(`cheer-detail-${scenario.id}-bottom`, { capture: 'viewport' });
    });
  });
});
