import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('마이페이지 통계 오류는 정상적인 기록 없음 상태와 별도 화면 계약을 가진다', () => {
  const hook = readSource('../../hooks/useDiaryStatistics.ts');
  const statistics = readSource('./Diarystatistics.tsx');

  assert.match(hook, /isError,\s*\n\s*error,/);
  assert.match(hook, /isError,\s*\n\s*diaryEntries,/);
  assert.match(statistics, /visualQaStateOverride\?\.isError\s*\?\?\s*liveState\.isError/);
  assert.match(statistics, /if \(isError\)/);
  assert.match(statistics, /role="alert"/);
  assert.match(statistics, /통계를 불러오지 못했어요/);
  assert.match(statistics, /잠시 후 다시 방문하면 통계를 확인할 수 있어요\./);
  assert.match(statistics, /아직 분석할 기록이 없어요/);
});
