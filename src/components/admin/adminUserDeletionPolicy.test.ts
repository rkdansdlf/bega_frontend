import assert from 'node:assert/strict';
import test from 'node:test';

import { isAdminUserDeletionBlocked } from './adminUserDeletionPolicy';

test('blocks self-deletion for every account role', () => {
  for (const role of ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN']) {
    assert.equal(isAdminUserDeletionBlocked(11, role, 11), true);
  }
});

test('fails closed while the current administrator identity is unavailable', () => {
  assert.equal(isAdminUserDeletionBlocked(22, 'ROLE_USER', null), true);
});

test('blocks administrator targets while keeping ordinary-user deletion available', () => {
  assert.equal(isAdminUserDeletionBlocked(22, 'ROLE_ADMIN', 11), true);
  assert.equal(isAdminUserDeletionBlocked(22, 'ROLE_SUPER_ADMIN', 11), true);
  assert.equal(isAdminUserDeletionBlocked(22, 'ROLE_UNKNOWN', 11), true);
  assert.equal(isAdminUserDeletionBlocked(22, 'ROLE_USER', 11), false);
});
