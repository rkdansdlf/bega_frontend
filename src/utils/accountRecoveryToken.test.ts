import assert from 'node:assert/strict';
import test from 'node:test';
import { redactQueryTokens, withoutRecoveryToken } from './accountRecoveryToken';

test('recovery URLs remove every token while preserving redirect and fragment', () => {
  assert.equal(
    withoutRecoveryToken('/account/deletion/recovery', '?token=first&redirect=%2Fhome&token=second', '#section'),
    '/account/deletion/recovery?redirect=%2Fhome#section',
  );
  assert.equal(withoutRecoveryToken('/home', '?token=not-a-recovery-token'), '/home?token=not-a-recovery-token');
});

test('error text removes query token values before transmission', () => {
  const text = 'failed /account/deletion/recovery?token=secret&redirect=%2Fhome';
  assert.equal(redactQueryTokens(text), 'failed /account/deletion/recovery?token=[redacted]&redirect=%2Fhome');
  assert.doesNotMatch(redactQueryTokens(text), /secret/);
  assert.equal(redactQueryTokens('failed #token=fragment-secret&view=1'), 'failed #token=[redacted]&view=1');
  assert.equal(redactQueryTokens('{"token":"secret\\\"value","detail":"ok"}'), '{"token":"[redacted]","detail":"ok"}');
});

test('recovery fragments remove tokens while preserving other parameters', () => {
  assert.equal(
    withoutRecoveryToken('/account/deletion/recovery', '?redirect=%2Fhome', '#token=secret&view=1&token=second'),
    '/account/deletion/recovery?redirect=%2Fhome#view=1',
  );
});

test('encoded and repeated trailing slash recovery paths are sanitized', () => {
  assert.equal(withoutRecoveryToken('/account/deletion/%72ecovery', '?token=secret'), '/account/deletion/%72ecovery');
  assert.equal(withoutRecoveryToken('/account/deletion/recovery//', '?token=secret'), '/account/deletion/recovery//');
});
