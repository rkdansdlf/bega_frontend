import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(new URL('./sonner.tsx', import.meta.url), 'utf8');
const readStyles = () => readFile(new URL('../index.css', import.meta.url), 'utf8');

test('toast viewport geometry respects mobile safe areas and hostile copy', async () => {
  const source = await readSource();

  for (const edge of ['top', 'right', 'bottom', 'left']) {
    assert.match(source, new RegExp(`env\\(safe-area-inset-${edge}\\)`));
  }
  assert.match(source, /overflowWrap: 'anywhere'/);
  assert.match(source, /maxWidth: 'min\(420px, calc\(100vw - max\(12px,/);
});

test('toast close control keeps a touch target and visible pointer or keyboard feedback', async () => {
  const [source, styles] = await Promise.all([readSource(), readStyles()]);

  assert.match(source, /className="bega-toast-close"/);
  assert.match(source, /width: 44/);
  assert.match(source, /height: 44/);
  assert.match(styles, /\.bega-toast-close:hover/);
  assert.match(styles, /\.bega-toast-close:active/);
  assert.match(styles, /\.bega-toast-close:focus-visible/);
});
