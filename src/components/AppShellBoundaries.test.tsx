import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (fileName: string) => readFileSync(
  new URL(fileName, import.meta.url),
  'utf8',
);

test('app browser and runtime shells expose deterministic harness seams without replacing defaults', () => {
  const browserShell = readSource('./AppBrowserShell.tsx');
  assert.match(browserShell, /if \(import\.meta\.env\.DEV\)/);
  assert.match(browserShell, /routerOverride/);
  assert.match(browserShell, /runtimeOverride/);
  assert.match(browserShell, /routerOverride \? routerOverride\(content\) : <BrowserRouter>/);
  assert.match(browserShell, /runtimeOverride \?\? <AppShellRuntime \/>/);

  const appShell = readSource('./AppShellRuntime.tsx');
  assert.match(appShell, /phaseOverride === 'fallback'/);
  assert.match(appShell, /phaseOverride === 'resolved'/);
  assert.match(appShell, /runtimeOverride/);
  assert.match(appShell, /<AuthSessionBoundary>/);

  const authSessionBoundary = readSource('./AuthSessionBoundary.tsx');
  assert.match(authSessionBoundary, /import\.meta\.env\.DEV && stateOverride !== undefined/);
});

test('auth bootstrap gate keeps deterministic seams development-only', () => {
  const authBootstrapGate = readSource('./AuthBootstrapGate.tsx');
  assert.match(authBootstrapGate, /import\.meta\.env\.DEV && props\.shouldMountOverride !== undefined/);
  assert.match(authBootstrapGate, /if \(!props\.shouldMountOverride\)/);
  assert.match(authBootstrapGate, /props\.runtimeOverride !== undefined/);
  assert.match(authBootstrapGate, /else if \(shouldSkipAuthBootstrap\(pathname\)\)/);
});
