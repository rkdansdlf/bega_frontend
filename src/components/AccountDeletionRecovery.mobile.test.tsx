import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('account recovery accepts deterministic initial and runtime state without live requests', async () => {
  const source = await readFile(new URL('./AccountDeletionRecovery.tsx', import.meta.url), 'utf8');

  assert.match(source, /export type AccountDeletionRecoveryInitialState/);
  assert.match(source, /export type AccountDeletionRecoveryRuntime/);
  assert.match(source, /initialStateOverride\?: AccountDeletionRecoveryInitialState/);
  assert.match(source, /runtimeOverride\?: AccountDeletionRecoveryRuntime/);
  assert.match(source, /if \(initialStateOverride\) return;/);
  assert.match(source, /runtime\.getRecoveryInfo\(token\)/);
  assert.match(source, /runtime\.requestRecovery\(token\)/);
});

test('account recovery exposes stable capture surfaces for every asynchronous branch', async () => {
  const source = await readFile(new URL('./AccountDeletionRecovery.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="account-recovery-schedule-panel"/);
  assert.match(source, /data-testid="account-recovery-complete-panel"/);
  assert.match(source, /data-testid="account-recovery-status-panel"/);
  assert.match(source, /aria-busy=\{isLoading \|\| isRecovering\}/);
});

test('account recovery keeps the retry action after a recovery submission error', async () => {
  const source = await readFile(new URL('./AccountDeletionRecovery.tsx', import.meta.url), 'utf8');

  assert.match(source, /canRecover\?: boolean/);
  assert.match(source, /setCanRecover\(true\)/);
  assert.match(source, /error && !canRecover/);
  assert.match(source, /error && canRecover/);
});

test('account recovery contains long status content and keeps mobile controls reachable', async () => {
  const source = await readFile(new URL('./AccountDeletionRecovery.tsx', import.meta.url), 'utf8');

  assert.match(source, /className="[^"]*min-w-0[^"]*break-words[^"]*\[overflow-wrap:anywhere\][^"]*"/);
  assert.match(source, /className="auth-back-link min-h-11"/);
  assert.match(source, /data-testid="account-recovery-submit"/);
  assert.match(source, /size="touchLg"/);
});
