import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const loadSource = () => readFile(new URL('./ChatBotRuntime.tsx', import.meta.url), 'utf8');

test('ChatBotRuntime reads auth session instead of gating /home by route only', async () => {
  const source = await loadSource();
  assert.match(source, /import \{ useAuthSession \} from '\.\.\/store\/authStore';/);
  assert.match(source, /const shouldShowLoginGate = isPublicHomeRoute && !isLoggedIn;/);
});

test('ChatBotRuntime renders the login gate only for logged-out users after auth resolves', async () => {
  const source = await loadSource();
  assert.match(source, /\{shouldShowLoginGate && !isAuthLoading && isOpen && \(/);
  assert.doesNotMatch(source, /\{isPublicHomeRoute && isOpen && \(/);
});

test('ChatBotRuntime mounts the authenticated panel on /home when logged in', async () => {
  const source = await loadSource();
  assert.match(source, /if \(isOpen && !shouldShowLoginGate\) \{\s*setHasMountedAuthenticatedPanel\(true\);/);
  assert.doesNotMatch(source, /!isPublicHomeRoute\)/);
});
