import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readStyles = () => readFile(
  new URL('../auth/auth-layout.css', import.meta.url),
  'utf8',
);

test('auth primitive layout preserves notched viewport insets', async () => {
  const styles = await readStyles();

  assert.match(styles, /env\(safe-area-inset-top\)/);
  assert.match(styles, /env\(safe-area-inset-right\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /env\(safe-area-inset-left\)/);
});

test('auth primitive containers let nested content shrink and wrap on mobile', async () => {
  const styles = await readStyles();

  assert.match(styles, /\.auth-form-panel[^}]*min-width:\s*0/s);
  assert.match(styles, /\.auth-form-flow,[^}]*\.auth-status-panel[^}]*min-width:\s*0/s);
  assert.match(styles, /\.auth-title,[^}]*\.auth-status-panel\s*>\s*\*[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(styles, /\.auth-title\s*\{[^}]*word-break:\s*keep-all/s);
  assert.match(styles, /\.auth-field-group\s*>\s*\*,[^}]*\.auth-action-group\s*>\s*\*[^}]*max-width:\s*100%/s);
});
