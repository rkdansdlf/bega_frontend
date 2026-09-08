import assert from 'node:assert/strict';
import test from 'node:test';

import { FRANCHISE_TEAM_IDS, getTeamDescription } from './teams';

test('every canonical franchise id resolves to its own team description', () => {
  const fallback = getTeamDescription('unknown-team');

  for (const teamId of FRANCHISE_TEAM_IDS) {
    assert.notEqual(getTeamDescription(teamId), fallback, teamId);
  }
});

test('legacy team names resolve to the same description as canonical ids', () => {
  assert.equal(getTeamDescription('두산'), getTeamDescription('DB'));
  assert.equal(getTeamDescription('키움'), getTeamDescription('KH'));
  assert.equal(getTeamDescription('삼성'), getTeamDescription('SS'));
  assert.equal(getTeamDescription('롯데'), getTeamDescription('LT'));
  assert.equal(getTeamDescription('한화'), getTeamDescription('HH'));
});
