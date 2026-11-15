/// <reference types="cypress" />

import {
  DEFAULT_CYPRESS_AUTH_TOKEN,
  seedCypressAuthState,
  toAuthApiUser,
  type CypressAuthUser,
} from '../support/auth';

const authUser: CypressAuthUser = {
  id: 640021,
  email: 'team-logo-visual@example.invalid',
  name: 'Logo Visual QA',
  handle: '@logo-visual-qa',
  favoriteTeam: 'LG',
  role: 'ROLE_USER',
  hasPassword: true,
  profileImageUrl: null,
};

const scenarios = [320, 390].flatMap((width) =>
  [16, 32].flatMap((font) => (['light', 'dark'] as const).flatMap((theme) => [
    { code: 'LG', full: 'LG 트윈스', asset: '202a55c2e2083b7f096b21380d22d1769e56d762' },
    { code: 'KIA', full: '기아 타이거즈', asset: '5162bdc3599041e7b7b1da494d7d0dcc490e5893' },
    { code: 'SSG', full: 'SSG 랜더스', asset: 'b414fb1229152a89657a33002953975be2a9217b' },
  ].map((team) => ({ width, font, theme, team })))),
);

describe('24px team logo fallback visual acceptance', () => {
  for (const scenario of scenarios) {
    it(`keeps ${scenario.team.code} visible and accessible at ${scenario.width}px / ${scenario.font}px / ${scenario.theme}`, () => {
      cy.viewport(scenario.width, 844);
      cy.mockAPI();
      const viewer = { ...authUser, favoriteTeam: scenario.team.code };
      cy.intercept('GET', '**/api/auth/mypage*', {
        statusCode: 200,
        body: { success: true, data: toAuthApiUser(viewer) },
      });
      cy.intercept('GET', `**/${scenario.team.asset}*.png`, {
        forceNetworkError: true,
      });
      cy.intercept({ url: /^https?:\/\/(?!127\.0\.0\.1|localhost)/ }, { forceNetworkError: true });

      cy.visit('/mypage', {
        onBeforeLoad(win) {
          win.document.documentElement.style.fontSize = `${scenario.font}px`;
          seedCypressAuthState(win, viewer, DEFAULT_CYPRESS_AUTH_TOKEN, {
            skipPublicBootstrap: true,
            theme: scenario.theme,
          });
        },
      });

      cy.document().then((doc) => expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${scenario.font}px`));
      cy.get(`[role="img"][aria-label="${scenario.team.full} 팀 로고"]`, { timeout: 20000 })
        .should('be.visible')
        .and('have.attr', 'title', scenario.team.full)
        .and(($logo) => {
          expect(($logo[0] as HTMLElement).style.width, 'small-logo size contract').to.eq('24px');
          const bounds = $logo[0].getBoundingClientRect();
          expect(bounds.width, 'fallback width').to.be.within(1, 24);
          expect(bounds.height, 'fallback height').to.be.within(1, 24);
        })
        .find('span[aria-hidden="true"]')
        .should('have.text', scenario.team.code)
        .and(($label) => {
          const label = $label[0] as HTMLElement;
          const container = label.parentElement!.getBoundingClientRect();
          const bounds = label.getBoundingClientRect();
          expect(bounds.left).to.be.at.least(container.left - 1);
          expect(bounds.right).to.be.at.most(container.right + 1);
          expect(bounds.top).to.be.at.least(container.top - 1);
          expect(bounds.bottom).to.be.at.most(container.bottom + 1);
          const text = label.firstChild!;
          const first = label.ownerDocument.createRange(); first.setStart(text, 0); first.setEnd(text, 1);
          const second = label.ownerDocument.createRange(); second.setStart(text, scenario.team.code.length - 1); second.setEnd(text, scenario.team.code.length);
          const a = first.getBoundingClientRect(), b = second.getBoundingClientRect();
          expect(Math.abs(a.top - b.top), 'short label remains on one line').to.be.lessThan(1);
          expect(a.left).to.be.at.least(container.left - 1);
          expect(b.right).to.be.at.most(container.right + 1);
        });

      cy.screenshot(`team-logo-fallback-${scenario.team.code}-${scenario.width}-${scenario.font}-${scenario.theme}`, { capture: 'viewport' });
    });
  }
});
