import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('OAuthEmailChallengePanel keeps production auth loading while allowing deterministic harness injection', async () => {
  const source = await readFile(new URL('./OAuthEmailChallengePanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /interface OAuthEmailChallengeClient/);
  assert.match(source, /challengeClient\?: OAuthEmailChallengeClient/);
  assert.match(source, /^  challengeClient = null,$/m);
  assert.match(source, /challengeClient \?\? await loadAuthPublicModule\(\)/);
  assert.match(source, /await getChallengeClient\(\)/g);
  assert.match(source, /data-testid="oauth-email-error"/);
  assert.match(source, /data-testid="oauth-email-notice"/);
  assert.equal(source.match(/<div className="min-w-0 space-y-2">/g)?.length, 3);
  assert.match(source, /className="break-all text-body font-semibold"/);
});
