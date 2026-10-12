import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

type Job = {
  uses?: string;
  with: Record<string, string | number | boolean>;
  secrets?: 'inherit' | Record<string, string>;
};
type Step = { name: string; run?: string; env?: Record<string, string> };
type Workflow = {
  on: Record<string, { inputs: Record<string, { default?: string }> }>;
  jobs: Record<string, Job & { env: Record<string, string>; steps: Step[] }>;
};

function defineWorkflowTests(root: string, label: string) {
  const workflowDir = join(root, '.github/workflows');
  const readWorkflow = (file: string) => load(readFileSync(join(workflowDir, file), 'utf8')) as Workflow;
  const caller = readWorkflow('frontend-postdeploy-smoke.yml');
  const shared = readWorkflow('_frontend-postdeploy-suite.yml');
  const sharedJob = shared.jobs['run-suite'];
  const target = './.github/workflows/_frontend-postdeploy-suite.yml';
  const callers = Object.entries(caller.jobs).filter(([, job]) => job.uses === target);
  const defaults = Object.fromEntries(Object.entries(caller.on.workflow_dispatch.inputs)
    .map(([key, value]) => [key, value.default ?? '']));
  const render = (value: unknown, inputs: Record<string, string>, inheritSecrets = false): string => String(value).replace(
    /\$\{\{\s*(inputs|secrets)\.([\w]+)\s*\}\}/g,
    (_match, context: string, key: string) => context === 'secrets'
      ? inheritSecrets ? 'local-fixture' : ''
      : inputs[key] ?? '',
  );
  const phases = {
    validate_script: 'Validate workflow inputs',
    run_script: 'Run suite',
    summary_script: 'Publish suite summary',
  };
  const inputEnvironmentByCaller: Record<string, Record<string, string>> = {
    'auth-postdeploy-smoke': {
      api_base_url: 'API_BASE_URL',
      frontend_origin: 'FRONTEND_ORIGIN',
      timeout_ms: 'TIMEOUT_MS',
      run_dm_smoke: 'RUN_DM_SMOKE',
    },
    'seo-postdeploy-smoke': {
      base_url: 'BASE_URL',
      expected_site_url: 'EXPECTED_SITE_URL',
      timeout_ms: 'TIMEOUT_MS',
    },
    'home-widgets-postdeploy-smoke': {
      api_base_url: 'API_BASE_URL',
      date: 'DATE_INPUT',
    },
    'real-integration-smoke': {
      api_base_url: 'SMOKE_API_BASE_URL',
      frontend_origin: 'SMOKE_FRONTEND_ORIGIN',
      skip_signup: 'SKIP_SIGNUP_INPUT',
      run_dm_smoke: 'RUN_DM_SMOKE',
    },
    'dm-authenticated-smoke': {
      api_base_url: 'DM_API_BASE_URL',
      frontend_origin: 'DM_FRONTEND_ORIGIN',
      verify_unfollow_reuse: 'VERIFY_UNFOLLOW_REUSE',
    },
  };
  const phaseEnvironmentByCaller: Record<string, Record<keyof typeof phases, string[]>> = {
    'auth-postdeploy-smoke': {
      validate_script: ['API_BASE_URL', 'FRONTEND_ORIGIN', 'TIMEOUT_MS', 'RUN_DM_SMOKE'],
      run_script: ['API_BASE_URL', 'FRONTEND_ORIGIN', 'TIMEOUT_MS', 'RUN_DM_SMOKE'],
      summary_script: ['API_BASE_URL', 'FRONTEND_ORIGIN', 'RUN_DM_SMOKE'],
    },
    'seo-postdeploy-smoke': {
      validate_script: ['BASE_URL', 'EXPECTED_SITE_URL', 'TIMEOUT_MS'],
      run_script: ['BASE_URL', 'EXPECTED_SITE_URL', 'TIMEOUT_MS'],
      summary_script: ['BASE_URL', 'EXPECTED_SITE_URL'],
    },
    'home-widgets-postdeploy-smoke': {
      validate_script: ['API_BASE_URL', 'DATE_INPUT'],
      run_script: ['API_BASE_URL', 'DATE_INPUT'],
      summary_script: ['API_BASE_URL', 'DATE_INPUT'],
    },
    'real-integration-smoke': {
      validate_script: ['SMOKE_API_BASE_URL', 'SMOKE_FRONTEND_ORIGIN', 'SKIP_SIGNUP_INPUT', 'RUN_DM_SMOKE'],
      run_script: ['SMOKE_API_BASE_URL', 'SMOKE_FRONTEND_ORIGIN', 'SKIP_SIGNUP_INPUT', 'RUN_DM_SMOKE'],
      summary_script: ['SMOKE_API_BASE_URL', 'SMOKE_FRONTEND_ORIGIN', 'SKIP_SIGNUP_INPUT', 'RUN_DM_SMOKE'],
    },
    'dm-authenticated-smoke': {
      validate_script: ['DM_API_BASE_URL', 'DM_FRONTEND_ORIGIN', 'VERIFY_UNFOLLOW_REUSE'],
      run_script: ['DM_API_BASE_URL', 'DM_FRONTEND_ORIGIN', 'VERIFY_UNFOLLOW_REUSE'],
      summary_script: ['DM_API_BASE_URL', 'DM_FRONTEND_ORIGIN', 'VERIFY_UNFOLLOW_REUSE'],
    },
  };

  function harness(t: { after: (fn: () => void) => void }, job: Job, overrides: Record<string, string> = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'postdeploy-security-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const dispatch = { ...defaults, ...overrides };
    const inputs = Object.fromEntries(Object.entries(shared.on.workflow_call.inputs)
      .map(([key, value]) => [key, String(value.default ?? '')]));
    for (const [key, value] of Object.entries(job.with)) inputs[key] = render(value, dispatch);
    for (const subdir of ['bin', 'scripts', 'checkout/scripts', 'checkout/bega_frontend']) mkdirSync(join(dir, subdir), { recursive: true });
    const capture = join(dir, 'calls.jsonl');
    // Replace only the network-capable commands; exercise the real workflow shell.
    const recorder = `#!${process.execPath}
  const fs = require('node:fs');
  const keys = ['SMOKE_API_BASE_URL', 'SMOKE_FRONTEND_ORIGIN', 'SMOKE_SKIP_SIGNUP', 'DM_API_BASE_URL', 'DM_FRONTEND_ORIGIN', 'VERIFY_UNFOLLOW_REUSE'];
  fs.appendFileSync(process.env.CAPTURE, JSON.stringify({command: require('node:path').basename(process.argv[1]), args: process.argv.slice(2), env: Object.fromEntries(keys.map(key => [key, process.env[key]]))}) + '\\n');
  `;
    writeFileSync(join(dir, 'bin/npm'), recorder, { mode: 0o755 });
    writeFileSync(join(dir, 'scripts/run_dm_authenticated_smoke_ci.sh'), recorder, { mode: 0o755 });
    writeFileSync(join(dir, 'checkout/scripts/run_dm_authenticated_smoke_ci.sh'), recorder, { mode: 0o755 });
    const env: Record<string, string> = {
      PATH: `${join(dir, 'bin')}:/usr/bin:/bin`,
      TMPDIR: dir,
      CAPTURE: capture,
      GITHUB_ENV: join(dir, 'github-env'),
      GITHUB_STEP_SUMMARY: join(dir, 'summary'),
    };
    for (const [key, value] of Object.entries(sharedJob.env)) {
      env[key] = render(value, inputs, job.secrets === 'inherit');
    }
    const cwd = resolve(dir, 'checkout', String(job.with.working_directory));
    const execute = (script: string, extra: Record<string, string> = {}) => spawnSync(
      '/bin/bash', ['--noprofile', '--norc', '-euo', 'pipefail', '-c',
        // Ubuntu uses GNU sed; preserve its no-backup -i behavior on macOS.
        process.platform === 'darwin' ? script.replaceAll('sed -i -E ', "sed -i '' -E ") : script],
      { cwd, env: { ...env, ...extra }, encoding: 'utf8', timeout: 5000 },
    );
    // Model the old export step too, so the regression catches file-command injection.
    const exportStep = sharedJob.steps.find(step => step.name === 'Export suite environment');
    if (exportStep?.run && inputs.env_exports) {
      const extra = Object.fromEntries(Object.entries(exportStep.env ?? {})
        .map(([key, value]) => [key, render(value, inputs)]));
      assert.equal(execute(exportStep.run, extra).status, 0, 'environment export failed');
      for (const line of readFileSync(env.GITHUB_ENV, 'utf8').split('\n')) {
        const separator = line.indexOf('=');
        if (separator > 0) env[line.slice(0, separator)] = line.slice(separator + 1);
      }
    }
    return {
      env,
      run(phase: keyof typeof phases) {
        const step = sharedJob.steps.find(step => step.name === phases[phase]);
        assert.ok(step?.run, `missing ${phase} step`);
        const extra = Object.fromEntries(Object.entries(step.env ?? {})
          .map(([key, value]) => [key, render(value, inputs)]));
        return execute(step.run, extra);
      },
      markerExists: () => existsSync(join(cwd, 'bug041-executed')),
      summary: () => readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8'),
      calls: () => existsSync(capture) ? readFileSync(capture, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [],
    };
  }

  test(`${label}: all reusable postdeploy callers keep dispatch values out of shell source and environment files`, () => {
    let count = 0;
    for (const file of readdirSync(workflowDir).filter(file => /\.ya?ml$/.test(file))) {
      for (const [name, job] of Object.entries(readWorkflow(file).jobs ?? {})) {
        if (job.uses !== target) continue;
        count++;
        for (const phase of Object.keys(phases)) {
          assert.equal(/\$\{\{/.test(String(job.with[phase])), false, `${file}:${name}:${phase} interpolates code`);
        }
        assert.equal('env_exports' in job.with, false, `${file}:${name} exports raw environment lines`);
      }
    }
    assert.equal(count, 5);
    assert.equal(sharedJob.steps.some(step => /GITHUB_ENV/.test(step.run ?? '')), false);
    for (const step of sharedJob.steps) {
      assert.equal(/\$\{\{\s*inputs\./.test(step.run ?? ''), false, `${step.name} interpolates inputs in shell source`);
    }
  });

  test(`${label}: every caller input is forwarded through its matching environment variable`, () => {
    assert.deepEqual(Object.keys(inputEnvironmentByCaller).sort(), callers.map(([name]) => name).sort());
    for (const [name, job] of callers) {
      const inputEnvironment = inputEnvironmentByCaller[name];
      if (['auth-postdeploy-smoke', 'real-integration-smoke', 'dm-authenticated-smoke'].includes(name)) {
        assert.equal(job.secrets, 'inherit', `${name} does not forward its required credentials`);
      }
      for (const [input, environment] of Object.entries(inputEnvironment)) {
        assert.equal(job.with[input], `\${{ inputs.${input} }}`, `${name}:${input} is not explicitly forwarded`);
        assert.equal(sharedJob.env[environment], `\${{ inputs.${input} }}`, `${environment} does not read ${input}`);
      }

      for (const [phase, environmentNames] of Object.entries(phaseEnvironmentByCaller[name])) {
        const script = String(job.with[phase]);
        for (const environment of environmentNames) {
          assert.ok(script.includes(`\${${environment}}`), `${name}:${phase} does not read ${environment}`);
        }
      }
    }
  });

  for (const [name, job] of callers) {
    test(`${label}/${name}: valid inputs preserve smoke execution and summary`, t => {
      const h = harness(t, job);
      for (const phase of Object.keys(phases) as (keyof typeof phases)[]) {
        assert.equal(h.run(phase).status, 0, `${phase} failed`);
      }
      assert.equal(h.calls().length, 1);
      const call = h.calls()[0];
      const expected: Record<string, string[]> = {
        'auth-postdeploy-smoke': ['run', 'smoke:auth:public:prod', '--', '--api-base-url', defaults.api_base_url, '--frontend-origin', defaults.frontend_origin, '--timeout-ms', '15000'],
        'seo-postdeploy-smoke': ['run', 'seo:smoke:prod', '--', '--base-url', defaults.base_url, '--expected-site-url', defaults.expected_site_url, '--timeout-ms', '15000'],
        'home-widgets-postdeploy-smoke': ['run', 'smoke:home:contract:prod', '--', '--api-base-url', defaults.api_base_url],
        'real-integration-smoke': ['run', 'test:integration:real'],
        'dm-authenticated-smoke': [],
      };
      assert.deepEqual(call.args, expected[name]);
      if (name === 'real-integration-smoke') {
        assert.equal(call.env.SMOKE_API_BASE_URL, defaults.api_base_url);
        assert.equal(call.env.SMOKE_FRONTEND_ORIGIN, defaults.frontend_origin);
        assert.equal(call.env.SMOKE_SKIP_SIGNUP, '0');
      }
      if (name === 'dm-authenticated-smoke') {
        assert.equal(call.env.DM_API_BASE_URL, defaults.api_base_url);
        assert.equal(call.env.DM_FRONTEND_ORIGIN, defaults.frontend_origin);
        assert.equal(call.env.VERIFY_UNFOLLOW_REUSE, 'true');
      }
      assert.match(h.summary(), /Smoke/);
    });

    for (const phase of Object.keys(phases) as (keyof typeof phases)[]) {
      test(`${label}/${name}: hostile dispatch input is inert in ${phase}`, t => {
        const payloads = [
          'https://example.invalid/$(touch bug041-executed)',
          'https://example.invalid/`touch bug041-executed`',
          'https://example.invalid/"; touch bug041-executed; #',
          "https://example.invalid/'\nBUG041_POISON=injected\n",
        ];
        for (const value of payloads) {
          const overrides = Object.fromEntries(Object.keys(defaults).filter(key => key !== 'suite').map(key => [key, value]));
          const h = harness(t, job, overrides);
          const result = h.run(phase);
          assert.equal(h.markerExists(), false, 'dispatch value executed a shell command');
          assert.equal(h.env.BUG041_POISON, undefined, 'dispatch value injected an environment variable');
          if (phase !== 'validate_script') assert.equal(result.status, 0, `${phase} did not treat input as data`);
          if (phase === 'summary_script') assert.ok(h.summary().includes(value), 'summary lost literal input');
        }
      });
    }
  }

  for (const name of ['auth-postdeploy-smoke', 'real-integration-smoke']) {
    test(`${label}/${name}: optional DM smoke and required credentials retain their gates`, t => {
      const h = harness(t, caller.jobs[name], { run_dm_smoke: 'true', skip_signup: 'true' });
      assert.equal(h.run('validate_script').status, 0);
      assert.equal(h.run('run_script').status, 0);
      assert.equal(h.calls().length, 2);
      assert.equal(h.calls()[1].command, 'run_dm_authenticated_smoke_ci.sh');
      assert.equal(h.calls()[1].env.DM_API_BASE_URL, defaults.api_base_url);
      assert.equal(h.calls()[1].env.DM_FRONTEND_ORIGIN, defaults.frontend_origin);
      if (name === 'real-integration-smoke') assert.equal(h.calls()[0].env.SMOKE_SKIP_SIGNUP, '1');
      delete h.env.SMOKE_LOGIN_PASSWORD;
      assert.notEqual(h.run('validate_script').status, 0);
    });
  }

  test(`${label}: home smoke preserves an explicit date as one argument`, t => {
    const h = harness(t, caller.jobs['home-widgets-postdeploy-smoke'], { date: '2026-09-19' });
    assert.equal(h.run('validate_script').status, 0);
    assert.equal(h.run('run_script').status, 0);
    assert.deepEqual(h.calls()[0].args.slice(-2), ['--date', '2026-09-19']);
  });

  if (existsSync(join(root, 'scripts/dm_authenticated_smoke.sh'))) {
    test(`${label}: failed DM history checks keep private response bodies out of CI logs`, t => {
      const dir = mkdtempSync(join(tmpdir(), 'dm-log-redaction-'));
      t.after(() => rmSync(dir, { recursive: true, force: true }));
      const binDir = join(dir, 'bin');
      const reportDir = join(dir, 'reports');
      mkdirSync(binDir, { recursive: true });
      const fakeCurl = `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const outputIndex = args.indexOf('-o');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
const url = args.at(-1);
let body;
if (url.endsWith('/api/auth/login')) {
  body = JSON.stringify({ success: true });
} else if (url.endsWith('/follow-counts')) {
  body = JSON.stringify({ isFollowedByMe: true });
} else if (url.endsWith('/api/dm/rooms')) {
  body = JSON.stringify({ data: { roomId: 17 } });
} else if (url.endsWith('/api/dm/messages')) {
  const payload = JSON.parse(args[args.indexOf('-d') + 1]);
  body = JSON.stringify({ data: { roomId: payload.roomId, content: payload.content } });
} else if (url.endsWith('/api/dm/rooms/17/messages')) {
  body = JSON.stringify({ data: [{ content: 'PRIVATE_DM_BODY_SENTINEL', senderEmail: 'sender@example.test' }] });
} else {
  process.exit(3);
}
if (outputPath) fs.writeFileSync(outputPath, body);
else process.stdout.write(body);
if (outputPath && args.includes('-w')) process.stdout.write('200');
`;
      writeFileSync(join(binDir, 'curl'), fakeCurl, { mode: 0o755 });

      const result = spawnSync('/bin/bash', [join(root, 'scripts/run_dm_authenticated_smoke_ci.sh')], {
        cwd: root,
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          REPORT_DIR: reportDir,
          BASE_URL: 'http://smoke.invalid',
          CLIENT_ORIGIN: 'http://frontend.invalid',
          DM_SENDER_EMAIL: 'sender@example.test',
          DM_SENDER_PASSWORD: 'sender-password-sentinel',
          DM_TARGET_EMAIL: 'target@example.test',
          DM_TARGET_PASSWORD: 'target-password-sentinel',
          DM_TARGET_HANDLE: '@target',
          VERIFY_UNFOLLOW_REUSE: 'false',
        },
        encoding: 'utf8',
        timeout: 10_000,
      });

      assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
      const log = readFileSync(join(reportDir, 'dm-authenticated-smoke.log'), 'utf8');
      assert.match(log, /DM smoke sender message was missing from history\./);
      for (const privateValue of [
        'PRIVATE_DM_BODY_SENTINEL',
        'sender@example.test',
        'target@example.test',
        'sender-password-sentinel',
        'target-password-sentinel',
      ]) {
        assert.equal(log.includes(privateValue), false, `CI log leaked ${privateValue}`);
      }

      const authPostdeploy = caller.jobs['auth-postdeploy-smoke'];
      assert.ok(String(authPostdeploy.with.summary_script).includes('cat "reports/dm-authenticated-smoke.log"'));
      assert.ok(String(authPostdeploy.with.artifact_paths).includes('reports/dm-authenticated-smoke.log'));
    });
  }

}

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const monorepoRoot = resolve(frontendRoot, '..');
if (existsSync(join(monorepoRoot, '.github/workflows/_frontend-postdeploy-suite.yml'))) {
  defineWorkflowTests(monorepoRoot, 'monorepo');
} else {
  defineWorkflowTests(frontendRoot, 'standalone');
}
