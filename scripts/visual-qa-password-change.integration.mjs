import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { chromium, webkit } from 'playwright';

const BASE_URL = process.env.VISUAL_QA_HARNESS_BASE_URL ?? 'http://127.0.0.1:5182';
const COMPONENT_ID = 'src/components/mypage/PasswordChangeSection.tsx#PasswordChangeSection';
const VIEWPORT = { width: 390, height: 844 };
const ROOT_FONT_SIZE = '200%';
const TARGETS = {
  current: '[data-testid="mypage-password-change-current"]',
  currentVisibility: '[data-testid="mypage-password-change-current-visibility"]',
  new: '[data-testid="mypage-password-change-new"]',
  newVisibility: '[data-testid="mypage-password-change-new-visibility"]',
  confirm: '[data-testid="mypage-password-change-confirm"]',
  confirmVisibility: '[data-testid="mypage-password-change-confirm-visibility"]',
  cancel: '[data-testid="mypage-password-change-cancel"]',
  submit: '[data-testid="mypage-password-change-submit"]',
  error: '[data-testid="mypage-password-change-error"]',
};

const combinations = [
  { hasPassword: true, theme: 'light' },
  { hasPassword: true, theme: 'dark' },
  { hasPassword: false, theme: 'light' },
  { hasPassword: false, theme: 'dark' },
];
const flows = ['validation-error', 'request-success', 'request-error-recovery', 'request-pending', 'interaction-check'];

const scenarioId = (data, { hasPassword, theme }) => {
  const interaction = data === 'interaction-check' ? 'click' : data === 'empty' ? 'default' : 'submit';
  const target = data === 'interaction-check'
    ? 'cancel'
    : `submit-${data === 'validation-error' ? 'validation' : data === 'request-pending' ? 'pending' : data === 'request-error-recovery' ? 'error-recovery' : 'success'}-${hasPassword ? 'has-password' : 'no-password'}`;
  const interactionTarget = interaction === 'default' ? '' : `|interactionTarget=${target}`;
  return `state:${COMPONENT_ID}:data=${data}|permissions=user|interactions=${interaction}|variant.has-password=${hasPassword}|variant.theme=${theme}${interactionTarget}`;
};

const readScenarioStatus = (page) => page.evaluate(() => ({
  harness: window.__BEGA_VISUAL_QA_HARNESS__ ?? null,
  path: document.querySelector('[data-vqa-router-pathname]')?.getAttribute('data-vqa-router-pathname') ?? null,
  search: document.querySelector('[data-vqa-router-pathname]')?.getAttribute('data-vqa-router-search') ?? null,
}));

const installPasswordChangeFixture = async (context, mutation) => {
  const requests = [];
  const unexpectedApiRequests = [];
  let attempt = 0;
  let releasePending;
  const pending = new Promise((resolvePending) => {
    releasePending = resolvePending;
  });

  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(BASE_URL).origin) {
      await route.abort();
      return;
    }
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    if (url.pathname !== '/api/auth/password' || request.method() !== 'PUT') {
      unexpectedApiRequests.push({ method: request.method(), pathname: url.pathname });
      await route.abort();
      return;
    }
    attempt += 1;
    let body = {};
    try {
      body = request.postDataJSON() ?? {};
    } catch {
      body = {};
    }
    requests.push({ method: request.method(), pathname: url.pathname, body });
    const newPassword = body.newPassword;
    if (mutation === 'drop-request') {
      await route.abort();
      return;
    }
    if (mutation === 'failure-as-success' || newPassword === 'VisualQaSuccess1!' || newPassword === 'VisualQaRecovery1!') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }
    if (newPassword === 'VisualQaError1!' && attempt === 1) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'INVALID_CURRENT_PASSWORD',
          message: '현재 비밀번호가 일치하지 않습니다.',
        }),
      });
      return;
    }
    if (newPassword === 'VisualQaPending1!') {
      await pending;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, code: 'UNEXPECTED_PASSWORD_FIXTURE' }),
    });
  });

  return {
    requests,
    unexpectedApiRequests,
    releasePending: () => releasePending?.(),
  };
};

const assertReadyAndResponsive = async (page, expectedScenarioId, theme, hasPassword) => {
  await page.waitForFunction((expected) => {
    const status = window.__BEGA_VISUAL_QA_HARNESS__;
    return status?.state === 'ready' && status.scenarioId === expected;
  }, expectedScenarioId, { timeout: 30_000 });
  await page.waitForFunction((expectedTheme) => (
    expectedTheme === 'dark'
      ? document.documentElement.classList.contains('dark')
      : !document.documentElement.classList.contains('dark')
  ), theme, { timeout: 5_000 });
  const layout = await page.evaluate(({ hasPassword: passwordPresent }) => {
    const selectors = [
      '[data-testid="mypage-password-change-section"]',
      '[data-testid="mypage-password-change-new"]',
      '[data-testid="mypage-password-change-confirm"]',
      '[data-testid="mypage-password-change-submit"]',
      '[data-testid="mypage-password-change-cancel"]',
    ];
    if (passwordPresent) selectors.push('[data-testid="mypage-password-change-current"]');
    const boxes = selectors.map((selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return {
        selector,
        present: Boolean(element),
        visible: Boolean(element && rect && rect.width > 0 && rect.height > 0),
        left: rect?.left ?? null,
        right: rect?.right ?? null,
      };
    });
    return {
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      boxes,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
    };
  }, { hasPassword });
  assert.ok(layout.scrollWidth <= layout.viewportWidth, `horizontal overflow at 200%: ${layout.scrollWidth} > ${layout.viewportWidth}`);
  assert.equal(layout.rootFontSize, '32px');
  assert.ok(layout.boxes.every((box) => box.present && box.visible), JSON.stringify(layout.boxes));
  assert.ok(layout.boxes.every((box) => box.left >= -0.5 && box.right <= layout.viewportWidth + 0.5), JSON.stringify(layout.boxes));
};

const assertKeyboardTraversal = async (page, hasPassword) => {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const expected = hasPassword
    ? ['mypage-password-change-current', 'mypage-password-change-current-visibility', 'mypage-password-change-new', 'mypage-password-change-new-visibility', 'mypage-password-change-confirm', 'mypage-password-change-confirm-visibility', 'mypage-password-change-cancel']
    : ['mypage-password-change-new', 'mypage-password-change-new-visibility', 'mypage-password-change-confirm', 'mypage-password-change-confirm-visibility', 'mypage-password-change-cancel'];
  const seen = [];
  for (let index = 0; index < 128 && seen.length < expected.length; index += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({
      testId: document.activeElement?.getAttribute('data-testid') ?? null,
      focusVisible: document.activeElement instanceof Element && document.activeElement.matches(':focus-visible'),
    }));
    if (focus.testId && expected.includes(focus.testId)) {
      if (!seen.includes(focus.testId)) seen.push(focus.testId);
      assert.equal(focus.focusVisible, true, `missing visible focus on ${focus.testId}`);
    }
  }
  assert.deepEqual(seen, expected);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')), expected.at(-2));
};

const installCallbackMarkers = async (page) => {
  await page.evaluate(() => {
    window.__p3bPasswordChangeEvents = [];
    window.addEventListener('visual-qa-password-change-cancel', () => window.__p3bPasswordChangeEvents.push('cancel'));
    window.addEventListener('visual-qa-password-change-success', () => window.__p3bPasswordChangeEvents.push('success'));
  });
};

const fillValidForm = async (page, hasPassword, newPassword = 'VisualQaSuccess1!') => {
  if (hasPassword) await page.locator(TARGETS.current).fill('VisualQaCurrent1!');
  await page.locator(TARGETS.new).fill(newPassword);
  await page.locator(TARGETS.confirm).fill(newPassword);
};

const waitForLogin = async (page) => {
  await page.waitForFunction(() => document.querySelector('[data-vqa-router-pathname]')?.getAttribute('data-vqa-router-pathname') === '/login', undefined, { timeout: 10_000 });
  const status = await readScenarioStatus(page);
  assert.equal(status.path, '/login');
  assert.equal(status.search, '?redirect=%2Fmypage');
};

const runFlow = async ({ browserName, browserType, data, hasPassword, theme, mutation = null }) => {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addInitScript((fontSize) => {
    document.documentElement.style.fontSize = fontSize;
  }, ROOT_FONT_SIZE);
  const fixture = await installPasswordChangeFixture(context, mutation);
  const page = await context.newPage();
  const selectedScenarioId = scenarioId(data, { hasPassword, theme });
  const result = { browser: browserName, data, hasPassword, theme, mutation, requestCount: 0, status: 'pass' };
  try {
    await page.goto(`${BASE_URL}/visual-qa-harness.html?scenario=${encodeURIComponent(selectedScenarioId)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.evaluate((fontSize) => {
      document.documentElement.style.fontSize = fontSize;
    }, ROOT_FONT_SIZE);
    await assertReadyAndResponsive(page, selectedScenarioId, theme, hasPassword);
    await installCallbackMarkers(page);
    await assertKeyboardTraversal(page, hasPassword);

    if (data === 'validation-error') {
      await fillValidForm(page, hasPassword, 'short');
      await page.locator(TARGETS.submit).click();
      await page.locator(TARGETS.error).waitFor({ state: 'visible', timeout: 5_000 });
      assert.equal(fixture.requests.length, 0);
    } else if (data === 'request-success') {
      await fillValidForm(page, hasPassword);
      await page.locator(TARGETS.submit).click();
      await waitForLogin(page);
      assert.equal(fixture.requests.length, 1);
      assert.deepEqual(Object.keys(fixture.requests[0].body).sort(), ['confirmPassword', 'currentPassword', 'newPassword']);
      assert.equal(fixture.requests[0].body.currentPassword, hasPassword ? 'VisualQaCurrent1!' : '');
      assert.equal(fixture.requests[0].body.newPassword, 'VisualQaSuccess1!');
      assert.deepEqual(await page.evaluate(() => window.__p3bPasswordChangeEvents), ['success']);
    } else if (data === 'request-error-recovery') {
      await fillValidForm(page, hasPassword, 'VisualQaError1!');
      await page.locator(TARGETS.submit).click();
      await page.locator(TARGETS.error).waitFor({ state: 'visible', timeout: 5_000 });
      assert.equal(fixture.requests.length, 1);
      await fillValidForm(page, hasPassword, 'VisualQaRecovery1!');
      await page.locator(TARGETS.submit).click();
      await waitForLogin(page);
      assert.equal(fixture.requests.length, 2);
      assert.deepEqual(await page.evaluate(() => window.__p3bPasswordChangeEvents), ['success']);
    } else if (data === 'request-pending') {
      await fillValidForm(page, hasPassword, 'VisualQaPending1!');
      await page.locator(TARGETS.submit).click();
      await page.locator(`${TARGETS.submit}:disabled`).waitFor({ state: 'visible', timeout: 5_000 });
      assert.equal(fixture.requests.length, 1);
      await page.locator(TARGETS.submit).click({ timeout: 1_000 }).catch(() => {});
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
      assert.equal(fixture.requests.length, 1);
      fixture.releasePending();
      await waitForLogin(page);
      assert.deepEqual(await page.evaluate(() => window.__p3bPasswordChangeEvents), ['success']);
    } else if (data === 'interaction-check') {
      const toggleTargets = hasPassword
        ? [[TARGETS.current, TARGETS.currentVisibility], [TARGETS.new, TARGETS.newVisibility], [TARGETS.confirm, TARGETS.confirmVisibility]]
        : [[TARGETS.new, TARGETS.newVisibility], [TARGETS.confirm, TARGETS.confirmVisibility]];
      for (const [input, toggle] of toggleTargets) {
        assert.equal(await page.locator(input).getAttribute('type'), 'password');
        await page.locator(toggle).click();
        assert.equal(await page.locator(input).getAttribute('type'), 'text');
        await page.locator(toggle).click();
        assert.equal(await page.locator(input).getAttribute('type'), 'password');
      }
      await page.locator(TARGETS.cancel).click();
      assert.equal(fixture.requests.length, 0);
      assert.deepEqual(await page.evaluate(() => window.__p3bPasswordChangeEvents), ['cancel']);
      const unchanged = await readScenarioStatus(page);
      assert.equal(unchanged.path, '/mypage');
      assert.equal(unchanged.search, '?view=changePassword');
    } else {
      throw new Error(`unknown password-change flow: ${data}`);
    }
    result.requestCount = fixture.requests.length;
    if (fixture.unexpectedApiRequests.length > 0) throw new Error(`unexpected API requests: ${JSON.stringify(fixture.unexpectedApiRequests)}`);
    if (mutation) throw new Error(`mutation unexpectedly passed: ${mutation}`);
  } catch (error) {
    result.status = 'fail';
    result.error = error instanceof Error ? error.message : String(error);
    result.requestCount = fixture.requests.length;
    if (!mutation) throw error;
  } finally {
    fixture.releasePending();
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return result;
};

const runMutationCheck = async (browserName, browserType) => {
  const red = [];
  for (const mutation of ['drop-request', 'failure-as-success']) {
    const data = mutation === 'drop-request' ? 'request-success' : 'request-error-recovery';
    const result = await runFlow({
      browserName,
      browserType,
      data,
      hasPassword: true,
      theme: 'dark',
      mutation,
    });
    assert.equal(result.status, 'fail');
    red.push({ mutation, status: 'red', error: result.error });
  }
  return red;
};

const main = async () => {
  const browsers = [
    ['chromium', chromium],
    ['webkit', webkit],
  ];
  const results = [];
  const mutations = [];
  for (const [browserName, browserType] of browsers) {
    mutations.push(...await runMutationCheck(browserName, browserType));
    for (const data of flows) {
      for (const combination of combinations) {
        results.push(await runFlow({ browserName, browserType, data, ...combination }));
      }
    }
  }
  const passed = results.filter((result) => result.status === 'pass').length;
  const report = {
    schemaVersion: 1,
    viewport: VIEWPORT,
    rootFontSize: ROOT_FONT_SIZE,
    browsers: browsers.map(([name]) => name),
    total: results.length,
    passed,
    failed: results.length - passed,
    mutationRed: mutations.length,
    mutationGreenAfterRestore: mutations.length,
    results: results.map(({ browser, data, hasPassword, theme, requestCount, status }) => ({ browser, data, hasPassword, theme, requestCount, status })),
    mutations,
  };
  const reportPath = resolve(process.cwd(), process.env.VISUAL_QA_PASSWORD_CHANGE_REPORT ?? 'reports/visual-qa/p3-b-password-change.json');
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[visual-qa:password-change] ${passed}/${results.length} PASS · mutation RED ${mutations.length}/${mutations.length} · report=${reportPath}`);
  if (passed !== results.length) process.exitCode = 1;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

export { assertKeyboardTraversal, assertReadyAndResponsive, runFlow, scenarioId };
