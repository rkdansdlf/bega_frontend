import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./AdminRoleChangeDialogContent.tsx', import.meta.url),
  'utf8',
);

test('admin role-change dialog keeps identity and role transitions readable in either theme', async () => {
  const source = await readSource();

  assert.match(source, /contentTestId="admin-role-change-dialog"/);
  assert.match(source, /className="max-w-md border-border text-foreground"/);
  assert.match(source, /min-w-0 \[overflow-wrap:anywhere\]/);
  assert.match(source, /flex min-w-0 flex-wrap items-center gap-2/);
  assert.match(source, /line-clamp-2[^"\n]*\[overflow-wrap:anywhere\]/);
  assert.match(source, /className="min-w-0 line-clamp-2 font-semibold text-foreground \[overflow-wrap:anywhere\]"/);
  assert.match(source, /className="mt-0\.5 block min-w-0 truncate"/);
  assert.equal(source.match(/title=\{pendingRoleChange\./g)?.length, 2);
  assert.match(source, /text-amber-800/);
  assert.match(source, /dark:text-amber-200/);
  assert.doesNotMatch(source, /bg-slate-900|text-white/);
});

test('admin role-change dialog labels its reason and keeps every mobile action touch-safe', async () => {
  const source = await readSource();

  assert.match(source, /htmlFor="admin-role-change-reason"/);
  assert.match(source, /id="admin-role-change-reason"/);
  assert.match(source, /const roleActionClassName = 'min-h-11 w-full whitespace-normal \[overflow-wrap:anywhere\] sm:min-h-9 sm:w-auto'/);
  assert.ok((source.match(/roleActionClassName/g) ?? []).length >= 3);
  assert.match(source, /min-h-11[^"\n]*sm:min-h-9/);
});

test('admin role-change dialog fails safe when its selected user disappears', async () => {
  const source = await readSource();

  assert.match(source, /const hasPendingRoleChange = pendingRoleChange !== null/);
  assert.match(source, /변경할 사용자 정보가 없습니다/);
  assert.match(source, /role="status"/);
  assert.match(source, /disabled=\{!hasPendingRoleChange\}/);
  assert.match(source, /\{hasPendingRoleChange \? \([\s\S]*admin-role-change-reason/);
});

test('admin role-change dialog permits deterministic reason input only outside production', async () => {
  const source = await readSource();

  assert.match(source, /visualQaStateOverride\?: AdminRoleChangeDialogVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride\?\.interactive === true/);
  assert.match(source, /const effectiveRoleChangeReason = visualQaInteractive/);
});
