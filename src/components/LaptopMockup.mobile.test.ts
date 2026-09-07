import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readComponent = () => readFile(new URL('./LaptopMockup.tsx', import.meta.url), 'utf8');
const readStyles = () => readFile(new URL('./LandingFeaturesRuntime.css', import.meta.url), 'utf8');

test('LaptopMockup contains stress copy and terminal image failures', async () => {
  const [source, styles] = await Promise.all([readComponent(), readStyles()]);

  assert.match(source, /data-testid="landing-laptop-image"/);
  assert.match(source, /target\.dataset\.fallbacked !== '1' && sourceImage !== fallbackImage/);
  assert.match(source, /target\.hidden = true/);
  assert.match(styles, /\.landing-preview-shell\s*\{[^}]*max-width:\s*100%/s);
  assert.match(styles, /\.landing-preview-header span[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(styles, /\.landing-preview-header p[\s\S]*overflow-wrap:\s*anywhere/);
});
