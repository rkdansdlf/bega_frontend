#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const profiles = JSON.parse(readFileSync(resolve(root, 'contracts/ui-ux-page-profiles-v1.json'), 'utf8'));
const lock = JSON.parse(readFileSync(resolve(root, 'contracts/ui-ux-pro-max-lock.json'), 'utf8'));

const main = () => {
  const args = process.argv.slice(2);
  const profileIndex = args.indexOf('--profile');
  if (profileIndex === -1 || !args[profileIndex + 1]) {
    throw new Error('Usage: --profile <id>');
  }
  if (args.some((arg) => ['--persist', '--output-dir', '--force'].some((flag) => arg === flag || arg.startsWith(`${flag}=`)))) {
    throw new Error('Design system recommendations are stdout-only; persistence flags are blocked.');
  }
  const profileId = args[profileIndex + 1];
  if (args.length !== 2) throw new Error('Only --profile is supported.');
  const profile = profiles.profiles.find((candidate) => candidate.id === profileId)
    ?? (profiles.masterProfile.id === profileId ? profiles.masterProfile : null);
  if (!profile) throw new Error(`Unknown UI UX page profile: ${profileId}`);
  const query = profile.recommendationQuery;
  const search = spawnSync('python3', [
    resolve(root, lock.vendorPath, 'scripts/search.py'),
    query,
    '--design-system',
    '--format', 'markdown',
    '--project-name', 'BEGA',
    ...(profile.dials ? [
      '--variance', String(profile.dials.variance),
      '--motion', String(profile.dials.motion),
      '--density', String(profile.dials.density),
    ] : []),
  ], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    maxBuffer: 8 * 1024 * 1024,
  });
  if (search.error) throw search.error;
  if (search.status !== 0) throw new Error(search.stderr.trim() || `Pro Max search exited with ${search.status}`);
  console.log(`<!-- advisory only · ${lock.repository}@${lock.commit} · profile=${profileId} -->`);
  console.log(search.stdout.trimEnd());
  console.log('\nBEGA decision: review against design-system/bega/MASTER.md and current tokens before adoption. No files were persisted.');
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(`[uiux:design-system] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
