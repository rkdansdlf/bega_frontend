import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getLuminance } from '../../utils/teamColors';

import {
  getAccessibleCheerTextColor,
  normalizeCheerSearchQuery,
  parseLinkedTarget,
  resolveCheerSurface,
  resolveCheerTabFromParam,
} from './CheerPresentation';

test('Cheer text contrast preserves the original 8-bit color calculation', () => {
  const originalLuminance = (channels: number[]) => {
    const linear = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const hex = (channels: number[]) => channels.map((value) => value.toString(16).padStart(2, '0')).join('');
  // Both transfer-function thresholds lie between the same two 8-bit values.
  // Verify every channel, including 10/11, before sharing the existing utility.
  for (let channel = 0; channel < 256; channel += 1) {
    for (let index = 0; index < 3; index += 1) {
      const channels = [0, 0, 0];
      channels[index] = channel;
      assert.equal(getLuminance(`#${hex(channels)}`), originalLuminance(channels));
    }
  }
  const dark = originalLuminance([15, 23, 42]);
  for (let r = 0; r < 256; r += 17) {
    for (let g = 0; g < 256; g += 17) {
      for (let b = 0; b < 256; b += 17) {
        const luminance = originalLuminance([r, g, b]);
        const lightContrast = 1.05 / (luminance + 0.05);
        const darkContrast = (Math.max(luminance, dark) + 0.05) / (Math.min(luminance, dark) + 0.05);
        const expected = lightContrast >= darkContrast ? '#FFFFFF' : '#0F172A';
        const full = hex([r, g, b]);
        for (const input of [`#${full}`, full.toUpperCase(), ` #${full[0]}${full[2]}${full[4]} `]) {
          assert.equal(getAccessibleCheerTextColor(input), expected, input);
        }
      }
    }
  }
  for (const invalid of ['', 'invalid', '#ffff', '#ffffff00', '#xyz', '##fff']) {
    assert.equal(getAccessibleCheerTextColor(invalid), '#0F172A');
  }
  const source = readFileSync(new URL('./CheerPresentation.ts', import.meta.url), 'utf8');
  assert.match(source, /import \{ getLuminance \} from '\.\.\/\.\.\/utils\/teamColors';/);
  assert.doesNotMatch(source, /const relativeLuminance/);
});

test('연결 작성 경로는 정확한 타입과 양의 정수 원본 ID 조합만 허용한다', () => {
  assert.deepEqual(parseLinkedTarget('CHECKIN', '12', null), {
    postType: 'CHECKIN',
    diaryId: 12,
  });
  assert.deepEqual(parseLinkedTarget('RECRUITMENT', null, '44'), {
    postType: 'RECRUITMENT',
    partyId: 44,
  });

  const invalidTargets: Array<[string | null, string | null, string | null]> = [
    ['CHECKIN', '12', '44'],
    ['RECRUITMENT', '12', '44'],
    [null, null, null],
    ['CHECKIN', null, null],
    ['RECRUITMENT', null, null],
    ['CHECKIN', null, '44'],
    ['RECRUITMENT', '12', null],
    ['CHECKIN', '', null],
    ['RECRUITMENT', null, ''],
    ['CHECKIN', '1.5', null],
    ['RECRUITMENT', null, '1e2'],
    ['CHECKIN', '0', null],
    ['RECRUITMENT', null, '-1'],
    ['CHECKIN', ' 12', null],
    ['RECRUITMENT', null, '44 '],
    ['NORMAL', '12', null],
    ['checkin', '12', null],
    ['FUTURE_TYPE', null, '44'],
  ];

  invalidTargets.forEach(([postType, diaryId, partyId]) => {
    assert.equal(
      parseLinkedTarget(postType, diaryId, partyId),
      null,
      `${postType ?? 'null'}:${diaryId ?? 'null'}:${partyId ?? 'null'}`,
    );
  });
});

test('팀 액센트 위 글자는 실제 명암비가 더 높은 색을 선택한다', () => {
  assert.equal(getAccessibleCheerTextColor('#F37321'), '#0F172A');
  assert.equal(getAccessibleCheerTextColor('#315288'), '#FFFFFF');
});

test('응원석 검색어는 앞뒤와 중복 공백을 정리한다', () => {
  assert.equal(normalizeCheerSearchQuery('  #직관인증   창원  '), '#직관인증 창원');
  assert.equal(normalizeCheerSearchQuery('   '), '');
});

test('검색어가 있으면 탭보다 검색 결과 화면을 우선한다', () => {
  assert.equal(resolveCheerSurface('live', 'NC 다이노스'), 'search');
  assert.equal(resolveCheerSurface('live', ''), 'live');
  assert.equal(resolveCheerSurface('popular', ''), 'feed');
});

test('URL 탭은 지원하는 값만 복원하고 나머지는 전체 탭으로 정규화한다', () => {
  assert.equal(resolveCheerTabFromParam('live'), 'live');
  assert.equal(resolveCheerTabFromParam('following'), 'following');
  assert.equal(resolveCheerTabFromParam('unknown'), 'all');
  assert.equal(resolveCheerTabFromParam(null), 'all');
});
