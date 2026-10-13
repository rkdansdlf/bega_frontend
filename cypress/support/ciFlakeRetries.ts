/// <reference types="cypress" />

// CI(Docker + Vite dev server + Electron)는 로컬보다 약 5배 느려 렌더링이 2~3fps까지 떨어진다.
// 예측 스펙은 cy.clock 으로 가짜가 된 setTimeout 과 실제 rAF/rIC/SSE 렌더링이 얽혀 있어,
// 정지 원인(가짜 시계 tick 부족)을 고친 뒤에도 느린 러너에서 회당 1건 정도 서로 다른
// 테스트가 10초 예산을 넘겨 실패한다 (원인 미확정, 재현은 CI 에서만).
// run 모드(CI)에서만 최대 2회 재시도하고, `cypress open` 에서는 재시도 없이 실패를 그대로 보여 준다.
// 재시도에도 실패하면 진짜 회귀이므로 그대로 실패한다.
export const CI_FLAKE_RETRIES: Cypress.SuiteConfigOverrides = {
    retries: { runMode: 2, openMode: 0 },
};
