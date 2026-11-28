import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';

const heroSource = fs.readFileSync(
  new URL('../src/components/landing/LandingHero.tsx', import.meta.url),
  'utf8',
);
const landingStyles = fs.readFileSync(
  new URL('../src/components/Landing.css', import.meta.url),
  'utf8',
);

// 히어로 뒤의 480px "720" 장식 워터마크는 제거했다. 정보가 없는 aria-hidden 요소인데
// 모바일에서만 숨겨져 있어 데스크톱에서는 페인트 비용만 들었다. 이런 대형 장식 요소를 다시
// 넣으려면 LCP 영향을 확인하고 이 테스트를 의도적으로 고치도록 막아 둔다.
test('landing hero renders no oversized decorative watermark', () => {
  assert.doesNotMatch(heroSource, /watermark/i);

  const watermarkRules = [];
  postcss.parse(landingStyles).walkRules((rule) => {
    if (/watermark/i.test(rule.selector)) {
      watermarkRules.push(rule.selector);
    }
  });

  assert.deepEqual(watermarkRules, []);
});
