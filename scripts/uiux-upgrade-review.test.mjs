import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import {
  buildUpgradeReview,
  diffAdoptedRules,
  diffRecommendations,
  executeUpgradeReview,
} from './uiux-upgrade-review.mjs';

const recommendation = (issue, description, category = 'Responsive') => ({
  Category: category,
  Issue: issue,
  Platform: 'Web',
  Description: description,
  Do: `Do ${issue}`,
  "Don't": `Avoid ${issue}`,
  Severity: 'Medium',
});

test('recommendation diff reports additions, removals, edits, and ordering changes per profile', () => {
  const diff = diffRecommendations([{
    profile: 'mate',
    query: 'mate flows',
    baseline: [recommendation('Touch targets', 'Keep controls large'), recommendation('Focus', 'Show keyboard focus')],
    candidate: [
      recommendation('Focus', 'Show keyboard focus'),
      recommendation('Touch targets', 'Keep targets at least 44px'),
      recommendation('Reduced motion', 'Respect user preference', 'Motion'),
    ],
  }]);

  assert.deepEqual(diff.summary, { added: 1, removed: 0, changed: 1, reorderedProfiles: 1 });
  assert.equal(diff.profiles[0].added[0].Issue, 'Reduced motion');
  assert.equal(diff.profiles[0].changed[0].id, 'responsive|touch targets|web#1');
  assert.equal(diff.profiles[0].reordered, true);
});

test('adopted rule diff tracks required-rule additions, removals, and changes', () => {
  const diff = diffAdoptedRules(
    { rules: [
      { id: 'touch', status: 'required', assertion: { width: 44 } },
      { id: 'focus', status: 'required', assertion: { type: 'visible' } },
    ] },
    { rules: [
      { id: 'touch', status: 'required', assertion: { width: 32 } },
      { id: 'focus', status: 'advisory', assertion: { type: 'visible' } },
      { id: 'motion', status: 'required', assertion: { reduced: true } },
    ] },
  );

  assert.deepEqual(diff.added.map((rule) => rule.id), ['motion']);
  assert.deepEqual(diff.removed.map((rule) => rule.id), ['focus']);
  assert.deepEqual(diff.changed.map((rule) => rule.id), ['touch']);
});

test('upgrade review compares snapshots and remains review-only without mutating contracts', () => {
  const review = buildUpgradeReview({
    baselineLock: { repository: 'nextlevelbuilder/ui-ux-pro-max-skill', commit: 'a'.repeat(40) },
    candidateLock: { repository: 'nextlevelbuilder/ui-ux-pro-max-skill', commit: 'b'.repeat(40) },
    recommendationSnapshots: [{
      profile: 'bega',
      query: 'baseball fan companion',
      baseline: [recommendation('Mobile First', 'Mobile first')],
      candidate: [recommendation('Mobile First', 'Design mobile first'), recommendation('Touch targets', 'Minimum target 44px')],
    }],
    baselineContract: { rules: [{ id: 'touch', status: 'required', assertion: { width: 44 } }] },
    currentContract: { rules: [{ id: 'touch', status: 'required', assertion: { width: 44 } }] },
    generatedAt: '2026-09-30T00:00:00.000Z',
  });

  assert.equal(review.reviewOnly, true);
  assert.equal(review.automaticAdoption, false);
  assert.equal(review.comparisonMethod.candidateCodeExecuted, false);
  assert.deepEqual(review.summary.recommendationChanges, {
    added: 1,
    removed: 0,
    changed: 1,
    reorderedProfiles: 0,
  });
  assert.deepEqual(review.begaAdoptedRuleDiff, { added: [], removed: [], changed: [] });
});

test('CLI verifies and reviews a local candidate archive without changing Design Intent contracts', async () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'uiux-upgrade-review-test-'));
  try {
    const candidateRoot = join(temporaryRoot, 'candidate');
    const scriptsRoot = join(candidateRoot, 'scripts');
    mkdirSync(scriptsRoot, { recursive: true });
    writeFileSync(join(candidateRoot, 'SKILL.md'), '# Fixture candidate\n');
    const markerPath = join(temporaryRoot, 'candidate-code-was-executed');
    writeFileSync(join(scriptsRoot, 'search.py'), [
      'from pathlib import Path',
      `Path(${JSON.stringify(markerPath)}).write_text('candidate code executed')`,
    ].join('\n'));
    const dataRoot = join(candidateRoot, 'data');
    mkdirSync(dataRoot, { recursive: true });
    writeFileSync(join(dataRoot, 'ux-guidelines.csv'), [
      'Category,Issue,Description,Platform,Do,Don\'t,Code Example Good,Code Example Bad,Severity',
      'Responsive,Mobile First,Design for mobile then enhance for larger,Web,Start with mobile styles,Desktop-first causing mobile issues,Default mobile,Desktop default,Medium',
    ].join('\n'));
    const archivePath = join(temporaryRoot, 'candidate.tar.gz');
    const candidateLockPath = join(temporaryRoot, 'candidate-lock.json');
    const candidateLock = {
      schemaVersion: 1,
      repository: 'nextlevelbuilder/ui-ux-pro-max-skill',
      commit: 'b'.repeat(40),
      snapshotDeclaredVersion: '2.14.0',
      archiveSha256: '',
    };
    const writeCandidateArchiveAndLock = () => {
      execFileSync('tar', ['-czf', archivePath, '-C', candidateRoot, '.']);
      candidateLock.archiveSha256 = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
      writeFileSync(candidateLockPath, JSON.stringify(candidateLock));
    };
    const baselineContractPath = join(temporaryRoot, 'baseline-contract.json');
    const currentContractPath = join(temporaryRoot, 'current-contract.json');
    const contract = { schemaVersion: 1, rules: [{ id: 'touch', status: 'required', assertion: { width: 44 } }] };
    const originalContractBytes = `${JSON.stringify(contract, null, 2)}\n`;
    writeFileSync(baselineContractPath, originalContractBytes);
    writeFileSync(currentContractPath, originalContractBytes);
    const outputPrefix = join(temporaryRoot, 'reports', 'upgrade-review');
    const runReview = () => executeUpgradeReview({
      root: process.cwd(),
      argv: [
        '--candidate-lock', candidateLockPath,
        '--candidate-archive', archivePath,
        '--baseline-contract', baselineContractPath,
        '--current-contract', currentContractPath,
        '--output-prefix', outputPrefix,
      ],
    });

    writeCandidateArchiveAndLock();
    await assert.rejects(runReview(), /must include skill\.json/);
    writeFileSync(join(candidateRoot, 'skill.json'), JSON.stringify({
      repository: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
      version: '2.14.0',
      commit: candidateLock.commit,
    }));
    writeCandidateArchiveAndLock();

    const result = await runReview();

    assert.equal(result.review.recommendationDiff.length, 9);
    assert.equal(result.review.snapshots.candidate.commit, 'b'.repeat(40));
    assert.equal(result.review.automaticAdoption, false);
    assert.equal(result.review.comparisonMethod.candidateCodeExecuted, false);
    assert.ok(result.review.summary.candidateSearchCodeChanges > 0);
    assert.equal(existsSync(markerPath), false);
    assert.equal(readFileSync(`${outputPrefix}.json`, 'utf8').includes('"reviewOnly": true'), true);
    assert.match(readFileSync(`${outputPrefix}.md`, 'utf8'), /Candidate commit source:.*not cryptographically authenticated/i);
    assert.match(readFileSync(`${outputPrefix}.md`, 'utf8'), /BEGA adopted-rule diff/);
    assert.equal(readFileSync(currentContractPath, 'utf8'), originalContractBytes);

    writeFileSync(join(candidateRoot, 'skill.json'), JSON.stringify({
      repository: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
      version: '2.99.0',
      commit: candidateLock.commit,
    }));
    writeCandidateArchiveAndLock();
    await assert.rejects(runReview(), /metadata does not match/);

    writeFileSync(join(candidateRoot, 'skill.json'), JSON.stringify({
      repository: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
      version: '2.14.0',
      commit: 'c'.repeat(40),
    }));
    writeCandidateArchiveAndLock();
    await assert.rejects(runReview(), /metadata does not match/);

    appendFileSync(archivePath, 'tampered');
    await assert.rejects(runReview(), /SHA-256/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('CLI rejects an oversized candidate archive before hashing it', async () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'uiux-upgrade-review-size-test-'));
  try {
    const archivePath = join(temporaryRoot, 'oversized.tar.gz');
    writeFileSync(archivePath, '');
    truncateSync(archivePath, 100 * 1024 * 1024 + 1);
    const candidateLockPath = join(temporaryRoot, 'candidate-lock.json');
    writeFileSync(candidateLockPath, JSON.stringify({
      schemaVersion: 1,
      repository: 'nextlevelbuilder/ui-ux-pro-max-skill',
      commit: 'b'.repeat(40),
      snapshotDeclaredVersion: '2.14.0',
      archiveSha256: 'a'.repeat(64),
    }));
    const baselineContractPath = join(temporaryRoot, 'baseline-contract.json');
    writeFileSync(baselineContractPath, JSON.stringify({ rules: [] }));

    await assert.rejects(executeUpgradeReview({
      root: process.cwd(),
      argv: [
        '--candidate-lock', candidateLockPath,
        '--candidate-archive', archivePath,
        '--baseline-contract', baselineContractPath,
      ],
    }), /input-size limit/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
