/// <reference types="cypress" />

type Theme = 'light' | 'dark';
type ConversationState = 'empty' | 'populated' | 'access-denied';

const viewports = [
  { name: '320x844', width: 320, height: 844 },
  { name: '390x844', width: 390, height: 844 },
] as const;
const themes: Theme[] = ['light', 'dark'];
const states: ConversationState[] = ['empty', 'populated', 'access-denied'];

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

const populatedMessages = [
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

const installSocketFactory = (win: Window) => {
  (win as Window & { __begaDmSocketFactory?: unknown }).__begaDmSocketFactory = ({ onConnect }: { onConnect: () => void }) => {
    onConnect();
    return () => undefined;
  };
};

const installVisualPreferences = (win: Window, theme: Theme) => {
  win.localStorage.setItem('kbo-theme', theme);
  win.localStorage.removeItem('bega-theme');
  win.localStorage.removeItem('theme');
  win.document.documentElement.classList.toggle('dark', theme === 'dark');
  win.document.documentElement.style.fontSize = '32px';
};

const assertLargeTextContext = (theme: Theme, width: number) => {
  cy.document().should((doc) => {
    expect(doc.documentElement.style.fontSize).to.equal('32px');
    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
    expect(Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth)).to.be.at.most(width);
  });
};

type TargetQuery = () => Cypress.Chainable<JQuery<HTMLElement>> | Cypress.Chainable<JQuery<HTMLButtonElement>>;

const assertTargetAboveDock = (getTarget: TargetQuery, label: string) => {
  getTarget().should('be.visible').then(($target) => {
    $target[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  });
  getTarget().should(($target) => {
    const target = $target[0];
    const doc = target.ownerDocument;
    const header = doc.querySelector<HTMLElement>('header.sticky');
    const dock = doc.querySelector<HTMLElement>('[data-testid="auth-mobile-bottom-nav"]');
    expect(header, 'sticky header').not.to.equal(null);
    expect(dock, 'mobile bottom dock').not.to.equal(null);
    const rect = target.getBoundingClientRect();
    const headerBottom = header!.getBoundingClientRect().bottom;
    const dockTop = dock!.getBoundingClientRect().top;
    expect(rect.top, `${label} clears sticky header`).to.be.at.least(headerBottom);
    expect(rect.bottom, `${label} clears mobile dock`).to.be.at.most(dockTop - 8);
    const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    expect(hit === target || target.contains(hit), `${label} is not occluded`).to.equal(true);
  });
};

const getFinalTextLineRect = (target: HTMLElement): DOMRect | null => {
  const range = target.ownerDocument.createRange();
  range.selectNodeContents(target);
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
  return rects[rects.length - 1] ?? null;
};

// Fonts and large-text reflow keep growing the message list after the first scroll, so the pin is re-applied on
// every retry of the assertion instead of once.
const pinFinalLineInView = (target: HTMLElement) => {
  const doc = target.ownerDocument;
  const win = doc.defaultView!;
  const messageViewport = target.closest<HTMLElement>('[data-testid="dm-message-viewport"]');
  const header = doc.querySelector<HTMLElement>('header.sticky');
  const dock = doc.querySelector<HTMLElement>('[data-testid="auth-mobile-bottom-nav"]');
  expect(header, 'sticky header').not.to.equal(null);
  expect(dock, 'mobile bottom dock').not.to.equal(null);
  if (messageViewport) {
    messageViewport.scrollTo({ top: messageViewport.scrollHeight, behavior: 'instant' });
  }

  const lineRect = getFinalTextLineRect(target);
  if (!lineRect) return;
  const headerBottom = header!.getBoundingClientRect().bottom;
  const dockTop = dock!.getBoundingClientRect().top;
  let nextScrollY = win.scrollY;
  if (lineRect.bottom > dockTop - 8) {
    nextScrollY += lineRect.bottom - (dockTop - 8);
  }
  if (lineRect.top < headerBottom + 8) {
    nextScrollY -= (headerBottom + 8) - lineRect.top;
  }
  const maxScrollY = Math.max(0, doc.documentElement.scrollHeight - win.innerHeight);
  win.scrollTo({ top: Math.max(0, Math.min(maxScrollY, nextScrollY)), behavior: 'instant' });
};

const assertFinalTextLineAboveDock = (getTarget: TargetQuery, label: string) => {
  getTarget().then(($target) => {
    pinFinalLineInView($target[0]);
  });

  getTarget().should(($target) => {
    const target = $target[0];
    pinFinalLineInView(target);
    const doc = target.ownerDocument;
    const header = doc.querySelector<HTMLElement>('header.sticky');
    const dock = doc.querySelector<HTMLElement>('[data-testid="auth-mobile-bottom-nav"]');
    const lineRect = getFinalTextLineRect(target);
    expect(header, 'sticky header').not.to.equal(null);
    expect(dock, 'mobile bottom dock').not.to.equal(null);
    expect(lineRect, `${label} has a rendered final line`).not.to.equal(null);
    expect(lineRect!.top, `${label} final line clears the sticky header`).to.be.at.least(
      header!.getBoundingClientRect().bottom + 8,
    );
    expect(lineRect!.bottom, `${label} final line clears the mobile dock`).to.be.at.most(
      dock!.getBoundingClientRect().top - 8,
    );
    const hit = doc.elementFromPoint(
      lineRect!.left + lineRect!.width / 2,
      lineRect!.top + lineRect!.height / 2,
    );
    expect(hit === target || target.contains(hit), `${label} final line is not occluded`).to.equal(true);
  });
};

describe('DM conversation large-text visual acceptance', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  for (const viewport of viewports) {
    for (const theme of themes) {
      for (const state of states) {
        it(`${state} remains readable at ${viewport.name}, 32px, ${theme}`, () => {
          cy.viewport(viewport.width, viewport.height);
          cy.intercept('POST', '**/api/dm/rooms', state === 'access-denied'
            ? {
              statusCode: 403,
              body: {
                success: false,
                code: 'DM_FOLLOW_REQUIRED',
                message: '팔로우한 사용자에게만 메시지를 보낼 수 있습니다.',
              },
            }
            : {
              statusCode: 200,
              body: { success: true, data: bootstrapResponse },
            }).as('bootstrapDmRoom');

          if (state !== 'access-denied') {
            cy.intercept('GET', '**/api/dm/rooms/901/messages', {
              statusCode: 200,
              body: { success: true, data: state === 'populated' ? populatedMessages : [] },
            }).as('getDmMessages');
          }

          cy.visit('/messages/long_korean_fan_handle', {
            onBeforeLoad: (win) => {
              installSocketFactory(win);
              installVisualPreferences(win, theme);
            },
          });
          cy.wait('@bootstrapDmRoom');
          if (state !== 'access-denied') {
            cy.wait('@getDmMessages');
          }
          assertLargeTextContext(theme, viewport.width);

          if (state === 'access-denied') {
            cy.contains('메시지 대화방에 접근할 수 없습니다.').should('be.visible');
            assertTargetAboveDock(() => cy.get('main p'), 'access-denied explanation');
            assertTargetAboveDock(() => cy.get('main button'), 'profile return action');
          } else {
            cy.contains(bootstrapResponse.targetUser.name).should('be.visible');
            if (state === 'empty') {
              cy.contains('첫 메시지를 보내보세요.').should('be.visible');
              assertTargetAboveDock(
                () => cy.get('main [data-testid="dm-message-viewport"] p:last-of-type'),
                'empty-state guidance',
              );
            } else {
              cy.contains('긴 합성 DM입니다').should('be.visible');
              assertFinalTextLineAboveDock(
                () => cy.get('[data-testid="dm-message-viewport"] .group p').last(),
                'final message',
              );
            }
            cy.get('textarea[placeholder="메시지를 입력하세요"]').type('전송 동작을 확인합니다');
            cy.contains('button', '메시지 보내기').should(($button) => {
              const button = $button[0];
              expect(
                button.scrollWidth,
                `send-button content width ${button.scrollWidth}px should fit its ${button.clientWidth}px box`,
              ).to.be.at.most(button.clientWidth);
            });
            assertTargetAboveDock(() => cy.contains('button', '메시지 보내기'), 'message send action');
          }

          cy.screenshot(`dm-large-${viewport.name}-${theme}-${state}`, { capture: 'viewport' });
        });
      }
    }
  }
});

export {};
