import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('notification panel accepts deterministic data, tab, permission, time, and runtime state', async () => {
  const source = await readFile(new URL('./NotificationPanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /notificationsOverride\?: readonly Notification\[\]/);
  assert.match(source, /initialActiveTabOverride\?: TabType/);
  assert.match(source, /browserPermissionOverride\?: BrowserNotificationPermission/);
  assert.match(source, /nowOverride\?: string/);
  assert.match(source, /runtimeOverride\?: NotificationPanelRuntime/);
  assert.match(source, /notificationsOverride === undefined && isLoggedIn/);
  assert.match(source, /notificationsOverride \?\? liveNotifications/);
});

test('notification panel keeps every mobile action reachable without overlap', async () => {
  const source = await readFile(new URL('./NotificationPanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="notification-panel"/);
  assert.match(source, /data-testid=\{`notification-item-\$\{notification\.id\}`\}/);
  assert.match(source, /data-testid=\{`notification-delete-\$\{notification\.id\}`\}/);
  assert.match(source, /min-h-11 min-w-11/);
  assert.match(source, /opacity-100 sm:opacity-0/);
  assert.match(source, /break-words \[overflow-wrap:anywhere\]/);
  assert.match(source, /focus-visible:ring-2/);
  assert.doesNotMatch(source, /<div\s+key=\{notification\.id\}\s+onClick=/);
});

test('notification panel mobile header wraps tabs and full-count actions safely', async () => {
  const source = await readFile(new URL('./NotificationPanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="notification-tabs"/);
  assert.match(source, /grid-cols-3/);
  assert.match(source, /data-testid="notification-mark-all-read"/);
  assert.match(source, /data-testid="notification-enable-browser"/);
  assert.match(source, /flex-col.*sm:flex-row/);
  assert.doesNotMatch(source, /'오늘': \[\],\s*'오늘': \[\]/);
});
