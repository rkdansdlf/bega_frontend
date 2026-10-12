import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('마이페이지 모바일 프로필 요약은 600px 이하에서 counters를 다음 줄로 reflow한다', () => {
  const css = readSource('./MyPageSeason.css');
  const sidebar = readSource('./MyPageSidebarRuntime.tsx');
  const mobileProfileBlock = css.match(/@media \(max-width: 600px\) \{([\s\S]*?\.mypage-season-main \{)/)?.[1] ?? '';

  assert.match(sidebar, /className="mypage-season-name"/);
  assert.match(sidebar, /className="mypage-season-handle"/);
  assert.match(mobileProfileBlock, /\.mypage-season-id\s*\{[\s\S]*?flex-wrap:\s*wrap;/);
  assert.match(mobileProfileBlock, /\.mypage-season-counters\s*\{[\s\S]*?flex:\s*1 1 100%;/);
});

