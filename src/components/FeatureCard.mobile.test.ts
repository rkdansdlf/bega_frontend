import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readComponent = () => readFile(new URL('./FeatureCard.tsx', import.meta.url), 'utf8');

test('FeatureCard contains long card and guide copy inside a mobile flex layout', async () => {
  const source = await readComponent();

  assert.match(source, /className="min-w-0 flex-1"/);
  assert.match(source, /ds-card-title min-w-0 break-words text-left/);
  assert.match(source, /text-body break-words leading-6 text-muted-foreground/);
  assert.match(source, /className="min-w-0 break-words pt-0\.5"/);
  assert.match(source, /landing-feature-mobile-image[^"\n]*max-w-full/);
  assert.match(source, /target\.dataset\.fallbacked !== '1' && imageSource !== fallbackImage/);
  assert.match(source, /target\.hidden = true/);
});
