import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('navbar notification controls accept deterministic open, unread, and panel states', async () => {
  const source = await readFile(new URL('./NavbarNotificationControls.tsx', import.meta.url), 'utf8');

  assert.match(source, /openOverride\?: boolean/);
  assert.match(source, /unreadCountOverride\?: number/);
  assert.match(source, /onOpenChangeOverride\?: \(open: boolean\) => void/);
  assert.match(source, /panelContentOverride\?: ReactNode/);
  assert.match(source, /unreadCountOverride \?\? liveUnreadCount/);
});

test('navbar notification trigger and badge stay compact and reachable on mobile', async () => {
  const source = await readFile(new URL('./NavbarNotificationControls.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="navbar-notification-trigger"/);
  assert.match(source, /relative inline-flex min-h-11 min-w-11/);
  assert.match(source, /data-testid="navbar-notification-unread-badge"/);
  assert.match(source, /pointer-events-none/);
  assert.match(source, /max-w-7/);
  assert.match(source, /unreadCount > 99 \? '99\+' : unreadCount/);
  assert.match(source, /focus-visible:ring-2/);
});

test('navbar notification popover exposes a bounded mobile surface and count copy', async () => {
  const source = await readFile(new URL('./NavbarNotificationControls.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="navbar-notification-popover"/);
  assert.match(source, /min-w-0/);
  assert.match(source, /break-words/);
  assert.match(source, /data-testid="navbar-notification-panel-fallback"/);
});
