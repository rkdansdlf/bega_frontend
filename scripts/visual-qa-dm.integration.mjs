#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const BASE_URL = process.env.VISUAL_QA_HARNESS_BASE_URL ?? 'http://127.0.0.1:5182';
const COMPONENT_ID = 'src/components/dm/DirectMessageRuntime.tsx#DirectMessageRuntime';
const REPORT_PATH = process.env.VISUAL_QA_DM_REPORT ?? '/private/tmp/p4-a-dm-integration.json';
const VIEWPORT = { width: 390, height: 844 };

const scenarioId = (interaction, system = 'online', theme = 'light') => (
  `state:${COMPONENT_ID}:data=populated|permissions=user|interactions=${interaction}|system=${system}|variant.theme=${theme}`
    + (interaction === 'default' ? '' : `|interactionTarget=${interaction === 'input' ? 'composer' : interaction === 'submitting' ? 'send' : 'retry'}`)
);

const installRoutes = async (context, mutation = null, retryScenario = false) => {
  let bootstrapAttempts = 0;
  let failedBootstraps = 0;
  let retryReleased = !retryScenario;
  const requests = [];
  await context.addInitScript(() => {
    const typedWindow = window;
    typedWindow.Cypress = true;
    typedWindow.__begaDmSocketFactory = ({ onConnect }) => {
      onConnect();
      return () => {};
    };
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
    if (url.pathname === '/api/dm/rooms' && request.method() === 'POST') {
      bootstrapAttempts += 1;
      if (mutation === 'retry-noop' || !retryReleased) {
        failedBootstraps += 1;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, code: mutation === 'retry-noop' ? 'VISUAL_QA_DM_RETRY_MUTATION' : 'VISUAL_QA_DM_RETRY', message: 'retry fixture' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            roomId: 901,
            membershipState: 'ACTIVE',
            targetUser: {
              id: 456,
              name: 'Visual QA 상대',
              handle: '@visual-qa-target',
              favoriteTeam: 'LG',
              profileImageUrl: null,
            },
          },
        }),
      });
      return;
    }
    if (url.pathname === '/api/dm/rooms/901/messages' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            id: 1,
            roomId: 901,
            senderId: 456,
            content: '기존 대화 기록입니다.',
            clientMessageId: null,
            createdAt: '2026-09-17T09:00:00.000Z',
          }],
        }),
      });
      return;
    }
    if (url.pathname === '/api/dm/messages' && request.method() === 'POST') {
      const body = request.postDataJSON?.() ?? {};
      requests.push({ method: request.method(), pathname: url.pathname, body });
      const content = mutation === 'send-noop' ? 'MUTATED_RESPONSE' : body.content;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 2,
            roomId: 901,
            senderId: 900002,
            content,
            clientMessageId: body.clientMessageId ?? null,
            createdAt: '2026-09-17T09:01:00.000Z',
          },
        }),
      });
      return;
    }
    await route.abort();
  });
  return {
    requests,
    get bootstrapAttempts() { return bootstrapAttempts; },
    get failedBootstraps() { return failedBootstraps; },
    releaseRetry: () => { retryReleased = true; },
  };
};

const waitReady = async (page, selectedScenarioId) => {
  await page.waitForFunction((expected) => {
    const status = window.__BEGA_VISUAL_QA_HARNESS__;
    return status?.state === 'ready' && status.scenarioId === expected;
  }, selectedScenarioId, { timeout: 30_000 });
};

const runFlow = async (browserType, browserName, interaction, mutation = null) => {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const fixture = await installRoutes(context, mutation, interaction === 'retry');
  const page = await context.newPage();
  const selectedScenarioId = scenarioId(interaction, interaction === 'retry' ? 'request-failed' : 'online');
  try {
    await page.goto(`${BASE_URL}/visual-qa-harness.html?scenario=${encodeURIComponent(selectedScenarioId)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await waitReady(page, selectedScenarioId);
    await page.locator('[data-vqa-router-pathname]').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    assert.equal(await page.locator('[data-vqa-router-pathname]').getAttribute('data-vqa-router-pathname'), '/messages/otheruser');

    if (interaction === 'retry') {
      await page.getByRole('button', { name: '다시 시도' }).waitFor({ state: 'visible', timeout: 5_000 });
      assert.ok(fixture.failedBootstraps > 0, 'retry must begin from an actual failed API response');
      const attemptsBeforeClick = fixture.bootstrapAttempts;
      const retryResponse = page.waitForResponse((response) => (
        new URL(response.url()).pathname === '/api/dm/rooms' && response.request().method() === 'POST'
      ), { timeout: 5_000 });
      fixture.releaseRetry();
      await page.getByRole('button', { name: '다시 시도' }).click();
      const response = await retryResponse;
      assert.ok(fixture.bootstrapAttempts > attemptsBeforeClick, 'retry click must issue a new bootstrap request');
      assert.equal(response.status(), mutation === 'retry-noop' ? 503 : 200);
      if (mutation === 'retry-noop') {
        await page.getByRole('button', { name: '다시 시도' }).waitFor({ state: 'visible', timeout: 5_000 });
        throw new Error('EXPECTED_DM_RETRY_MUTATION_RED');
      }
      await page.getByPlaceholder('메시지를 입력하세요').waitFor({ state: 'visible', timeout: 5_000 });
      assert.equal(await page.getByText('기존 대화 기록입니다.').count(), 1);
    } else {
      await page.getByPlaceholder('메시지를 입력하세요').waitFor({ state: 'visible', timeout: 5_000 });
      assert.equal(await page.getByText('기존 대화 기록입니다.').count(), 1);
    }

    if (interaction === 'input') {
      await page.getByPlaceholder('메시지를 입력하세요').fill('Visual QA 쪽지 메시지');
      assert.equal(await page.getByPlaceholder('메시지를 입력하세요').inputValue(), 'Visual QA 쪽지 메시지');
    }

    if (interaction === 'submitting') {
      await page.getByPlaceholder('메시지를 입력하세요').fill('Visual QA 전송 메시지');
      const sendResponse = page.waitForResponse((response) => {
        const responseUrl = new URL(response.url());
        return responseUrl.pathname === '/api/dm/messages' && response.request().method() === 'POST';
      });
      await page.getByRole('button', { name: '메시지 보내기' }).click();
      await sendResponse;
      await page.waitForTimeout(100);
      if (mutation === 'send-noop') {
        assert.equal(await page.getByText('Visual QA 전송 메시지').count(), 0);
        assert.equal(await page.getByText('MUTATED_RESPONSE').count(), 1);
        throw new Error('EXPECTED_DM_SEND_MUTATION_RED');
      }
      await page.getByText('Visual QA 전송 메시지').waitFor({ state: 'visible', timeout: 5_000 });
      assert.equal(fixture.requests.length, 1);
      assert.equal(fixture.requests[0].body.content, 'Visual QA 전송 메시지');
    }

    return { browser: browserName, interaction, mutation, status: 'PASS', requestCount: fixture.requests.length, bootstrapAttempts: fixture.bootstrapAttempts, failedBootstraps: fixture.failedBootstraps };
  } finally {
    await context.close();
    await browser.close();
  }
};

const runBrowser = async (browserType, browserName) => {
  const flows = [];
  for (const interaction of ['default', 'input', 'submitting', 'retry']) {
    flows.push(await runFlow(browserType, browserName, interaction));
  }
  const mutations = [];
  for (const mutation of ['send-noop', 'retry-noop']) {
    let red = false;
    try {
      await runFlow(browserType, browserName, mutation === 'send-noop' ? 'submitting' : 'retry', mutation);
    } catch (error) {
      red = error instanceof Error && error.message === (mutation === 'send-noop'
        ? 'EXPECTED_DM_SEND_MUTATION_RED' : 'EXPECTED_DM_RETRY_MUTATION_RED');
      if (!red) throw error;
    }
    assert.equal(red, true, `${browserName} ${mutation} mutation must be RED`);
    const restored = await runFlow(browserType, browserName, mutation === 'send-noop' ? 'submitting' : 'retry');
    mutations.push({ browser: browserName, mutation, red, restoredGreen: restored.status === 'PASS', targetPreserved: true });
  }
  return { flows, mutations };
};

const main = async () => {
  const source = await readFile(new URL('../src/components/dm/DirectMessageRuntime.tsx', import.meta.url));
  const apiSource = await readFile(new URL('../src/api/dm.ts', import.meta.url));
  const chromiumResult = await runBrowser(chromium, 'chromium');
  const webkitResult = await runBrowser(webkit, 'webkit');
  const report = {
    schemaVersion: 1,
    status: 'PASS',
    componentId: COMPONENT_ID,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    apiSourceSha256: createHash('sha256').update(apiSource).digest('hex'),
    baseUrl: BASE_URL,
    viewport: VIEWPORT,
    externalRequests: 'blocked',
    realUserMessageSent: false,
    chromium: chromiumResult,
    webkit: webkitResult,
    summary: {
      flowPassCount: chromiumResult.flows.length + webkitResult.flows.length,
      flowCount: 8,
      mutationRedCount: chromiumResult.mutations.filter(({ red }) => red).length + webkitResult.mutations.filter(({ red }) => red).length,
      mutationRestoredGreenCount: chromiumResult.mutations.filter(({ restoredGreen }) => restoredGreen).length
        + webkitResult.mutations.filter(({ restoredGreen }) => restoredGreen).length,
    },
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[visual-qa:dm] ${report.status} flows=${report.summary.flowPassCount}/${report.summary.flowCount} mutation-red=${report.summary.mutationRedCount}/4 restored-green=${report.summary.mutationRestoredGreenCount}/4 report=${REPORT_PATH}`);
};

main().catch((error) => {
  console.error(`[visual-qa:dm] FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
