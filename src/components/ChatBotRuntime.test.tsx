import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as moduleApi from 'node:module';
import test from 'node:test';
import React, { createElement } from 'react';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/test-chatbot-icon.png";',
      };
    }

    if (url.endsWith('.css')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default {};',
      };
    }

    return nextLoad(url, context);
  },
});

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (String(args[0]).startsWith('Warning: useLayoutEffect does nothing on the server')) {
    return;
  }
  originalConsoleError(...args);
};

// React.useSyncExternalStore in SSR defaults to getServerSnapshot (initial state).
// Route it to getSnapshot so store updates via useAuthStore.setState() are reflected during renderToStaticMarkup.
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();

const { renderToStaticMarkup } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router-dom');
const { default: ChatBotRuntime } = await import('./ChatBotRuntime');
const { useAuthStore } = await import('../store/authStore');

const loadSource = () => readFile(new URL('./ChatBotRuntime.tsx', import.meta.url), 'utf8');

const validUser = {
  id: 1,
  email: 'tester@example.com',
  name: '테스터',
};

const renderHomeChatBot = () => renderToStaticMarkup(
  createElement(
    MemoryRouter,
    { initialEntries: ['/home'] },
    createElement(ChatBotRuntime, { autoOpen: true }),
  ),
);

const countPanelInstances = (html: string) => (html.match(/data-testid="chatbot-panel"/g) || []).length;
const hasAuthenticatedPanelSignal = (html: string) =>
  /(?:챗봇을 준비하는 중입니다|챗봇 패널을 불러오는 중입니다)/.test(html);

test('ChatBotRuntime logged in renders authenticated panel fallback without login gate', () => {
  useAuthStore.setState({ user: validUser, isAuthLoading: false });
  const html = renderHomeChatBot();

  assert.doesNotMatch(html, /로그인이 필요합니다/);
  assert.equal(hasAuthenticatedPanelSignal(html), true);
  assert.equal(countPanelInstances(html), 1);
});

test('ChatBotRuntime logged out renders login gate only', () => {
  useAuthStore.setState({ user: null, isAuthLoading: false });
  const html = renderHomeChatBot();

  assert.match(html, /로그인이 필요합니다/);
  assert.equal(hasAuthenticatedPanelSignal(html), false);
  assert.equal(countPanelInstances(html), 1);
});

test('ChatBotRuntime loading renders neither gate nor panel on /home', () => {
  useAuthStore.setState({ user: null, isAuthLoading: true });
  const html = renderHomeChatBot();

  assert.doesNotMatch(html, /로그인이 필요합니다/);
  assert.equal(hasAuthenticatedPanelSignal(html), false);
  assert.equal(countPanelInstances(html), 0);
});

test('ChatBotRuntime simulates logged in -> logout rendering gate only with exactly one panel', () => {
  useAuthStore.setState({ user: validUser, isAuthLoading: false });
  const loggedInHtml = renderHomeChatBot();
  assert.doesNotMatch(loggedInHtml, /로그인이 필요합니다/);
  assert.equal(hasAuthenticatedPanelSignal(loggedInHtml), true);
  assert.equal(countPanelInstances(loggedInHtml), 1);

  useAuthStore.setState({ user: null, isAuthLoading: false });
  const loggedOutHtml = renderHomeChatBot();
  assert.match(loggedOutHtml, /로그인이 필요합니다/);
  assert.equal(hasAuthenticatedPanelSignal(loggedOutHtml), false);
  assert.equal(countPanelInstances(loggedOutHtml), 1);
});

test('ChatBotRuntime source ensures authenticated panel render condition includes !shouldShowLoginGate', async () => {
  const source = await loadSource();
  assert.match(source, /import \{ useAuthSession \} from '\.\.\/store\/authStore';/);
  assert.match(source, /const shouldShowLoginGate = isPublicHomeRoute && !isLoggedIn;/);
  assert.match(source, /\{hasMountedAuthenticatedPanel && !shouldShowLoginGate && \(/);
  assert.match(source, /if \(shouldShowLoginGate\) \{\s*setHasMountedAuthenticatedPanel\(false\);/);
  assert.match(source, /\{shouldShowLoginGate && !isAuthLoading && isOpen && \(/);
});
