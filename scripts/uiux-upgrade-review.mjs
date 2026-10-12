#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const maxArchiveBytes = 100 * 1024 * 1024;
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const recommendationBaseId = (recommendation) => [
  recommendation.Category,
  recommendation.Issue,
  recommendation.Platform,
].map((value) => String(value ?? '').trim().toLowerCase()).join('|');

const indexRecommendations = (recommendations) => {
  const occurrences = new Map();
  return recommendations.map((recommendation) => {
    const baseId = recommendationBaseId(recommendation);
    const occurrence = occurrences.get(baseId) ?? 0;
    occurrences.set(baseId, occurrence + 1);
    return { id: `${baseId}#${occurrence + 1}`, recommendation };
  });
};

export const diffRecommendations = (snapshots) => {
  const profiles = snapshots.map(({ profile, query, baseline, candidate }) => {
    const oldItems = indexRecommendations(baseline ?? []);
    const newItems = indexRecommendations(candidate ?? []);
    const oldById = new Map(oldItems.map((item) => [item.id, item.recommendation]));
    const newById = new Map(newItems.map((item) => [item.id, item.recommendation]));
    const added = newItems.filter((item) => !oldById.has(item.id));
    const removed = oldItems.filter((item) => !newById.has(item.id));
    const changed = newItems.flatMap((item) => {
      const previous = oldById.get(item.id);
      return previous && stableStringify(previous) !== stableStringify(item.recommendation)
        ? [{ id: item.id, baseline: previous, candidate: item.recommendation }]
        : [];
    });
    const oldSharedOrder = oldItems.map((item) => item.id).filter((id) => newById.has(id));
    const newSharedOrder = newItems.map((item) => item.id).filter((id) => oldById.has(id));
    const reordered = oldSharedOrder.some((id, index) => id !== newSharedOrder[index]);
    return {
      profile,
      query,
      counts: { added: added.length, removed: removed.length, changed: changed.length, reordered: Number(reordered) },
      added: added.map((item) => ({ id: item.id, ...item.recommendation })),
      removed: removed.map((item) => ({ id: item.id, ...item.recommendation })),
      changed,
      reordered,
      baselineOrder: oldItems.map((item) => item.id),
      candidateOrder: newItems.map((item) => item.id),
    };
  });

  return {
    profiles,
    summary: {
      added: profiles.reduce((total, profile) => total + profile.counts.added, 0),
      removed: profiles.reduce((total, profile) => total + profile.counts.removed, 0),
      changed: profiles.reduce((total, profile) => total + profile.counts.changed, 0),
      reorderedProfiles: profiles.filter((profile) => profile.reordered).length,
    },
  };
};

const adoptedRulesById = (contract) => new Map((contract.rules ?? [])
  .filter((rule) => rule.status === 'required')
  .map((rule) => [rule.id, rule]));

export const diffAdoptedRules = (baselineContract, currentContract) => {
  const baseline = adoptedRulesById(baselineContract);
  const current = adoptedRulesById(currentContract);
  const added = [...current.entries()]
    .filter(([id]) => !baseline.has(id))
    .map(([, rule]) => rule)
    .sort((left, right) => left.id.localeCompare(right.id));
  const removed = [...baseline.entries()]
    .filter(([id]) => !current.has(id))
    .map(([, rule]) => rule)
    .sort((left, right) => left.id.localeCompare(right.id));
  const changed = [...current.entries()]
    .flatMap(([id, rule]) => {
      const previous = baseline.get(id);
      return previous && stableStringify(previous) !== stableStringify(rule)
        ? [{ id, baseline: previous, current: rule }]
        : [];
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  return { added, removed, changed };
};

export const buildUpgradeReview = ({
  baselineLock,
  candidateLock,
  recommendationSnapshots,
  baselineContract,
  currentContract,
  candidateSearchCodeChanges = [],
  generatedAt = new Date().toISOString(),
}) => {
  const recommendationDiff = diffRecommendations(recommendationSnapshots);
  const adoptedRuleDiff = diffAdoptedRules(baselineContract, currentContract);
  return {
    schemaVersion: 1,
    generatedAt,
    reviewOnly: true,
    automaticAdoption: false,
    snapshots: {
      baseline: {
        repository: baselineLock.repository,
        commit: baselineLock.commit,
        version: baselineLock.snapshotDeclaredVersion,
      },
      candidate: {
        repository: candidateLock.repository,
        commit: candidateLock.commit,
        commitSource: 'candidate lock and archive skill.json; consistency-checked but not cryptographically authenticated',
        version: candidateLock.snapshotDeclaredVersion,
        archiveSha256: candidateLock.archiveSha256,
      },
    },
    comparisonMethod: {
      engine: 'installed pinned baseline search implementation',
      candidateCodeExecuted: false,
      candidateDataFile: 'data/ux-guidelines.csv',
      candidateSearchCodeChanges,
    },
    summary: {
      recommendationChanges: recommendationDiff.summary,
      candidateSearchCodeChanges: candidateSearchCodeChanges.length,
      begaAdoptedRuleChanges: {
        added: adoptedRuleDiff.added.length,
        removed: adoptedRuleDiff.removed.length,
        changed: adoptedRuleDiff.changed.length,
      },
    },
    recommendationDiff: recommendationDiff.profiles,
    begaAdoptedRuleDiff: adoptedRuleDiff,
    policy: [
      'Pro Max output is advisory and does not update BEGA contracts.',
      'Review and adopt BEGA rule changes through a separate explicit contract edit.',
      'Candidate UX CSV data is evaluated with the pinned baseline engine; candidate Python code is listed for review and never executed.',
    ],
  };
};

export const renderUpgradeReviewMarkdown = (review) => {
  const lines = [
    '# UI UX Pro Max Upgrade Review',
    '',
    `- Mode: review only; automatic adoption: ${review.automaticAdoption ? 'enabled' : 'disabled'}`,
    `- Baseline: ${review.snapshots.baseline.repository}@${review.snapshots.baseline.commit} (${review.snapshots.baseline.version ?? 'version unspecified'})`,
    `- Candidate: ${review.snapshots.candidate.repository}@${review.snapshots.candidate.commit} (${review.snapshots.candidate.version ?? 'version unspecified'})`,
    `- Candidate commit source: ${review.snapshots.candidate.commitSource}`,
    `- Search method: ${review.comparisonMethod.engine}; candidate snapshot code executed: no`,
    `- Recommendation changes: ${review.summary.recommendationChanges.added} added, ${review.summary.recommendationChanges.removed} removed, ${review.summary.recommendationChanges.changed} changed; ${review.summary.recommendationChanges.reorderedProfiles} profile(s) reordered`,
    `- Candidate search-code changes for manual review: ${review.summary.candidateSearchCodeChanges}`,
    `- BEGA adopted-rule changes: ${review.summary.begaAdoptedRuleChanges.added} added, ${review.summary.begaAdoptedRuleChanges.removed} removed, ${review.summary.begaAdoptedRuleChanges.changed} changed`,
    '',
    '| Profile | Recommendation query | Added | Removed | Changed | Reordered |',
    '| --- | --- | ---: | ---: | ---: | --- |',
    ...review.recommendationDiff.map((profile) => (
      `| ${profile.profile} | ${profile.query.replaceAll('|', '\\|')} | ${profile.counts.added} | ${profile.counts.removed} | ${profile.counts.changed} | ${profile.reordered ? 'yes' : 'no'} |`
    )),
    '',
    '## BEGA adopted-rule diff',
    '',
    ...[
      `- Added: ${review.begaAdoptedRuleDiff.added.map((rule) => rule.id).join(', ') || 'none'}`,
      `- Removed: ${review.begaAdoptedRuleDiff.removed.map((rule) => rule.id).join(', ') || 'none'}`,
      `- Changed: ${review.begaAdoptedRuleDiff.changed.map((rule) => rule.id).join(', ') || 'none'}`,
      ...review.policy.map((item) => `- ${item}`),
    ],
    '',
  ];
  return lines.join('\n');
};

const safeExtractTar = String.raw`
import pathlib, shutil, sys, tarfile
archive, destination = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]).resolve()
destination.mkdir(parents=True, exist_ok=True)
with tarfile.open(archive, 'r:*') as source:
    members = source.getmembers()
    if len(members) > 20000:
        raise SystemExit('candidate archive contains too many entries')
    total = sum(member.size for member in members if member.isfile())
    if total > 500 * 1024 * 1024:
        raise SystemExit('candidate archive exceeds the 500 MiB expanded-size limit')
    for member in members:
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or member.issym() or member.islnk():
            raise SystemExit('candidate archive contains an unsafe path or link')
        if not (member.isdir() or member.isfile()):
            raise SystemExit('candidate archive contains an unsupported entry type')
        target = (destination / pathlib.Path(*path.parts)).resolve()
        try:
            target.relative_to(destination)
        except ValueError:
            raise SystemExit('candidate archive path escapes its extraction directory')
        if member.isdir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            extracted = source.extractfile(member)
            if extracted is None:
                raise SystemExit('candidate archive contains an unreadable file')
            with extracted, target.open('wb') as output:
                shutil.copyfileobj(extracted, output, length=1024 * 1024)
`;

const findCandidateSkillRoot = (directory) => {
  const queue = [directory];
  const matches = [];
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = readdirSync(current, { withFileTypes: true });
    if (entries.some((entry) => entry.isDirectory() && entry.name === 'scripts')
      && entries.some((entry) => entry.isFile() && entry.name === 'SKILL.md')) {
      const searchScript = resolve(current, 'scripts/search.py');
      try {
        readFileSync(searchScript);
        matches.push(current);
      } catch {
        // This candidate directory is not the search skill root.
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory()) queue.push(resolve(current, entry.name));
    }
  }
  if (matches.length !== 1) {
    throw new Error(`Candidate archive must contain one UI UX Pro Max skill root; found ${matches.length}.`);
  }
  return matches[0];
};

const listPythonFiles = (directory, prefix = '') => {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...listPythonFiles(resolve(directory, entry.name), relativePath));
    else if (entry.isFile() && entry.name.endsWith('.py')) files.push(relativePath);
  }
  return files.sort();
};

const collectCandidateSearchCodeChanges = (baselineScripts, candidateScripts) => {
  const baselineFiles = new Set(listPythonFiles(baselineScripts));
  const candidateFiles = new Set(listPythonFiles(candidateScripts));
  const paths = [...new Set([...baselineFiles, ...candidateFiles])].sort();
  return paths.flatMap((path) => {
    const inBaseline = baselineFiles.has(path);
    const inCandidate = candidateFiles.has(path);
    if (!inBaseline) return [{ path: `scripts/${path}`, change: 'added' }];
    if (!inCandidate) return [{ path: `scripts/${path}`, change: 'removed' }];
    const baselineHash = createHash('sha256').update(readFileSync(resolve(baselineScripts, path))).digest('hex');
    const candidateHash = createHash('sha256').update(readFileSync(resolve(candidateScripts, path))).digest('hex');
    return baselineHash === candidateHash ? [] : [{ path: `scripts/${path}`, change: 'changed' }];
  });
};

const sha256File = async (path) => {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
};

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const separator = argument.indexOf('=');
    const name = argument.slice(2, separator < 0 ? undefined : separator);
    if (separator >= 0) args[name] = argument.slice(separator + 1);
    else {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`--${name} requires a value.`);
      args[name] = value;
      index += 1;
    }
  }
  return args;
};

const runSearch = (python, script, query) => {
  const output = execFileSync(python, [script, query, '--domain', 'ux', '--json', '--max-results', '5'], {
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
    cwd: resolve(dirname(script), '..'),
    env: {
      PATH: process.env.PATH ?? '/usr/bin:/bin',
      HOME: tmpdir(),
      TMPDIR: tmpdir(),
      PYTHONDONTWRITEBYTECODE: '1',
      PYTHONNOUSERSITE: '1',
      PYTHONUTF8: '1',
    },
  });
  const parsed = JSON.parse(output);
  if (parsed.domain !== 'ux' || parsed.query !== query || !Array.isArray(parsed.results)) {
    throw new Error(`Local UX search returned an unexpected response for query: ${query}`);
  }
  return parsed.results;
};

const validateSnapshotLock = (lock, repository, label) => {
  if (lock.schemaVersion !== 1 || lock.repository !== repository) {
    throw new Error(`${label} lock must use schema 1 and repository ${repository}.`);
  }
  if (!/^[a-f0-9]{40}$/i.test(lock.commit ?? '')) throw new Error(`${label} lock must pin a full commit SHA.`);
  if (!/^[a-f0-9]{64}$/i.test(lock.archiveSha256 ?? '')) throw new Error(`${label} lock must pin an archive SHA-256.`);
  if (typeof lock.snapshotDeclaredVersion !== 'string' || !lock.snapshotDeclaredVersion.trim()) {
    throw new Error(`${label} lock must declare a snapshot version.`);
  }
};

export const executeUpgradeReview = async ({ argv = process.argv.slice(2), root = repoRoot } = {}) => {
  if (argv.includes('--help')) return { help: true };
  const args = parseArgs(argv);
  for (const required of ['candidate-lock', 'candidate-archive', 'baseline-contract']) {
    if (!args[required]) throw new Error(`Missing required argument --${required}.`);
  }
  const baselineLock = json(resolve(root, 'contracts/ui-ux-pro-max-lock.json'));
  const sourceSnapshot = json(resolve(root, 'design-system/bega/source.json'));
  const oldScript = resolve(root, baselineLock.vendorPath ?? '.agents/skills/ui-ux-pro-max', 'scripts/search.py');
  const oldSkill = json(resolve(root, baselineLock.vendorPath ?? '.agents/skills/ui-ux-pro-max', 'skill.json'));
  const candidateLock = json(resolve(args['candidate-lock']));
  validateSnapshotLock(baselineLock, baselineLock.repository, 'Baseline');
  validateSnapshotLock(candidateLock, baselineLock.repository, 'Candidate');
  if (sourceSnapshot.source?.repository !== baselineLock.repository || sourceSnapshot.source?.commit !== baselineLock.commit) {
    throw new Error('BEGA recommendation provenance does not match the installed baseline lock.');
  }
  if (oldSkill.version !== baselineLock.snapshotDeclaredVersion) {
    throw new Error('Installed baseline skill version does not match its pinned lock.');
  }
  if (oldSkill.repository !== `https://github.com/${baselineLock.repository}`) {
    throw new Error('Installed baseline skill repository does not match its pinned lock.');
  }
  const archivePath = resolve(args['candidate-archive']);
  const archiveSize = statSync(archivePath).size;
  if (archiveSize > maxArchiveBytes) {
    throw new Error(`Candidate archive exceeds the ${maxArchiveBytes / 1024 / 1024} MiB input-size limit.`);
  }
  const archiveSha256 = await sha256File(archivePath);
  if (archiveSha256 !== candidateLock.archiveSha256.toLowerCase()) {
    throw new Error('Candidate archive SHA-256 does not match the supplied candidate lock.');
  }

  const extractionRoot = mkdtempSync(join(tmpdir(), 'uiux-pro-max-review-'));
  try {
    execFileSync(args.python ?? 'python3', ['-c', safeExtractTar, archivePath, extractionRoot], {
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const candidateRoot = findCandidateSkillRoot(extractionRoot);
    let candidateSkill;
    try {
      candidateSkill = json(resolve(candidateRoot, 'skill.json'));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error('Candidate archive must include skill.json repository, version, and commit metadata.');
      }
      throw error;
    }
    if (candidateSkill.version !== candidateLock.snapshotDeclaredVersion
      || candidateSkill.repository !== `https://github.com/${candidateLock.repository}`
      || candidateSkill.commit !== candidateLock.commit) {
      throw new Error('Candidate skill metadata does not match the supplied candidate lock.');
    }
    const candidateUxData = resolve(candidateRoot, 'data/ux-guidelines.csv');
    try {
      readFileSync(candidateUxData);
    } catch {
      throw new Error('Candidate archive is missing data/ux-guidelines.csv.');
    }
    const baselineScripts = resolve(root, baselineLock.vendorPath ?? '.agents/skills/ui-ux-pro-max', 'scripts');
    const candidateSearchCodeChanges = collectCandidateSearchCodeChanges(baselineScripts, resolve(candidateRoot, 'scripts'));
    const candidateEngineRoot = join(extractionRoot, 'pinned-review-engine');
    const candidateEngineScripts = join(candidateEngineRoot, 'scripts');
    const candidateEngineData = join(candidateEngineRoot, 'data');
    mkdirSync(candidateEngineScripts, { recursive: true });
    mkdirSync(candidateEngineData, { recursive: true });
    for (const name of ['search.py', 'core.py', 'design_system.py', 'reasoning_contract.py']) {
      copyFileSync(resolve(baselineScripts, name), resolve(candidateEngineScripts, name));
    }
    copyFileSync(candidateUxData, resolve(candidateEngineData, 'ux-guidelines.csv'));
    const python = args.python ?? 'python3';
    const recommendationSnapshots = sourceSnapshot.searches.map(({ profile, query }) => ({
      profile,
      query,
      baseline: runSearch(python, oldScript, query),
      candidate: runSearch(python, resolve(candidateEngineScripts, 'search.py'), query),
    }));
    const baselineContract = json(resolve(args['baseline-contract']));
    const currentContract = json(resolve(args['current-contract'] ?? 'contracts/ui-ux-design-intent-v1.json'));
    const review = buildUpgradeReview({
      baselineLock,
      candidateLock,
      recommendationSnapshots,
      baselineContract,
      currentContract,
      candidateSearchCodeChanges,
    });
    const outputPrefix = resolve(args['output-prefix'] ?? 'reports/ui-ux-pro-max-upgrade-review');
    mkdirSync(dirname(outputPrefix), { recursive: true });
    writeFileSync(`${outputPrefix}.json`, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
    writeFileSync(`${outputPrefix}.md`, renderUpgradeReviewMarkdown(review), 'utf8');
    return { review, outputPrefix };
  } finally {
    rmSync(extractionRoot, { recursive: true, force: true });
  }
};

const help = `Usage: npm run uiux:upgrade-review -- --candidate-lock <json> --candidate-archive <tar.gz> --baseline-contract <json> [options]\n\nOptions:\n  --current-contract <json>  Current BEGA Design Intent contract (default: contracts/ui-ux-design-intent-v1.json)\n  --output-prefix <path>     Report prefix (default: reports/ui-ux-pro-max-upgrade-review)\n  --python <executable>      Local Python executable (default: python3)\n\nThe candidate archive must include skill.json with repository, version, and commit matching the candidate lock. The command verifies and safely extracts the local candidate archive, then runs the installed pinned search engine against baseline and candidate UX CSV data. Candidate snapshot code is inspected for changed Python files but is never executed. The lock's commit is operator-declared, not authenticated by this offline comparison. Reports are review-only; the command does not access the network or modify contracts.`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--help')) {
    process.stdout.write(`${help}\n`);
  } else {
    executeUpgradeReview().then(({ review, outputPrefix }) => {
      console.log(`[uiux:upgrade-review] ${review.snapshots.baseline.commit} → ${review.snapshots.candidate.commit}; recommendation changes=${JSON.stringify(review.summary.recommendationChanges)}; BEGA adopted-rule changes=${JSON.stringify(review.summary.begaAdoptedRuleChanges)}; reports=${outputPrefix}.{json,md}`);
    }).catch((error) => {
      console.error(`[uiux:upgrade-review] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
  }
}
