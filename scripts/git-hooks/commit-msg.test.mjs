import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const hookDir = path.dirname(fileURLToPath(import.meta.url));
const hook = path.join(hookDir, 'commit-msg');

const runHook = (message) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'commit-msg-hook-'));
  try {
    const file = path.join(dir, 'COMMIT_EDITMSG');
    writeFileSync(file, message);
    return spawnSync('sh', [hook, file], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const blocked = [
  ['Claude Sonnet trailer', 'fix(ui): x\n\nbody\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n'],
  ['lower-case trailer', 'fix: x\n\nco-authored-by: claude <noreply@anthropic.com>\n'],
  ['indented trailer', 'fix: x\n\n  Co-authored-by: Claude Opus 5 <x@y.z>\n'],
  ['anthropic address only', 'fix: x\n\nCo-Authored-By: Assistant <noreply@anthropic.com>\n'],
  ['generated-with line', 'fix: x\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n'],
];
for (const [name, message] of blocked) {
  test(`blocks: ${name}`, () => {
    const result = runHook(message);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /not allowed/);
  });
}

const allowed = [
  ['plain message', 'fix(ui): 버튼 대비\n\n본문\n'],
  ['human co-author', 'feat: x\n\nCo-authored-by: Kim Minsu <minsu@example.com>\n'],
  ['claude only in the subject', 'docs: update CLAUDE.md routing table\n'],
  ['trailer only in a git comment line', 'fix: x\n\n# Co-Authored-By: Claude <noreply@anthropic.com>\n'],
  ['claude mentioned in prose', 'fix: x\n\nThe Claude agent opened this change; the operator reviewed it.\n'],
];
for (const [name, message] of allowed) {
  test(`allows: ${name}`, () => {
    const result = runHook(message);
    assert.equal(result.status, 0, result.stderr);
  });
}

test('git commit is rejected end to end when core.hooksPath points at the hook', () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'commit-msg-e2e-'));
  const git = (...args) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  try {
    git('init', '-q');
    git('config', 'user.email', 'operator@example.com');
    git('config', 'user.name', 'Operator');
    git('config', 'core.hooksPath', hookDir);
    writeFileSync(path.join(repo, 'a.txt'), 'a\n');
    git('add', 'a.txt');

    const rejected = git('commit', '-m', 'chore: x', '-m', 'Co-Authored-By: Claude <noreply@anthropic.com>');
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /not allowed/);

    const accepted = git('commit', '-m', 'chore: x');
    assert.equal(accepted.status, 0, accepted.stderr);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
