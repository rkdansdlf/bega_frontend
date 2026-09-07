import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./AdminSeatViewDetailDrawer.tsx', import.meta.url),
  'utf8',
);

test('admin seat-view detail drawer delegates mobile containment and accessibility to PlainDialog', async () => {
  const source = await readSource();

  assert.match(source, /import PlainDialog from '..\/ui\/plain-dialog'/);
  assert.match(source, /placement="right"/);
  assert.match(source, /initialFocus="container"/);
  assert.match(source, /contentTestId="admin-seat-view-detail-drawer"/);
  assert.match(source, /className="max-w-xl[^"\n]*focus:outline-none/);
  assert.doesNotMatch(source, /createPortal/);
  assert.doesNotMatch(source, /h-full w-full max-w-xl/);
});

test('admin seat-view detail drawer keeps pressure data readable and distinguishes loading from missing detail', async () => {
  const source = await readSource();

  assert.match(source, /grid grid-cols-1 gap-3 text-caption sm:grid-cols-2/);
  assert.ok((source.match(/\[overflow-wrap:anywhere\]/g) ?? []).length >= 5);
  assert.match(source, /seatViewDetailLoading[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /!selectedSeatViewDetail[\s\S]*상세 정보를 찾을 수 없습니다/);
  assert.match(source, /aria-busy=\{seatViewDetailLoading\}/);
  assert.match(source, /aspect-video[^"]*object-contain/);
});

test('admin seat-view detail drawer labels its memo and keeps four actions reachable in a mobile footer', async () => {
  const source = await readSource();

  assert.match(source, /htmlFor="admin-seat-view-admin-memo"/);
  assert.match(source, /id="admin-seat-view-admin-memo"/);
  assert.match(source, /px-3 py-2 text-base text-slate-100/);

  for (const actionId of ['approve', 'ticket', 'other', 'inappropriate']) {
    assert.match(source, new RegExp(`data-testid="admin-seat-view-action-${actionId}"`));
  }

  assert.match(source, /grid w-full grid-cols-2 gap-2/);
  assert.match(source, /const actionClassName = 'min-h-11 w-full[^'\n]*sm:min-h-9'/);
});

test('admin seat-view detail drawer allows deterministic memo input only outside production', async () => {
  const source = await readSource();

  assert.match(source, /visualQaStateOverride\?: AdminSeatViewDetailDrawerVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride\?\.interactive === true/);
  assert.match(source, /const effectiveAdminMemo = visualQaInteractive \? visualQaAdminMemo : adminMemo/);
  assert.match(source, /const updateAdminMemo = visualQaInteractive \? setVisualQaAdminMemo : setAdminMemo/);
});
