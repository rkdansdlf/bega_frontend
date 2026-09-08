import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./AdminReportsPanel.tsx', import.meta.url),
  'utf8',
);

test('admin reports panel labels every filter and keeps controls touch-safe on mobile', async () => {
  const source = await readSource();

  for (const field of ['status', 'reason', 'from-date', 'to-date']) {
    assert.match(source, new RegExp(`htmlFor="admin-reports-${field}-filter"`));
    assert.match(source, new RegExp(`id="admin-reports-${field}-filter"`));
  }

  assert.match(source, /const reportSelectClassName = `\$\{adminNativeSelectClassName\} min-h-11 sm:min-h-9`/);
  assert.match(source, /className="mb-4 grid min-w-0 grid-cols-1 items-end gap-2 md:grid-cols-5"/);
  assert.match(source, /data-testid="admin-reports-reset-filters"[\s\S]*min-h-11[\s\S]*sm:min-h-9/);
});

test('admin reports panel contains dense tables and announces terminal list states', async () => {
  const source = await readSource();

  assert.match(source, /data-testid="admin-reports-panel"[\s\S]*className="min-w-0 px-1"/);
  assert.match(source, /data-testid="admin-reports-table-region"/);
  assert.match(source, /aria-busy=\{reportsLoading\}/);
  assert.match(source, /max-h-\[320px\][^"\n]*overflow-y-auto/);
  assert.match(source, /<Table aria-label="신고 목록" className="min-w-\[1088px\] table-fixed">/);
  assert.match(source, /<TableHead className="w-40[^"\n]*">사유<\/TableHead>/);
  assert.match(source, /className="w-40 max-w-40 truncate whitespace-nowrap text-slate-300/);
  assert.match(source, /className="w-56 max-w-56 truncate whitespace-nowrap text-slate-300"/);
  assert.match(source, /reportsLoading \? \([\s\S]*<div[\s\S]*min-h-40[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /reports\.length === 0 \? \([\s\S]*<div[\s\S]*min-h-40[\s\S]*role="status"/);
  assert.match(source, /\) : \([\s\S]*<Table aria-label="신고 목록"/);
});

test('admin reports panel exposes named 44px row actions without losing pressure copy', async () => {
  const source = await readSource();

  assert.match(source, /aria-label=\{`신고 \$\{report\.id\} 상세 보기`\}/);
  assert.match(source, /aria-label=\{`신고 \$\{report\.id\} 게시물 비공개`\}/);
  assert.match(source, /aria-label=\{`신고 \$\{report\.id\} 기각`\}/);
  assert.match(source, /const reportRowActionClassName = 'min-h-11[^'\n]*sm:min-h-8[^'\n]*'/);
  assert.ok((source.match(/\[overflow-wrap:anywhere\]/g) ?? []).length >= 2);
  assert.match(source, /w-56 max-w-56 truncate whitespace-nowrap/);
});

test('admin reports panel permits deterministic filter input only outside production', async () => {
  const source = await readSource();

  assert.match(source, /visualQaStateOverride\?: AdminReportsPanelVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride\?\.interactive === true/);
  assert.match(source, /const effectiveReportFilters = visualQaInteractive \? visualQaReportFilters : reportFilters/);
  assert.match(source, /const applyReportFilters = visualQaInteractive/);
});
