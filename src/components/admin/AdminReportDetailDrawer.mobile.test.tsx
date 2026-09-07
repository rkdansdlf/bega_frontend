import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./AdminReportDetailDrawer.tsx', import.meta.url),
  'utf8',
);

test('admin report detail drawer delegates mobile containment and dialog accessibility to PlainDialog', async () => {
  const source = await readSource();

  assert.match(source, /import PlainDialog from '..\/ui\/plain-dialog'/);
  assert.match(source, /placement="right"/);
  assert.match(source, /initialFocus="container"/);
  assert.match(source, /contentTestId="admin-report-detail-drawer"/);
  assert.match(source, /className="max-w-xl[^"\n]*focus:outline-none/);
  assert.doesNotMatch(source, /createPortal/);
  assert.doesNotMatch(source, /h-full w-full max-w-xl/);
});

test('admin report detail drawer keeps pressure data readable and distinguishes loading from missing detail', async () => {
  const source = await readSource();

  assert.match(source, /grid grid-cols-1 gap-3 text-caption sm:grid-cols-2/);
  assert.ok((source.match(/\[overflow-wrap:anywhere\]/g) ?? []).length >= 4);
  assert.match(source, /reportDetailLoading[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /!selectedReportDetail[\s\S]*상세 정보를 찾을 수 없습니다/);
  assert.match(source, /aria-busy=\{reportDetailLoading\}/);
});

test('admin report detail drawer labels its memo and exposes six mobile-safe actions', async () => {
  const source = await readSource();

  assert.match(source, /htmlFor="admin-report-admin-memo"/);
  assert.match(source, /id="admin-report-admin-memo"/);
  assert.match(source, /px-3 py-2 text-base text-slate-100/);

  for (const actionId of [
    'take-down',
    'dismiss',
    'restore',
    'require-modification',
    'warning',
  ]) {
    assert.match(source, new RegExp(`data-testid="admin-report-action-${actionId}"`));
  }

  assert.match(source, /grid w-full grid-cols-2 gap-2/);
  assert.match(source, /const actionClassName = 'min-h-11 w-full[^'\n]*sm:min-h-9'/);
  assert.match(source, /admin-report-action-warning[\s\S]*className=\{`\$\{actionClassName\}[^`]*col-span-2[^`]*`\}/);
});

test('admin report detail drawer allows deterministic memo input only outside production', async () => {
  const source = await readSource();

  assert.match(source, /visualQaStateOverride\?: AdminReportDetailDrawerVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride\?\.interactive === true/);
  assert.match(source, /const effectiveAdminMemo = visualQaInteractive \? visualQaAdminMemo : adminMemo/);
  assert.match(source, /const updateAdminMemo = visualQaInteractive \? setVisualQaAdminMemo : setAdminMemo/);
});
