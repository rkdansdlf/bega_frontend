#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const profiles = JSON.parse(readFileSync(resolve(root, 'contracts/ui-ux-page-profiles-v1.json'), 'utf8'));
const lock = JSON.parse(readFileSync(resolve(root, 'contracts/ui-ux-pro-max-lock.json'), 'utf8'));

export const parseUiUxQueryArgs = (args) => {
  const result = { profile: '', intent: '', domain: 'ux', stack: '' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--profile' || arg === '--intent' || arg === '--domain' || arg === '--stack') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      result[arg.slice(2)] = value;
      index += 1;
    } else if (arg.startsWith('--persist') || arg.startsWith('--output-dir') || arg === '--force') {
      throw new Error('Recommendation queries are read-only; persistence flags are blocked.');
    } else {
      throw new Error(`Unknown uiux:recommend option: ${arg}`);
    }
  }
  if (!result.profile || !result.intent) throw new Error('Usage: --profile <id> --intent <short query> [--domain <domain>]');
  return result;
};

export const resolveStackApplicability = (stack) => {
  if (stack !== 'react') return { status: 'not-applicable' };
  return {
    projectVersion: lock.projectStack.react,
    recommendationVersion: lock.reactRecommendationVersion,
    status: lock.guidanceApplicability.react,
  };
};

const main = () => {
  const options = parseUiUxQueryArgs(process.argv.slice(2));
  const profile = profiles.profiles.find((candidate) => candidate.id === options.profile)
    ?? (profiles.masterProfile.id === options.profile ? profiles.masterProfile : null);
  if (!profile) throw new Error(`Unknown UI UX page profile: ${options.profile}`);
  const query = `${profile.recommendationQuery} ${options.intent}`.trim();
  const searchPath = resolve(root, lock.vendorPath, 'scripts/search.py');
  const searchArgs = [searchPath, query, '--domain', options.domain, '--json', '--max-results', '5'];
  if (options.stack) searchArgs.push('--stack', options.stack);
  const search = spawnSync('python3', searchArgs, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    maxBuffer: 8 * 1024 * 1024,
  });
  if (search.error) throw search.error;
  if (search.status !== 0) throw new Error(search.stderr.trim() || `Pro Max search exited with ${search.status}`);
  let recommendations;
  try {
    recommendations = JSON.parse(search.stdout);
  } catch {
    throw new Error('Pinned Pro Max search returned invalid JSON.');
  }
  console.log(JSON.stringify({
    source: { repository: lock.repository, commit: lock.commit },
    profile: options.profile,
    query,
    projectStack: lock.projectStack,
    stack: options.stack || null,
    stackApplicability: resolveStackApplicability(options.stack),
    decision: 'advisory-review-required',
    recommendations,
  }, null, 2));
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(`[uiux:recommend] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
