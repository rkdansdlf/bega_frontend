import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('ErrorFeedbackPanel keeps production submission while allowing deterministic harness injection', async () => {
  const source = await readFile(new URL('./ErrorFeedbackPanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /submitFeedback\?: \(input:/);
  assert.match(source, /^  submitFeedback,$/m);
  assert.match(source, /submitFeedback \?\? submitClientErrorFeedback/);
  assert.match(source, /data-testid="error-feedback"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-busy=\{isSubmitting\}/);
});
