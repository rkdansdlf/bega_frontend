import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const smokeScript = join(monorepoRoot, 'scripts/run_dm_authenticated_smoke_ci.sh');

const curlStub = `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const requestUrl = new URL(args.at(-1));
const mode = process.env.FAKE_CURL_MODE;

function respond(body, status = 200) {
  const outputIndex = args.indexOf('-o');
  if (outputIndex >= 0) {
    fs.writeFileSync(args[outputIndex + 1], JSON.stringify(body));
  } else {
    process.stdout.write(JSON.stringify(body));
  }
  if (args.includes('-w')) process.stdout.write(String(status));
}

if (requestUrl.pathname === '/api/auth/login') {
  if (mode === 'login-failure') {
    respond({ error: 'PRIVATE_LOGIN_RESPONSE_SENTINEL', email: 'sender.private@example.invalid' }, 401);
  } else {
    respond({ success: true });
  }
} else if (requestUrl.pathname === '/api/users/profile/@private-target/follow-counts') {
  respond({ isFollowedByMe: true });
} else if (requestUrl.pathname === '/api/dm/rooms') {
  respond({ data: { roomId: 42 } });
} else if (requestUrl.pathname === '/api/dm/messages') {
  const payloadIndex = args.indexOf('-d');
  const payload = JSON.parse(args[payloadIndex + 1]);
  respond({ data: { roomId: payload.roomId, content: payload.content } });
} else if (requestUrl.pathname === '/api/dm/rooms/42/messages') {
  respond({ data: [], message: 'PRIVATE_HISTORY_RESPONSE_SENTINEL' });
} else {
  process.stderr.write('Unexpected route in synthetic DM smoke test.\\n');
  process.exitCode = 90;
}
`;

function runSmoke(mode: 'login-failure' | 'history-failure') {
  const tempDir = mkdtempSync(join(tmpdir(), 'dm-smoke-privacy-'));
  const binDir = join(tempDir, 'bin');
  const reportDir = join(tempDir, 'reports');
  mkdirSync(binDir, { recursive: true });
  writeFileSync(join(binDir, 'curl'), curlStub, { mode: 0o755 });

  try {
    const result = spawnSync('bash', [smokeScript], {
      cwd: monorepoRoot,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? '/usr/bin:/bin'}`,
        TMPDIR: tempDir,
        REPORT_DIR: reportDir,
        BASE_URL: 'https://api.synthetic.invalid',
        CLIENT_ORIGIN: 'https://frontend.synthetic.invalid',
        DM_SENDER_EMAIL: 'sender.private@example.invalid',
        DM_SENDER_PASSWORD: 'SYNTHETIC_SENDER_PASSWORD',
        DM_TARGET_EMAIL: 'target.private@example.invalid',
        DM_TARGET_PASSWORD: 'SYNTHETIC_TARGET_PASSWORD',
        DM_TARGET_HANDLE: '@private-target',
        VERIFY_UNFOLLOW_REUSE: 'false',
        FAKE_CURL_MODE: mode,
      },
    });

    const logPath = join(reportDir, 'dm-authenticated-smoke.log');
    const log = readFileSync(logPath, 'utf8');
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}\n${log}`;
    return { result, output };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('DM smoke failure log redacts login response bodies and account identifiers', () => {
  const { result, output } = runSmoke('login-failure');

  assert.equal(result.status, 1);
  assert.match(output, /DM smoke login failed for sender \(HTTP 401\)\./);
  assert.doesNotMatch(output, /PRIVATE_LOGIN_RESPONSE_SENTINEL|sender\.private@example\.invalid/);
});

test('DM smoke failure log redacts private history response bodies', () => {
  const { result, output } = runSmoke('history-failure');

  assert.equal(result.status, 1);
  assert.match(output, /DM smoke sender message was missing from history\./);
  assert.doesNotMatch(output, /PRIVATE_HISTORY_RESPONSE_SENTINEL|dm smoke sender \d+/);
  assert.doesNotMatch(output, /sender\.private@example\.invalid|target\.private@example\.invalid/);
});
