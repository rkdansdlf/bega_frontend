import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./PostsAdminPanel.tsx', import.meta.url),
  'utf8',
);

test('posts admin panel owns a bounded named table and preserves full content pressure', async () => {
  const source = await readSource();

  assert.match(source, /data-testid="admin-posts-panel"[\s\S]*className="min-w-0 max-w-full/);
  assert.match(source, /<Table aria-label="커뮤니티 게시글 목록" className=\{tableClassName \?\? 'min-w-\[860px\]'\}>/);
  assert.match(source, /data-testid=\{`admin-post-row-\$\{post\.id\}`\}/);
  assert.match(source, /title=\{post\.content\}/);
  assert.match(source, /post\.content\?\.slice\(0, 40\) \|\| '-'/);
});

test('posts admin panel exposes named stable touch-safe delete controls and dialog actions', async () => {
  const source = await readSource();

  assert.match(source, /data-testid=\{`admin-post-delete-\$\{post\.id\}`\}/);
  assert.match(source, /aria-label=\{`게시글 \$\{post\.id\} 삭제`\}/);
  assert.match(source, /min-w-11[^'"\n]*sm:min-w-8/);
  assert.match(source, /contentTestId="admin-post-delete-dialog"/);
  assert.match(source, /data-testid="admin-post-delete-cancel"/);
  assert.match(source, /data-testid="admin-post-delete-confirm"/);
  assert.ok((source.match(/min-h-11/g) ?? []).length >= 2);
});

test('posts admin panel remains a pure prop and callback surface without API calls', async () => {
  const source = await readSource();

  assert.doesNotMatch(source, /api\/axios|from ['"][^'"]*\/api(?:\/|['"])/);
  assert.doesNotMatch(source, /\b(?:axios|fetch)\s*\(/);
  assert.doesNotMatch(source, /useEffect|useQuery|useMutation/);
  assert.match(source, /handleDeletePost\(pendingDeletePost\.id\)/);
});

test('posts admin panel keeps its empty outcome visible outside the wide table canvas', async () => {
  const source = await readSource();

  assert.match(source, /posts\.length === 0 \? \([\s\S]*data-testid="admin-posts-empty"[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /게시글이 없습니다\.[\s\S]*\) : \([\s\S]*<Table aria-label="커뮤니티 게시글 목록"/);
});

test('posts admin panel keeps pressure copy in compact single-line cells', async () => {
  const source = await readSource();

  assert.match(source, /<span title=\{post\.content\} className="block max-w-\[220px\] truncate whitespace-nowrap text-slate-200">/);
  assert.match(source, /<span title=\{post\.author\} className="block max-w-\[140px\] truncate whitespace-nowrap">/);
  assert.match(source, /className="inline-flex items-center gap-1 text-rose-400 whitespace-nowrap"/);
  assert.match(source, /className="inline-flex min-w-8 items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-2/);
});
