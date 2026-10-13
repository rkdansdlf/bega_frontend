import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (name: string) => readFileSync(
  new URL(`./cheer/${name}`, import.meta.url),
  'utf8',
);

test('cheer comments keep long authors and unbroken bodies inside the detail column', () => {
  const source = readSource('CommentItem.tsx');

  assert.match(source, /className="min-w-0 flex-1"/);
  assert.match(source, /className="min-w-0 max-w-full"/);
  assert.match(source, /className="max-w-full break-words font-bold[^"]*\[overflow-wrap:anywhere\]"/);
  assert.match(source, /className="mt-2 max-w-full whitespace-pre-wrap break-words[^"]*\[overflow-wrap:anywhere\]"/);
});

