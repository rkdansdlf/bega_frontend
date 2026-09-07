import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateChatApprovedRuntime.tsx', import.meta.url);
const viewSourceUrl = new URL('./MateChatViewRuntime.tsx', import.meta.url);
const conversationSourceUrl = new URL('./MateChatConversationPanel.tsx', import.meta.url);

test('approved chat runtime exposes deterministic query and socket state only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /MateChatApprovedVisualQaStateOverride/);
  assert.match(source, /enabled: visualQaStateOverride == null/);
  assert.match(source, /enabled: visualQaStateOverride == null,/);
  assert.match(source, /if \(visualQaStateOverride\) \{\s*return;/);
  assert.match(source, /visualQaStateOverride\?\.isConnected \?\? liveIsConnected/);
});

test('approved chat fallback announces progress and stays inside 320px in both themes', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-chat-approved-runtime-fallback"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /aria-label="메이트 채팅 데이터 준비 중"/);
  assert.match(source, /min-h-dvh[^"\n]*min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /dark:bg-white\/10/);
});

test('approved chat runtime can isolate message loading, lazy fallback, and resolved view phases', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /viewPhase: 'messages-loading' \| 'runtime' \| 'view-fallback'/);
  assert.match(source, /viewPhase === 'messages-loading'/);
  assert.match(source, /viewPhase === 'view-fallback'/);
  assert.match(source, /nowIso/);
  assert.match(source, /visualQaStateOverride\?\.hasOlderMessages/);
  assert.match(source, /visualQaStateOverride\?\.isLoadingOlderMessages/);
});

test('approved chat resolved view preserves dark navigation contrast and unbroken message containment', async () => {
  const [viewSource, conversationSource] = await Promise.all([
    readFile(viewSourceUrl, 'utf8'),
    readFile(conversationSourceUrl, 'utf8'),
  ]);

  assert.match(viewSource, /className="mb-2 -ml-2[^"\n]*dark:text-white/);
  assert.match(conversationSource, /'flex min-w-0 w-full'/);
  assert.match(conversationSource, /'flex min-w-0 max-w-\[84%\] flex-col/);
  assert.match(conversationSource, /'min-w-0 max-w-full rounded-3xl/);
  assert.match(conversationSource, /whitespace-pre-wrap break-words \[overflow-wrap:anywhere\]/);
});
