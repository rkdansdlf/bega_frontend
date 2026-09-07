import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('ChatBotFloatingButton defaults to the compact mobile-safe size', async () => {
  const source = await readFile(new URL('./ChatBotFloatingButton.tsx', import.meta.url), 'utf8');

  assert.match(source, /compactOnMobile = true/);
  assert.match(source, /testId = 'chatbot-floating-button'/);
  assert.match(source, /\? 'h-12 w-12 sm:h-\[4\.5rem\] sm:w-\[4\.5rem\]'/);
});

test('ChatBotFloatingButton preserves the explicit large branch and visible focus offset', async () => {
  const source = await readFile(new URL('./ChatBotFloatingButton.tsx', import.meta.url), 'utf8');

  assert.match(source, /: 'h-16 w-16 sm:h-\[4\.5rem\] sm:w-\[4\.5rem\]'/);
  assert.match(source, /focus-visible:ring-offset-2/);
});
