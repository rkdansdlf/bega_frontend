/// <reference types="cypress" />

export {};

type ThemeMode = 'light' | 'dark';

const postId = 920002;
const content = '디자인 확인용 합성 응원 문구입니다. 실제 경기·구단 기록이 아닙니다.';

const post = {
  id: postId,
  teamId: 'TEST',
  team: 'TEST',
  content,
  author: 'Design QA User',
  authorId: 920002,
  authorHandle: 'design_qa_user',
  createdAt: '2026-10-10T00:00:00.000Z',
  updatedAt: '2026-10-10T00:00:00.000Z',
  postType: 'NORMAL',
  isOwner: true,
  imageUrls: [],
};

type VisualScenario = {
  id: string;
  viewport: [number, number];
  theme: ThemeMode;
  rootFontSize?: number;
};

const scenarios: VisualScenario[] = [
  { id: 'mobile-390-light', viewport: [390, 844] as [number, number], theme: 'light' as ThemeMode },
  { id: 'mobile-390-dark', viewport: [390, 844] as [number, number], theme: 'dark' as ThemeMode },
  { id: 'desktop-1400-light', viewport: [1400, 900] as [number, number], theme: 'light' as ThemeMode },
  { id: 'desktop-1400-dark', viewport: [1400, 900] as [number, number], theme: 'dark' as ThemeMode },
  { id: 'mobile-320-light-200-text', viewport: [320, 844], theme: 'light', rootFontSize: 32 },
  { id: 'mobile-320-dark-200-text', viewport: [320, 844], theme: 'dark', rootFontSize: 32 },
];

const scrollToCenterAndExpectHit = (element: HTMLElement) => {
  const document = element.ownerDocument;
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });

  const rect = element.getBoundingClientRect();
  const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

  expect(rect.left, 'target left edge').to.be.at.least(0);
  expect(rect.right, 'target right edge').to.be.at.most(document.documentElement.clientWidth);
  expect(hit === element || element.contains(hit), 'target center receives pointer hit').to.eq(true);
  document.documentElement.style.scrollBehavior = previousScrollBehavior;
};

describe('Cheer edit responsive visual acceptance', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.login('user');
    cy.mockAPI();

    cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
      statusCode: 200,
      body: post,
    }).as('getSyntheticOwnedPost');
    cy.intercept('GET', `**/api/cheer/posts/${postId}/images`, {
      statusCode: 200,
      body: [],
    }).as('getSyntheticPostImages');
  });

  for (const scenario of scenarios) {
    it(`renders the owned edit form at ${scenario.id}`, () => {
      cy.viewport(...scenario.viewport);
      cy.visit(`/cheer/edit/${postId}`, {
        onBeforeLoad(win) {
          win.localStorage.setItem('kbo-theme', scenario.theme);
          if (scenario.rootFontSize) {
            win.document.documentElement.style.fontSize = `${scenario.rootFontSize}px`;
          }
        },
      });

      cy.wait('@getSyntheticOwnedPost');
      cy.wait('@getSyntheticPostImages');
      cy.get('[data-testid="cheer-edit-route"]').should('be.visible');
      cy.get('h2').should('contain.text', '응원글 수정');
      cy.get('textarea').should('be.visible').and('have.value', content);
      cy.get('input[aria-label="이미지 파일 선택"]').should('exist');
      cy.contains('button', '취소').should('be.visible');
      cy.contains('button', '수정 완료').should('be.enabled');
      cy.window().its('innerWidth').should('eq', scenario.viewport[0]);
      cy.document().should((document) => {
        expect(document.documentElement.classList.contains('dark')).to.eq(scenario.theme === 'dark');
        expect(document.documentElement.scrollWidth, 'horizontal overflow').to.be.at.most(scenario.viewport[0]);
        expect(document.body.scrollWidth, 'body horizontal overflow').to.be.at.most(scenario.viewport[0]);
      });
      cy.document().then((document) => document.fonts.ready);
      cy.screenshot(`cheer-edit-visual-acceptance/${scenario.id}`, { capture: 'viewport' });

      if (scenario.rootFontSize) {
        cy.document().should((document) => {
          expect(document.documentElement.style.fontSize).to.eq(`${scenario.rootFontSize}px`);
        });
        cy.get('textarea').should('be.visible').then(($target) => {
          scrollToCenterAndExpectHit($target[0] as HTMLTextAreaElement);
        });
        cy.contains('button', '취소').should('be.visible').then(($target) => {
          scrollToCenterAndExpectHit($target[0] as HTMLButtonElement);
        });
        cy.contains('button', '수정 완료').should('be.visible').then(($target) => {
          scrollToCenterAndExpectHit($target[0] as HTMLButtonElement);
        });
      }
    });
  }
});
