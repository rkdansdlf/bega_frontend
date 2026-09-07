import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('cheer theme control accepts deterministic active and resolved theme state', async () => {
  const source = await readFile(new URL('./CheerThemeControl.tsx', import.meta.url), 'utf8');

  assert.match(source, /themeStateOverride\?: CheerThemeControlState/);
  assert.match(source, /onThemeChangeOverride\?: \(theme: Theme\) => void/);
  assert.match(source, /themeStateOverride \?\? liveThemeState/);
});

test('cheer theme options keep 44px mobile targets and visible keyboard focus', async () => {
  const source = await readFile(new URL('./CheerThemeControl.tsx', import.meta.url), 'utf8');

  assert.match(source, /min-h-11/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /data-testid=\{`cheer-theme-option-\$\{option.value\}`\}/);
  assert.match(source, /getLightModeAccentText\(accentColor\)/);
});
