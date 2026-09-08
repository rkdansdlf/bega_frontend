import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('TeamLogo contains large and fallback content inside a circular mobile-safe surface', async () => {
  const source = await readFile(new URL('./TeamLogo.tsx', import.meta.url), 'utf8');

  assert.match(source, /const resolvedNumericSize =/);
  assert.match(source, /Number\.isFinite\(numericSize\)/);
  assert.match(source, /maxWidth: '100%'/);
  assert.match(source, /aspectRatio: '1 \/ 1'/);
  assert.match(source, /shrink-0[^"'`]*overflow-hidden/);
  assert.match(source, /role="img"/);
  assert.match(source, /aria-label=\{`\$\{fallbackLabel\} 팀 로고`\}/);
  assert.match(source, /WebkitLineClamp: 2/);
  assert.match(source, /width: '100%'/);
  assert.match(source, /height: '100%'/);
});
