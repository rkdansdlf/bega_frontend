#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PROFILE_CONTRACT_PATH = fileURLToPath(new URL('../contracts/ui-ux-page-profiles-v1.json', import.meta.url));
const profileContract = JSON.parse(readFileSync(PROFILE_CONTRACT_PATH, 'utf8'));

export const UI_UX_PROFILE_IDS = profileContract.profiles.map((profile) => profile.id).sort();

const SHARED_PATTERNS = [
  'package.json',
  'package-lock.json',
  '.github/workflows/frontend-ui-qa.yml',
  '.github/workflows/_frontend-node-suite.yml',
  'tailwind.config.js',
  'src/index.css',
  'src/guidelines/**',
  'docs/VISUAL_QA.md',
  'src/visual-qa/**',
  'contracts/ui-ux-design-intent-v1.json',
  'contracts/ui-ux-page-profiles-v1.json',
  'contracts/ui-ux-pro-max-lock.json',
  'contracts/visual-qa-component-classifications-v1.json',
  'contracts/visual-qa-component-states-v1.json',
  'contracts/visual-qa-coverage-v1.json',
  'design-system/bega/MASTER.md',
  'design-system/bega/source.json',
  '.agents/skills/ui-ux-pro-max/**',
  'scripts/uiux-*.mjs',
  'scripts/visual-qa-design-intent.mjs',
];

const normalizePath = (value) => value.replaceAll('\\', '/').replace(/^bega_frontend\//, '');

const globToRegExp = (pattern) => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replaceAll('**', '\u0000').replaceAll('*', '[^/]*').replaceAll('\u0000', '.*')}$`);
};

const matches = (path, pattern) => globToRegExp(pattern).test(path);

export const resolveDesignIntentImpact = (changedPaths) => {
  const paths = changedPaths.map(normalizePath);
  const profiles = new Set();
  if (paths.some((path) => SHARED_PATTERNS.some((pattern) => matches(path, pattern)))) {
    return { changed: true, profiles: UI_UX_PROFILE_IDS };
  }

  for (const path of paths) {
    let matchedProfile = false;
    for (const profile of profileContract.profiles) {
      if (path === profile.file) {
        profiles.add(profile.id);
        matchedProfile = true;
        continue;
      }
      if (profile.match.some((pattern) => matches(path, pattern))) {
        profiles.add(profile.id);
        matchedProfile = true;
      }
    }
    if (!matchedProfile && matches(path, 'src/components/**')) {
      UI_UX_PROFILE_IDS.forEach((profile) => profiles.add(profile));
    }
  }

  const sortedProfiles = [...profiles].sort();
  return { changed: sortedProfiles.length > 0, profiles: sortedProfiles };
};

const main = () => {
  const changedFileArg = process.argv.find((argument) => argument.startsWith('--changed-file='));
  if (!changedFileArg) throw new Error('Provide --changed-file=/path/to/changed-files.txt');
  const changedFile = changedFileArg.slice('--changed-file='.length);
  const changedPaths = readFileSync(changedFile, 'utf8').split(/\r?\n/).filter(Boolean);
  const result = resolveDesignIntentImpact(changedPaths);
  const output = [
    `design_intent_changed=${result.changed ? 'true' : 'false'}`,
    `design_intent_profiles=${result.profiles.join(',')}`,
  ].join('\n');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
  else console.log(output);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(`[uiux-impact] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
