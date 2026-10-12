import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('a successful block action reconciles follow state without changing reverse-block state', async () => {
  const [blockButtonSource, followButtonSource, profileModalSource] = await Promise.all([
    readFile(new URL('./BlockButton.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./FollowButton.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./UserProfileModal.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(
    blockButtonSource,
    /setIsBlocked\(response\.blocked\);\s*onBlockChange\?\.\(response\);/,
  );

  const handleBlockChange = profileModalSource.match(
    /const handleBlockChange = \([\s\S]*?=> \{([\s\S]*?)\n    \};/,
  )?.[1];
  assert.ok(handleBlockChange, 'profile modal should reconcile successful block changes');
  assert.match(handleBlockChange, /blockedByMe: response\.blocked/);
  assert.match(handleBlockChange, /isFollowedByMe: false, notifyNewPosts: false/);
  assert.match(handleBlockChange, /void loadFollowCountsByHandle\(/);
  assert.doesNotMatch(handleBlockChange, /blockingMe\s*:/);

  assert.match(
    followButtonSource,
    /setIsFollowing\(initialFollowing\);[\s\S]*?\}, \[initialFollowing, viewerScope\]\);/,
  );
});
