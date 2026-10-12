import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const smokeScript = join(root, 'scripts/dm_authenticated_smoke.sh');
const ciWrapper = join(root, 'scripts/run_dm_authenticated_smoke_ci.sh');
const senderEmail = 'dm-sender-private-sentinel@example.invalid';
const senderPassword = 'dm-sender-password-sentinel';
const targetEmail = 'dm-target-private-sentinel@example.invalid';
const targetPassword = 'dm-target-password-sentinel';
const targetHandle = '@dm-target-handle-sentinel';
const roomId = 918273645;
const responseBodySentinel = 'DM_SMOKE_RESPONSE_BODY_SENTINEL';

const privateValues = [
  senderEmail,
  senderPassword,
  targetEmail,
  targetPassword,
  targetHandle,
  String(roomId),
  responseBodySentinel,
];

function assertOutputIsRedacted(output: string) {
  for (const value of privateValues) {
    assert.equal(output.includes(value), false, `output disclosed a synthetic private value: ${value}`);
  }
}

function run(script: string, env: NodeJS.ProcessEnv) {
  return spawnSync('/bin/bash', ['--noprofile', '--norc', '-euo', 'pipefail', '-c', script], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 10_000,
  });
}

test('authenticated DM smoke redacts identifiers and response bodies from logs, summary, and artifact', t => {
  const workDir = mkdtempSync(join(tmpdir(), 'dm-smoke-output-security-'));
  t.after(() => rmSync(workDir, { recursive: true, force: true }));
  const binDir = join(workDir, 'bin');
  mkdirSync(binDir);

  const fakeCurl = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const url = new URL(args[args.length - 1]);
const path = url.pathname;
const outputIndex = args.indexOf('-o');
const outputFile = outputIndex >= 0 ? args[outputIndex + 1] : null;
const dataIndex = args.indexOf('-d');
const payload = dataIndex >= 0 ? JSON.parse(args[dataIndex + 1]) : {};
const statePath = process.env.DM_SMOKE_TEST_STATE;
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const roomId = ${roomId};
const sentinel = '${responseBodySentinel}';
let status = '200';
let body;

if (path === '/api/auth/login') {
  if (process.env.DM_SMOKE_TEST_FAIL_LOGIN === 'true' && payload.email === '${senderEmail}') {
    status = '401';
    body = { success: false, message: sentinel };
  } else {
    body = { success: true };
  }
} else if (path === '/api/users/profile/${targetHandle}/follow-counts') {
  body = { isFollowedByMe: true };
} else if (path === '/api/dm/rooms') {
  body = { data: { roomId } };
} else if (path === '/api/dm/messages') {
  state.messages.push(String(payload.content));
  fs.writeFileSync(statePath, JSON.stringify(state));
  body = { data: { roomId, content: payload.content } };
} else if (path === '/api/dm/rooms/' + roomId + '/messages') {
  body = process.env.DM_SMOKE_TEST_OMIT_HISTORY === 'true'
    ? { data: [{ content: sentinel }] }
    : { data: state.messages.map(content => ({ content })) };
} else {
  status = '404';
  body = { success: false, message: sentinel };
}

const response = JSON.stringify({ ...body, diagnostic: sentinel });
if (outputFile) fs.writeFileSync(outputFile, response);
else process.stdout.write(response);
if (args.includes('-w')) process.stdout.write(status);
`;
  writeFileSync(join(binDir, 'curl'), fakeCurl, { mode: 0o755 });

  const baseUrl = 'http://synthetic.invalid';
  const statePath = join(workDir, 'state.json');
  const resetState = () => writeFileSync(statePath, JSON.stringify({ messages: [] }));
  const makeEnv = (extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
    ...process.env,
    PATH: `${binDir}:${process.env.PATH ?? ''}`,
    BASE_URL: baseUrl,
    CLIENT_ORIGIN: 'http://127.0.0.1:5176',
    DM_SENDER_EMAIL: senderEmail,
    DM_SENDER_PASSWORD: senderPassword,
    DM_TARGET_EMAIL: targetEmail,
    DM_TARGET_PASSWORD: targetPassword,
    DM_TARGET_HANDLE: targetHandle,
    VERIFY_UNFOLLOW_REUSE: 'false',
    DM_SMOKE_TEST_STATE: statePath,
    ...extra,
  });

  resetState();
  const success = run(`"${smokeScript}"`, makeEnv());
  assert.equal(success.status, 0, success.stderr);
  assertOutputIsRedacted(`${success.stdout}${success.stderr}`);

  resetState();
  const historyFailure = run(`"${smokeScript}"`, makeEnv({ DM_SMOKE_TEST_OMIT_HISTORY: 'true' }));
  assert.equal(historyFailure.status, 1, 'missing-history assertion failure exit code changed');
  assertOutputIsRedacted(`${historyFailure.stdout}${historyFailure.stderr}`);

  resetState();
  const loginFailure = run(`"${smokeScript}"`, makeEnv({ DM_SMOKE_TEST_FAIL_LOGIN: 'true' }));
  assert.equal(loginFailure.status, 1, 'authentication failure exit code changed');
  assertOutputIsRedacted(`${loginFailure.stdout}${loginFailure.stderr}`);

  resetState();
  const reportDir = join(workDir, 'reports');
  const wrapperFailure = run(`"${ciWrapper}"`, makeEnv({
    REPORT_DIR: reportDir,
    DM_SMOKE_TEST_OMIT_HISTORY: 'true',
  }));
  assert.equal(wrapperFailure.status, 1, 'CI wrapper did not preserve the missing-history failure status');
  assertOutputIsRedacted(`${wrapperFailure.stdout}${wrapperFailure.stderr}`);

  const logPath = join(reportDir, 'dm-authenticated-smoke.log');
  const artifactLog = readFileSync(logPath, 'utf8');
  assertOutputIsRedacted(artifactLog);

  const callerWorkflow = load(readFileSync(join(root, '.github/workflows/frontend-postdeploy-smoke.yml'), 'utf8')) as {
    jobs: Record<string, { with: Record<string, unknown> }>;
  };
  const dmJob = callerWorkflow.jobs['dm-authenticated-smoke'];
  assert.ok(String(dmJob.with.artifact_paths).includes('reports/dm-authenticated-smoke.log'));

  const reportsDir = join(workDir, 'summary-checkout', 'reports');
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(join(reportsDir, 'dm-authenticated-smoke.log'), artifactLog);
  const summaryPath = join(workDir, 'github-step-summary.md');
  const summaryScript = String(dmJob.with.summary_script);
  const summary = run(summaryScript, makeEnv({
    DM_API_BASE_URL: baseUrl,
    DM_FRONTEND_ORIGIN: 'http://127.0.0.1:5176',
    GITHUB_STEP_SUMMARY: summaryPath,
  }));
  assert.equal(summary.status, 0, summary.stderr);
  const summaryContent = readFileSync(summaryPath, 'utf8');
  assertOutputIsRedacted(`${summary.stdout}${summary.stderr}${summaryContent}`);
});
