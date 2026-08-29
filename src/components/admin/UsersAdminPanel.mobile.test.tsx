import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./UsersAdminPanel.tsx', import.meta.url),
  'utf8',
);

test('users admin panel owns a bounded named table and explicitly labels its controls', async () => {
  const source = await readSource();

  assert.match(source, /data-testid="admin-users-panel"[\s\S]*className="min-w-0 max-w-full/);
  assert.match(source, /aria-label="사용자 검색"/);
  assert.match(source, /<Table aria-label="관리자 사용자 목록" className=\{tableClassName \?\? 'min-w-\[860px\]'\}>/);
  assert.match(source, /data-testid=\{`admin-user-row-\$\{user\.id\}`\}/);
  assert.match(source, /aria-label=\{`\$\{user\.name\} 역할 변경`\}/);
});

test('users admin panel announces the polite busy loading state', async () => {
  const source = await readSource();

  assert.match(source, /data-testid="admin-users-loading"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /사용자 목록을 불러오는 중/);
});

test('users admin panel preserves current delete and role restrictions while exposing touch-safe actions', async () => {
  const source = await readSource();

  assert.match(source, /user\.id === currentUserId \|\| user\.role === 'ROLE_SUPER_ADMIN'/);
  assert.match(source, /disabled=\{user\.role === 'ROLE_ADMIN'\}/);
  assert.match(source, /data-testid=\{`admin-user-delete-\$\{user\.id\}`\}/);
  assert.match(source, /aria-label=\{`사용자 \$\{user\.name\} 삭제`\}/);
  assert.match(source, /min-w-11[^'"\n]*sm:min-w-8/);
  assert.match(source, /contentTestId="admin-user-delete-dialog"/);
  assert.match(source, /data-testid="admin-user-delete-cancel"/);
  assert.match(source, /data-testid="admin-user-delete-confirm"/);
  assert.ok((source.match(/min-h-11/g) ?? []).length >= 2);
});

test('users admin panel remains a pure prop and callback surface without API calls', async () => {
  const source = await readSource();

  assert.doesNotMatch(source, /api\/axios|from ['"][^'"]*\/api(?:\/|['"])/);
  assert.doesNotMatch(source, /\b(?:axios|fetch)\s*\(/);
  assert.doesNotMatch(source, /useEffect|useQuery|useMutation/);
  assert.match(source, /handleDeleteUser\(pendingDeleteUser\.id\)/);
  assert.match(source, /setPendingRoleChange\(\{/);
});

test('users admin panel permits deterministic controlled inputs only outside production', async () => {
  const source = await readSource();

  assert.match(source, /visualQaInteractive\?: boolean/);
  assert.match(source, /import\.meta\.env\?\.PROD !== true/);
  assert.match(source, /visualQaInteractive === true/);
  assert.match(source, /const effectiveSearchTerm = visualQaEnabled \? visualQaSearchTerm : searchTerm/);
  assert.match(source, /value=\{visualQaEnabled \? \(visualQaRoles\[user\.id\] \?\? user\.role\) : user\.role\}/);
  assert.match(source, /setSearchTerm\(nextSearchTerm\)/);
  assert.match(source, /setPendingRoleChange\(\{/);
});

test('users admin panel keeps its empty outcome visible outside the wide table canvas', async () => {
  const source = await readSource();

  assert.match(source, /users\.length === 0 \? \([\s\S]*data-testid="admin-users-empty"[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /유저가 없습니다\.[\s\S]*\) : \([\s\S]*<div className="max-w-full overflow-hidden rounded-xl/);
});

test('users admin panel keeps pressure identities in compact single-line cells', async () => {
  const source = await readSource();

  assert.match(source, /<span title=\{user\.email\} className="block max-w-\[220px\] truncate whitespace-nowrap">/);
  assert.match(source, /<span title=\{user\.name\} className="block max-w-\[160px\] truncate whitespace-nowrap">/);
  assert.match(source, /className="inline-flex min-w-8 items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-2/);
});
