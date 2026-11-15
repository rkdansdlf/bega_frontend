import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { assertNoRuntimeBoundary, installRuntimeBoundaryObserver, parseArguments, prepareRuntimeBoundaryObservation, runVisualQa } from './visual-qa-audit.mjs';
import { loadPlaywright } from './reflow-320-audit.mjs';

// This mirrors the existing global fallback's heading and runtime feedback contract.
const boundary = '<div><h1>문제가 발생했습니다</h1><div data-testid="error-feedback"><textarea id="error-feedback-runtime"></textarea></div></div>';
const server = createServer((req, res) => {
  if (req.url === '/unreachable') { req.socket.destroy(); return; }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.write('<!doctype html><style>button,textarea { min-width: 44px; min-height: 44px; }</style>');
  if (req.url === '/runtime-failure') res.end(`<div id="root">${boundary}</div>`);
  else if (req.url === '/hidden') res.end(`<div id="root"><div hidden>${boundary}</div><h1>정상 화면</h1></div>`);
  else if (req.url === '/transient') res.end(`<div id="root"><h1>정상 화면</h1></div><script>setTimeout(() => { const el = document.createElement('div'); el.innerHTML = ${JSON.stringify(boundary)}; document.querySelector('#root').append(el); setTimeout(() => el.remove(), 250); }, 100);</script>`);
  else if (req.url === '/same-task') res.end(`<div id="root"><h1>정상 화면</h1></div><script>const el = document.createElement('div'); el.innerHTML = ${JSON.stringify(boundary)}; document.querySelector('#root').append(el); el.remove();</script>`);
  else if (req.url === '/fragment') res.end(`<div id="root"><h1>정상 화면</h1></div><script>function render(){ const root = document.querySelector('#root'); root.innerHTML = location.hash === '#first' ? ${JSON.stringify(boundary)} : '<h1>정상 화면</h1>'; } window.addEventListener('hashchange', render); render();</script>`);
  else if (req.url === '/state-failure') res.end(`<div id="root"><button id="open">열기</button></div><script>document.querySelector('#open').onclick = () => { document.querySelector('#root').innerHTML = ${JSON.stringify(boundary)}; };</script>`);
  else res.end('<div id="root"><h1>문제가 발생했습니다</h1><div data-testid="error-feedback"><textarea id="error-feedback-api"></textarea></div></div>');
});
const outputDir = await mkdtemp(join(tmpdir(), 'visual-qa-runtime-error-'));
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const options = parseArguments([
    '--base-url', `http://127.0.0.1:${server.address().port}`,
    '--routes', '/runtime-failure,/unreachable,/normal,/hidden,/transient,/same-task,/fragment#first,/fragment#second,/state-failure', '--widths', '320', '--output-dir', join(outputDir, 'report'), '--fail-on', 'any',
  ], {});
  options.stateScenarios = [{ id: 'fail-while-opening', name: '합성 오류', route: '/state-failure', minWidth: 320, maxWidth: 320, trigger: '#open', ready: '#never-ready' }];
  const { report, exitCode } = await runVisualQa(options);
  const scenario = (route, state = false) => report.scenarios.find((entry) => entry.route === route && Boolean(entry.state) === state);
  for (const [route, state] of [['/runtime-failure', false], ['/transient', false], ['/fragment#first', false], ['/state-failure', true]]) {
    assert.equal(scenario(route, state).status, 'error');
    assert.match(scenario(route, state).error, /runtime error boundary/i);
  }
  for (const route of ['/normal', '/hidden', '/same-task', '/fragment#second', '/state-failure']) assert.equal(scenario(route).status, 'pass');
  assert.equal(scenario('/unreachable').status, 'error');
  assert.doesNotMatch(scenario('/unreachable').error, /runtime error boundary/i);
  assert.equal(report.summary.scanErrors, 5);
  assert.equal(exitCode, 1);

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await installRuntimeBoundaryObserver(page);
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${base}/fragment#first`);
    await assert.rejects(() => assertNoRuntimeBoundary(page), /runtime error boundary/i);
    await prepareRuntimeBoundaryObservation(page);
    await page.evaluate(() => document.querySelector('#root h1').setAttribute('data-old-mutation', 'yes'));
    assert.equal(await page.evaluate(() => window.__visualQaRuntimeBoundarySeen), false, 'old fallback mutation must not relatch');
    await page.goto(`${base}/fragment#second`);
    await page.waitForFunction(() => document.querySelector('#root h1')?.textContent === '정상 화면');
    await assert.doesNotReject(() => assertNoRuntimeBoundary(page));
    await page.evaluate((html) => { document.querySelector('#root').innerHTML = html; }, boundary);
    await assert.rejects(() => assertNoRuntimeBoundary(page), /runtime error boundary/i);
    await page.goto(`${base}/hidden`);
    await prepareRuntimeBoundaryObservation(page);
    await page.evaluate(() => document.querySelector('#root > div[hidden]').removeAttribute('hidden'));
    await page.waitForFunction(() => window.__visualQaRuntimeBoundarySeen === true);
    await page.evaluate(() => document.querySelector('#root > div').setAttribute('hidden', ''));
    await assert.rejects(() => assertNoRuntimeBoundary(page), /runtime error boundary/i);
    await page.goto(`${base}/fragment#first`);
    await prepareRuntimeBoundaryObservation(page);
    await page.evaluate(() => { const root = document.querySelector('#root'); const old = root.firstElementChild; old.remove(); root.append(old); });
    await page.waitForFunction(() => window.__visualQaRuntimeBoundarySeen === true);
    await assert.rejects(() => assertNoRuntimeBoundary(page), /runtime error boundary/i);
  } finally {
    await browser.close();
  }
  console.log('Visible, transient, fragment and state-triggered boundaries fail; healthy, hidden and same-task fixtures pass; failed navigation is separate.');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(outputDir, { recursive: true, force: true });
}
