import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('TeamRecommendationTest exposes deterministic screens and mobile-safe controls', async () => {
  const component = await readFile(new URL('./TeamRecommendationTest.tsx', import.meta.url), 'utf8');
  const hook = await readFile(new URL('../hooks/useTeamTest.ts', import.meta.url), 'utf8');
  const types = await readFile(new URL('../types/teamTest.ts', import.meta.url), 'utf8');

  assert.match(types, /export interface TeamTestInitialState/);
  assert.match(types, /initialState\?: TeamTestInitialState/);
  assert.match(hook, /initialState: TeamTestInitialState = \{\}/);
  assert.match(component, /useTeamTest\(onSelectTeam, onClose, initialState\)/);
  assert.match(component, /bodyClassName="relative max-h-\[80vh\] overflow-hidden p-4 sm:p-6"/);
  assert.match(component, /data-testid="team-test-close"/);
  assert.match(component, /h-11 w-11/);
  assert.match(component, /focus-visible:ring-2/);
  assert.match(component, /grid grid-cols-1 gap-2 sm:grid-cols-2/);
  assert.match(component, /data-testid=\{`team-test-answer-\$\{index\}`\}/);
  assert.match(component, /data-testid="team-test-result-accept"/);
  assert.match(component, /data-testid="team-test-result-reset"/);
});
