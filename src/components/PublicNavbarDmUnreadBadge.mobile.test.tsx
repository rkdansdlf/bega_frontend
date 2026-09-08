import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('PublicNavbarDmUnreadBadge renders bounded unread count branches deterministically', async () => {
  const source = await readFile(new URL('./PublicNavbarDmUnreadBadge.tsx', import.meta.url), 'utf8');

  assert.match(source, /unreadCountOverride\?: number/);
  assert.match(source, /stateOverride\?: 'error' \| 'loading'/);
  assert.match(source, /stateOverride !== undefined \|\| dmUnreadCount <= 0/);
  assert.match(source, /dmUnreadCount > 99 \? '99\+' : dmUnreadCount/);
  assert.match(source, /data-testid="public-navbar-dm-unread-badge-empty"/);
});

test('PublicNavbarDmUnreadBadge remains compact and non-blocking on mobile', async () => {
  const source = await readFile(new URL('./PublicNavbarDmUnreadBadge.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="public-navbar-dm-unread-badge"/);
  assert.match(source, /pointer-events-none/);
  assert.match(source, /max-w-7/);
  assert.match(source, /aria-label=.*개의 읽지 않은 메시지/);
  assert.match(source, /enabled: unreadCountOverride === undefined/);
});
