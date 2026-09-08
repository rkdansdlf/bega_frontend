import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./MatesAdminPanel.tsx', import.meta.url),
  'utf8',
);

test('mates admin panel owns a bounded named table and preserves pressure titles', async () => {
  const source = await readSource();

  assert.match(source, /data-testid="admin-mates-panel"[\s\S]*className="min-w-0 max-w-full/);
  assert.match(source, /<Table aria-label="메이트 모임 목록" className=\{tableClassName \?\? 'min-w-\[860px\]'\}>/);
  assert.match(source, /data-testid=\{`admin-mate-row-\$\{mate\.id\}`\}/);
  assert.match(source, /title=\{mate\.title\}/);
});

test('mates admin panel exposes named stable touch-safe delete controls and dialog actions', async () => {
  const source = await readSource();

  assert.match(source, /data-testid=\{`admin-mate-delete-\$\{mate\.id\}`\}/);
  assert.match(source, /aria-label=\{`메이트 모임 \$\{mate\.id\} 삭제`\}/);
  assert.match(source, /min-w-11[^'"\n]*sm:min-w-8/);
  assert.match(source, /contentTestId="admin-mate-delete-dialog"/);
  assert.match(source, /data-testid="admin-mate-delete-cancel"/);
  assert.match(source, /data-testid="admin-mate-delete-confirm"/);
  assert.ok((source.match(/min-h-11/g) ?? []).length >= 2);
});

test('mates admin panel remains a pure prop and callback surface without API calls', async () => {
  const source = await readSource();

  assert.doesNotMatch(source, /api\/axios|from ['"][^'"]*\/api(?:\/|['"])/);
  assert.doesNotMatch(source, /\b(?:axios|fetch)\s*\(/);
  assert.doesNotMatch(source, /useEffect|useQuery|useMutation/);
  assert.match(source, /handleDeleteMate\(pendingDeleteMate\.id\)/);
});

test('mates admin panel keeps its empty outcome visible outside the wide table canvas', async () => {
  const source = await readSource();

  assert.match(source, /mates\.length === 0 \? \([\s\S]*data-testid="admin-mates-empty"[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /메이트 모임이 없습니다\.[\s\S]*\) : \([\s\S]*<Table aria-label="메이트 모임 목록"/);
});

test('mates admin panel keeps pressure copy in compact single-line cells', async () => {
  const source = await readSource();

  assert.match(source, /<span title=\{mate\.title\} className="block max-w-\[200px\] truncate whitespace-nowrap">/);
  assert.match(source, /<span title=\{mate\.hostName\} className="block max-w-\[140px\] truncate whitespace-nowrap">/);
  assert.match(source, /className="inline-flex items-center gap-1 whitespace-nowrap"/);
});
