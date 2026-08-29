import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(new URL('./VisualQaHarnessApp.tsx', import.meta.url), 'utf8');

test('component-state scenarios reset and pin their declared theme', async () => {
  const source = await readSource();

  assert.match(source, /<ThemeProvider[^>]*key=\{scenario\.id\}/s);
  assert.match(source, /defaultTheme=\{renderResult\.theme \?\? 'system'\}/);
});

test('component-state scenarios may mount a deterministic harness companion', async () => {
  const source = await readSource();

  assert.match(source, /renderResult\.companion/);
});
