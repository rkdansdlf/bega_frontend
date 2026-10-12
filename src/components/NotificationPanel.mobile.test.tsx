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

test('bulk read sends a timestamp captured when the action is invoked', async () => {
  const source = await readFile(new URL('./NotificationPanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /const requestStartedAt = Date\.now\(\);[\s\S]*await markAllAsReadRequest\(requestStartedAt\);[\s\S]*markAllAsRead\(requestStartedAt\);/);
});

test('account-deletion mate notifications stay filterable and open their party', async () => {
  const source = await readFile(new URL('./NotificationPanel.tsx', import.meta.url), 'utf8');
  const mateTypes = source.match(/const MATE_NOTIFICATION_TYPES: NotificationType\[\] = \[([\s\S]*?)\];/)?.[1];

  assert.ok(mateTypes, 'mate notification category should be defined');
  assert.match(mateTypes, /'PARTY_CANCELLED_HOST_DELETED'/);
  assert.match(mateTypes, /'PARTY_PARTICIPANT_LEFT'/);
  assert.ok(
    (source.match(/MATE_NOTIFICATION_TYPES\.includes\(notification\.type\)/g) ?? []).length >= 2,
    'the mate category filter and click routing should share the complete mate notification types',
  );
  assert.match(source, /navigate\(`\/mate\/\$\{notification\.relatedId\}`\)/);
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
