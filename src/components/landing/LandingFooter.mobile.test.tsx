import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('landing footer uses real navigation and mobile-safe touch targets', async () => {
  const source = await readFile(new URL('./LandingFooter.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../Landing.css', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /href="#"/);
  assert.match(source, /to: '\/home'/);
  assert.match(source, /to: '\/prediction'/);
  assert.match(source, /to: '\/stadium'/);
  assert.match(source, /to: '\/leaderboard'/);
  assert.match(source, /mailto:baseballguide251021@gmail\.com/);
  assert.match(source, /inline-flex min-h-11 min-w-11 items-center/);
  assert.doesNotMatch(styles, /\.landing-footer-group-links a,[\s\S]*?min-height: 44px;/);
});
