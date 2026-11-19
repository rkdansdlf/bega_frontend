import type { ReactNode } from 'react';
import { Card } from '../ui/card';
import { PREDICTION_SURFACE_CARD_CLASS } from './predictionUiTokens';

interface PredictionLoadingViewProps {
  topNotice: ReactNode | null;
}

// 경기 목록(날짜 머리 · 날짜 띠 · 리그 카드 · 경기 행)과 같은 골격만 보여줍니다.
const BLOCK = 'animate-pulse bg-slate-100 motion-reduce:animate-none dark:bg-secondary';
const LOADING_ROW_COUNT = 5;
const DAY_STRIP_COUNT = 13;

function PredictionLoadingRow() {
  return (
    <div className="border-b border-slate-100 px-4 py-5 last:border-b-0 dark:border-border sm:px-6">
      {/* 데스크톱: 시간 · 구장 · 원정 · 상태 · 홈 · 전력 */}
      <div className="hidden items-center gap-4 md:grid md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_4rem_minmax(0,1fr)_minmax(0,0.6fr)]">
        <div className={`h-5 w-12 rounded-full ${BLOCK}`} />
        <div className={`h-4 w-32 rounded-full ${BLOCK}`} />
        <div className="flex items-center justify-end gap-3">
          <div className="space-y-1.5">
            <div className={`ml-auto h-5 w-10 rounded-full ${BLOCK}`} />
            <div className={`h-3 w-12 rounded-full ${BLOCK}`} />
          </div>
          <div className={`h-8 w-8 rounded-full ${BLOCK}`} />
        </div>
        <div className={`mx-auto h-5 w-9 rounded-full ${BLOCK}`} />
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full ${BLOCK}`} />
          <div className="space-y-1.5">
            <div className={`h-5 w-12 rounded-full ${BLOCK}`} />
            <div className={`h-3 w-12 rounded-full ${BLOCK}`} />
          </div>
        </div>
        <div className={`ml-auto h-10 w-[72px] rounded-lg ${BLOCK}`} />
      </div>
      {/* 모바일: 시간 · 원정(위아래) · 상태 · 홈(위아래) · 전력, 아래 구장 */}
      <div className="md:hidden">
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3rem_minmax(0,1fr)_3.75rem] items-center gap-2">
          <div className={`h-5 w-12 rounded-full ${BLOCK}`} />
          <div className="flex flex-col items-center gap-1.5">
            <div className={`h-4 w-10 rounded-full ${BLOCK}`} />
            <div className={`h-7 w-7 rounded-full ${BLOCK}`} />
          </div>
          <div className={`mx-auto h-4 w-8 rounded-full ${BLOCK}`} />
          <div className="flex flex-col items-center gap-1.5">
            <div className={`h-7 w-7 rounded-full ${BLOCK}`} />
            <div className={`h-4 w-10 rounded-full ${BLOCK}`} />
          </div>
          <div className={`h-11 w-full rounded-lg ${BLOCK}`} />
        </div>
        <div className={`mt-3 h-6 w-full rounded-lg ${BLOCK}`} />
      </div>
    </div>
  );
}

export default function PredictionLoadingView({ topNotice }: PredictionLoadingViewProps) {
  return (
    <div className="font-sans" role="status" aria-busy="true" aria-live="polite" data-testid="prediction-loading-view">
      <span className="sr-only">경기 일정을 불러오고 있어요</span>
      {topNotice && (
        <div className="mb-3 flex justify-center sm:justify-end">
          {topNotice}
        </div>
      )}

      {/* 날짜 머리 */}
      <div aria-hidden="true" className="mb-4">
        <div className="hidden items-center justify-center gap-6 py-2 md:flex">
          <div className={`h-10 w-16 rounded-full ${BLOCK}`} />
          <div className={`h-12 w-56 rounded-xl ${BLOCK}`} />
          <div className={`h-7 w-7 rounded-md ${BLOCK}`} />
        </div>
        <div className="mt-3 hidden gap-2 border-b border-slate-100 pb-3 dark:border-border md:grid" style={{ gridTemplateColumns: `repeat(${DAY_STRIP_COUNT}, minmax(0, 1fr))` }}>
          {Array.from({ length: DAY_STRIP_COUNT }, (_, index) => (
            <div key={`day-${index}`} className="flex flex-col items-center gap-2">
              <div className={`h-3 w-4 rounded ${BLOCK}`} />
              <div className={`h-7 w-8 rounded-md ${BLOCK}`} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 md:hidden">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl ${BLOCK}`} />
            <div className="space-y-2">
              <div className={`h-3 w-20 rounded-full ${BLOCK}`} />
              <div className={`h-5 w-24 rounded-full ${BLOCK}`} />
            </div>
          </div>
          <div className={`h-12 w-28 rounded-2xl ${BLOCK}`} />
        </div>
      </div>

      <Card aria-hidden="true" className={`${PREDICTION_SURFACE_CARD_CLASS} overflow-hidden rounded-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-border">
          <div className={`h-6 w-24 rounded-full ${BLOCK}`} />
          <div className={`h-6 w-14 rounded-full ${BLOCK}`} />
        </div>
        {Array.from({ length: LOADING_ROW_COUNT }, (_, index) => (
          <PredictionLoadingRow key={`prediction-loading-row-${index}`} />
        ))}
      </Card>
    </div>
  );
}
