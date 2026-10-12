import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (relativePath: string) => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('mate public entry uses semantic surfaces and the shared control radius', async () => {
  const page = await readSource('./MatePage.tsx');
  const samples = await readSource('./MateGuestSampleList.tsx');

  for (const source of [page, samples]) {
    assert.doesNotMatch(source, /bg-gray-50|bg-white|text-gray-(?:500|700|900)/);
  }

  assert.match(page, /bg-background/);
  assert.match(page, /bg-card/);
  assert.match(page, /border-border/);
  assert.match(page, /text-muted-foreground/);
  assert.match(page, /variant="brand"/);
  assert.match(page, /variant="brandOutline"/);
  assert.doesNotMatch(page, /rounded-full/);
  assert.match(samples, /rounded-xl/);
  assert.match(samples, /bg-muted\/50/);
  assert.match(samples, /text-foreground/);
  assert.match(samples, /text-muted-foreground/);
});
