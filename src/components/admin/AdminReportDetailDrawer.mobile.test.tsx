import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./AdminReportDetailDrawer.tsx', import.meta.url),
  'utf8',
);
const readRuntimeSource = () => readFile(
  new URL('./AdminModerationRuntime.tsx', import.meta.url),
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
  assert.match(source, /const actionClassName = 'min-h-11 w-full[^'\n]*sm:min-h-11'/);
  assert.match(source, /admin-report-action-warning[\s\S]*className=\{`\$\{actionClassName\}[^`]*col-span-2[^`]*`\}/);
});

test('admin report drawer exposes appeal review decisions and discloses irreversible deletion policy', async () => {
  const source = await readSource();

  for (const actionId of ['review', 'accept', 'reject', 'retry-anonymization']) {
    assert.match(source, new RegExp(`data-testid="admin-report-appeal-${actionId}"`));
  }
  assert.match(source, /useConfirmDialog/);
  assert.match(source, /이의제기가 승인되어도 원문은 복구되지 않습니다/);
  assert.match(source, /미디어 원본·스테이징 객체를 물리 삭제합니다/);
});

test('admin appeal decisions are single-flight and disabled while the decision refreshes', async () => {
  const source = await readSource();
  const runtime = await readRuntimeSource();

  assert.match(source, /appealDecisionLoading: boolean/);
  assert.match(source, /const appealDecisionInFlightRef = useRef\(false\)/);
  assert.match(source, /appealDecisionInFlightRef\.current/);
  assert.equal((source.match(/disabled=\{appealDecisionLoading\}/g) ?? []).length, 4);
  assert.match(runtime, /const appealDecisionInFlightRef = useRef\(false\)/);
  assert.match(runtime, /if \(appealDecisionInFlightRef\.current\) return/);
});

test('failed report detail refresh removes stale moderation actions', async () => {
  const runtime = await readRuntimeSource();
  const refreshStart = runtime.indexOf('const refreshSelectedReportDetail = useCallback');
  const refreshEnd = runtime.indexOf('const handleReportAction =', refreshStart);
  const refresh = runtime.slice(refreshStart, refreshEnd);

  assert.ok(refreshStart >= 0);
  assert.ok(refreshEnd > refreshStart);
  assert.match(refresh, /catch \(error\)[\s\S]*setSelectedReportDetail\(null\)/);
  assert.match(runtime, /const openReportDetail = async \(reportId: number\) => \{[\s\S]*setSelectedReportDetail\(null\)/);
});

test('admin report deletion policy also covers closures when appeal status is NONE', async () => {
  const source = await readSource();
  const appealGuard = source.indexOf("{appealStatus && appealStatus !== 'NONE' && (");
  const reportActionButtons = source.indexOf('<div className="grid w-full grid-cols-2 gap-2">', appealGuard);
  const deletionPolicy = source.indexOf('data-testid="admin-report-appeal-deletion-policy"');

  assert.ok(appealGuard >= 0);
  assert.ok(reportActionButtons > appealGuard);
  assert.ok(deletionPolicy > appealGuard);
  assert.ok(reportActionButtons > deletionPolicy);
  assert.match(source, /마지막 관련 신고·이의제기를 종결하면[\s\S]*물리 삭제합니다/);
});

test('admin report detail drawer allows deterministic memo input only outside production', async () => {
  const source = await readSource();

  assert.match(source, /visualQaStateOverride\?: AdminReportDetailDrawerVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride\?\.interactive === true/);
  assert.match(source, /const effectiveAdminMemo = visualQaInteractive \? visualQaAdminMemo : adminMemo/);
  assert.match(source, /const updateAdminMemo = visualQaInteractive \? setVisualQaAdminMemo : setAdminMemo/);
});
