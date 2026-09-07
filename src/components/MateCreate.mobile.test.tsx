import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mate create header keeps navigation and progress copy readable in dark mode', async () => {
  const source = await readFile(new URL('./MateCreate.tsx', import.meta.url), 'utf8');

  assert.match(
    source,
    /data-testid="mate-create-back"[\s\S]*?className="[^"]*dark:text-white[^"]*"/,
  );
  assert.match(
    source,
    /className="[^"]*text-gray-600[^"]*dark:text-white[^"]*">단계별로 파티 정보를 입력해주세요/,
  );
  assert.match(
    source,
    /className="[^"]*text-gray-600[^"]*dark:text-white[^"]*">단계 \{createStep\} \/ 4/,
  );
});
