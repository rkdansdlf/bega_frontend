import { useState } from 'react';

import TeamLogo from './TeamLogo';
import { getTeamColorByAnyKey } from '../constants/teams';
import { TEAMS } from '../utils/constants';
import { SEAT_CATEGORIES, type SeatCategory } from '../utils/stadiumData';
import { SEAT_ICONS } from '../utils/seatIcons';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { FieldLabel } from './MateCreatePrimitives';
import { Input } from './ui/input';

interface MateCreateSeatSelectionFieldsProps {
  formData: PartyFormData;
  availableCategoryKeys: SeatCategory[];
  updateFormData: (data: Partial<PartyFormData>) => void;
  visualQaInteractive?: boolean;
}

const SEAT_DETAIL_MAX_LENGTH = 100;

const seatDescriptions: Record<string, string> = {
  '응원석': '치어리더와 함께 열정 응원! 🔥',
  '테이블석': '음식을 편하게 먹을 수 있어요 🍗',
  '프리미엄': '최고의 시야와 편안함 💎',
  '익사이팅': '선수들과 가장 가까운 곳 ⚡',
  '일반/시야': '가성비 좋게 관람해요 👀',
  '이색좌석': '특별한 경험을 원한다면 ⛺',
  '외야석': '홈런볼을 잡을 기회! ⚾',
};

const mapTeamId = (backendId: string): string => {
  if (!backendId) return '';
  const code = backendId.toUpperCase();
  const mapping: Record<string, string> = {
    LG: 'lg',
    KT: 'kt',
    NC: 'nc',
    SSG: 'ssg',
    SK: 'ssg',
    DB: 'doosan',
    OB: 'doosan',
    DO: 'doosan',
    SS: 'samsung',
    LT: 'lotte',
    KIA: 'kia',
    HT: 'kia',
    HH: 'hanwha',
    KH: 'kiwoom',
    WO: 'kiwoom',
    KI: 'kiwoom',
    NX: 'kiwoom',
    KW: 'kiwoom',
  };
  return mapping[code] || backendId.toLowerCase();
};

export default function MateCreateSeatSelectionFields({
  formData,
  availableCategoryKeys,
  updateFormData,
  visualQaInteractive,
}: MateCreateSeatSelectionFieldsProps) {
  const [visualQaFormData, setVisualQaFormData] = useState(formData);
  const shouldUseVisualQaState = import.meta.env?.PROD !== true && visualQaInteractive === true;
  const effectiveFormData = shouldUseVisualQaState ? visualQaFormData : formData;
  const effectiveUpdateFormData = shouldUseVisualQaState
    ? (data: Partial<PartyFormData>) => setVisualQaFormData((current) => ({ ...current, ...data }))
    : updateFormData;
  const homeTeamId = mapTeamId(effectiveFormData.homeTeam);
  const awayTeamId = mapTeamId(effectiveFormData.awayTeam);
  const homeTeamColor = getTeamColorByAnyKey(homeTeamId);
  const awayTeamColor = getTeamColorByAnyKey(awayTeamId);
  const selectedCategoryKey = (Object.entries(SEAT_CATEGORIES).find(([, value]) => (
    value.label === effectiveFormData.seatCategory
  ))?.[0] as SeatCategory | undefined);
  const seatDetailParts = effectiveFormData.seatDetail.split(' ');
  const blockValue = seatDetailParts[0]?.replace(/블록$/, '') || '';
  const rowValue = seatDetailParts[1]?.replace(/열$/, '') || '';
  const seatValue = seatDetailParts[2]?.replace(/번$/, '') || '';

  const updateSeatDetailPart = (index: 0 | 1 | 2, nextValue: string) => {
    const values = [blockValue, rowValue, seatValue];
    values[index] = nextValue.slice(0, SEAT_DETAIL_MAX_LENGTH);
    const format = (parts: string[]) => [
      parts[0] ? `${parts[0]}블록` : '',
      parts[1] ? `${parts[1]}열` : '',
      parts[2] ? `${parts[2]}번` : '',
    ].filter(Boolean).join(' ');
    let nextSeatDetail = format(values);

    if (nextSeatDetail.length > SEAT_DETAIL_MAX_LENGTH) {
      const overflow = nextSeatDetail.length - SEAT_DETAIL_MAX_LENGTH;
      values[index] = values[index].slice(0, Math.max(0, values[index].length - overflow));
      nextSeatDetail = format(values);
    }

    effectiveUpdateFormData({ seatDetail: nextSeatDetail });
  };

  return (
    <div
      data-testid="mate-create-seat-selection-fields"
      data-selected-side={effectiveFormData.cheeringSide || 'none'}
      data-selected-category={selectedCategoryKey || 'none'}
      data-seat-detail-length={effectiveFormData.seatDetail.length}
      className="min-w-0 space-y-6 [overflow-wrap:anywhere] sm:space-y-8"
    >
      <div className="space-y-3">
        <FieldLabel id="mate-create-cheering-side-label" className="text-base font-bold sm:text-lg">응원 진영 선택 <span aria-hidden="true" className="text-red-500 ml-0.5">*</span></FieldLabel>
        <div
          role="group"
          aria-labelledby="mate-create-cheering-side-label"
          aria-required="true"
          className="grid min-h-[7rem] grid-cols-3 gap-2 sm:h-28 sm:gap-3"
        >
          <button
            type="button"
            data-testid="mate-create-cheering-home"
            aria-pressed={effectiveFormData.cheeringSide === 'HOME'}
            onClick={() => effectiveUpdateFormData({ cheeringSide: 'HOME' })}
            className={`relative flex min-w-0 flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] sm:px-3 ${effectiveFormData.cheeringSide === 'HOME'
              ? 'border-transparent text-white ring-2 ring-inset ring-white/70 shadow-md'
              : 'border-gray-300 text-gray-700 opacity-80 hover:bg-gray-50 hover:opacity-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800'
              }`}
            style={effectiveFormData.cheeringSide === 'HOME' ? { backgroundColor: homeTeamColor } : undefined}
          >
            <div className="mb-1.5 sm:mb-2">
              <TeamLogo teamId={homeTeamId} size={32} />
            </div>
            <span className="min-w-0 text-center text-body font-bold leading-tight [overflow-wrap:anywhere] sm:text-lg">
              {TEAMS.find((team) => team.id === homeTeamId)?.name || '홈팀'}
            </span>
            <span className="mt-1 text-caption font-semibold opacity-80 sm:text-body">홈 팀 응원</span>
          </button>

          <button
            type="button"
            data-testid="mate-create-cheering-neutral"
            aria-pressed={effectiveFormData.cheeringSide === 'NEUTRAL'}
            onClick={() => effectiveUpdateFormData({ cheeringSide: 'NEUTRAL' })}
            className={`flex min-w-0 flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] sm:px-3 ${effectiveFormData.cheeringSide === 'NEUTRAL'
              ? 'border-transparent bg-gray-600 text-white ring-2 ring-inset ring-white/70 shadow-md'
              : 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800'
              }`}
          >
            <span className="mb-1 text-2xl sm:text-3xl">😐</span>
            <span className="min-w-0 text-body font-bold [overflow-wrap:anywhere] sm:text-lg">상관없음</span>
            <span className="mt-1 text-caption font-semibold opacity-80 sm:text-body">중립</span>
          </button>

          <button
            type="button"
            data-testid="mate-create-cheering-away"
            aria-pressed={effectiveFormData.cheeringSide === 'AWAY'}
            onClick={() => effectiveUpdateFormData({ cheeringSide: 'AWAY' })}
            className={`relative flex min-w-0 flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] sm:px-3 ${effectiveFormData.cheeringSide === 'AWAY'
              ? 'border-transparent text-white ring-2 ring-inset ring-white/70 shadow-md'
              : 'border-gray-300 text-gray-700 opacity-80 hover:bg-gray-50 hover:opacity-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800'
              }`}
            style={effectiveFormData.cheeringSide === 'AWAY' ? { backgroundColor: awayTeamColor } : undefined}
          >
            <div className="mb-1.5 sm:mb-2">
              <TeamLogo teamId={awayTeamId} size={32} />
            </div>
            <span className="min-w-0 text-center text-body font-bold leading-tight [overflow-wrap:anywhere] sm:text-lg">
              {TEAMS.find((team) => team.id === awayTeamId)?.name || '원정팀'}
            </span>
            <span className="mt-1 text-caption font-semibold opacity-80 sm:text-body">원정 팀 응원</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <FieldLabel id="mate-create-seat-category-label" className="text-base font-bold sm:text-lg">좌석 종류 (선택)</FieldLabel>
        <div role="group" aria-labelledby="mate-create-seat-category-label" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(SEAT_CATEGORIES)
            .filter(([key]) => availableCategoryKeys.includes(key as SeatCategory))
            .map(([key, value]) => {
              const isSelected = effectiveFormData.seatCategory === value.label;

              return (
                <button
                  type="button"
                  key={key}
                  data-testid={`mate-create-seat-category-${key}`}
                  aria-pressed={isSelected}
                  onClick={() => effectiveUpdateFormData({ seatCategory: isSelected ? '' : value.label })}
                  className={`flex min-h-11 w-full min-w-0 items-start gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] sm:p-4 ${isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-100 bg-white hover:border-primary/50 dark:border-border dark:bg-card'
                    }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-2 text-xl sm:h-12 sm:w-12 sm:text-2xl ${isSelected ? 'bg-white' : 'bg-gray-50 dark:bg-secondary'}`}>
                    {SEAT_ICONS[key as SeatCategory]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                      {value.label}
                    </div>
                    <div className="mt-1 min-w-0 text-body leading-snug text-gray-500 [overflow-wrap:anywhere] dark:text-gray-300">
                      {seatDescriptions[value.label] || '편안한 관람'}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      <div className="space-y-3">
        <FieldLabel id="mate-create-seat-detail-label" className="text-base font-bold sm:text-lg">좌석 상세 <span aria-hidden="true" className="text-red-500 ml-0.5">*</span></FieldLabel>
        <div role="group" aria-labelledby="mate-create-seat-detail-label" aria-required="true" className="grid min-w-0 gap-3 sm:grid-cols-3">
          <div className="min-w-0">
            <label htmlFor="seatDetailBlock" className="mb-1 block text-body text-gray-600 dark:text-gray-300">구역/블록</label>
            <div className="relative min-w-0">
              <Input
                id="seatDetailBlock"
                data-testid="mate-create-seat-block"
                placeholder="예: 305"
                value={blockValue}
                onChange={(event) => updateSeatDetailPart(0, event.target.value)}
                maxLength={SEAT_DETAIL_MAX_LENGTH}
                inputMode="text"
                autoComplete="off"
                aria-describedby="seat-detail-help"
                className="h-12 min-w-0 pr-12 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body text-gray-500 dark:text-gray-300">블록</span>
            </div>
          </div>
          <div className="min-w-0">
            <label htmlFor="seatDetailRow" className="mb-1 block text-body text-gray-600 dark:text-gray-300">열</label>
            <div className="relative min-w-0">
              <Input
                id="seatDetailRow"
                data-testid="mate-create-seat-row"
                placeholder="예: 12"
                value={rowValue}
                onChange={(event) => updateSeatDetailPart(1, event.target.value)}
                maxLength={SEAT_DETAIL_MAX_LENGTH}
                inputMode="text"
                autoComplete="off"
                aria-describedby="seat-detail-help"
                className="h-12 min-w-0 pr-10 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body text-gray-500 dark:text-gray-300">열</span>
            </div>
          </div>
          <div className="min-w-0">
            <label htmlFor="seatDetailSeat" className="mb-1 block text-body text-gray-600 dark:text-gray-300">번 (선택)</label>
            <div className="relative min-w-0">
              <Input
                id="seatDetailSeat"
                data-testid="mate-create-seat-seat"
                placeholder="예: 15"
                value={seatValue}
                onChange={(event) => updateSeatDetailPart(2, event.target.value)}
                maxLength={SEAT_DETAIL_MAX_LENGTH}
                inputMode="text"
                autoComplete="off"
                aria-describedby="seat-detail-help"
                className="h-12 min-w-0 pr-10 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body text-gray-500 dark:text-gray-300">번</span>
            </div>
          </div>
        </div>
        <p id="seat-detail-help" className="min-w-0 text-body text-gray-500 [overflow-wrap:anywhere] dark:text-gray-300">
          구역·열·좌석 번호를 합해 최대 {SEAT_DETAIL_MAX_LENGTH}자까지 입력할 수 있습니다.
        </p>

        {(effectiveFormData.cheeringSide || effectiveFormData.seatCategory || effectiveFormData.seatDetail) && (
          <div data-testid="mate-create-seat-preview" className="mt-4 flex min-w-0 flex-col gap-2 rounded-lg bg-gray-50 p-3 dark:bg-card sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <span className="shrink-0 text-body text-gray-500 dark:text-gray-300">미리보기</span>
            <span className="min-w-0 break-words text-body font-bold text-gray-700 [overflow-wrap:anywhere] dark:text-white sm:text-right">
              {[
                effectiveFormData.cheeringSide === 'HOME' ? '[홈응원]' : effectiveFormData.cheeringSide === 'AWAY' ? '[원정응원]' : effectiveFormData.cheeringSide === 'NEUTRAL' ? '[중립]' : '',
                effectiveFormData.seatCategory,
                effectiveFormData.seatDetail,
              ].filter(Boolean).join(' ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
