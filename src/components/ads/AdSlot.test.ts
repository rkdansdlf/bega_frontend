import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('AdSlot keeps production ad services while allowing deterministic harness runtime injection', async () => {
  const source = await readFile(new URL('./AdSlot.tsx', import.meta.url), 'utf8');

  assert.match(source, /interface AdSlotRuntime/);
  assert.match(source, /runtime\?: AdSlotRuntime \| null/);
  assert.match(source, /^  runtime = null,$/m);
  assert.match(source, /runtime\?\.adClient \?\? getAdSenseClient\(\)/);
  assert.match(source, /runtime\?\.loadScript \?\? loadAdSenseScript/);
  assert.match(source, /runtime\?\.requestFill \?\? requestAdSenseFill/);
  assert.match(source, /runtime\?\.trackEvent \?\? trackAdEvent/);
  assert.match(source, /<span className="shrink-0">광고<\/span>/);
  assert.match(source, /<span className="min-w-0 truncate text-right">\{slotId\}<\/span>/);
});
