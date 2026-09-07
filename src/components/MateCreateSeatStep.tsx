import { lazy, Suspense } from 'react';

import type { PartyFormData } from '../utils/mateCreateDraft';
import type { SeatCategory } from '../utils/stadiumData';

const MateCreateSeatSelectionFields = lazy(() => import('./MateCreateSeatSelectionFields'));
const MateCreateSeatPricingFields = lazy(() => import('./MateCreateSeatPricingFields'));

interface MateCreateSeatStepProps {
  formData: PartyFormData;
  availableCategoryKeys: SeatCategory[];
  updateFormData: (data: Partial<PartyFormData>) => void;
  visualQaStateOverride?: MateCreateSeatStepVisualQaStateOverride;
}

type SeatStepPhase = 'fallback' | 'runtime';

export type MateCreateSeatStepVisualQaStateOverride = {
  pricingPhase: SeatStepPhase;
  selectionPhase: SeatStepPhase;
};

const seatStepFallbackLabels = {
  pricing: '가격과 예약금 입력 UI를 준비하고 있습니다.',
  selection: '좌석 선택 UI를 준비하고 있습니다.',
} as const;

function SeatStepFallback({ kind }: { kind: keyof typeof seatStepFallbackLabels }) {
  return (
    <div
      data-testid={`mate-create-seat-${kind}-fallback`}
      role="status"
      aria-busy="true"
      className="min-w-0 rounded-2xl border border-border/70 bg-card/70 p-4 [overflow-wrap:anywhere]"
    >
      <p className="mb-4 text-15 font-semibold text-gray-700 dark:text-white">
        {seatStepFallbackLabels[kind]}
      </p>
      <div aria-hidden="true" className="space-y-4 animate-pulse motion-reduce:animate-none">
        <div className="h-28 rounded-xl bg-muted/70 dark:bg-white/10" />
        <div className="h-36 rounded-xl bg-muted/60 dark:bg-white/10" />
      </div>
    </div>
  );
}

export default function MateCreateSeatStep({
  formData,
  availableCategoryKeys,
  updateFormData,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MateCreateSeatStepProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const pricingPhase = visualQaStateOverride?.pricingPhase ?? 'runtime';
  const selectionPhase = visualQaStateOverride?.selectionPhase ?? 'runtime';
  const selectionFallback = <SeatStepFallback kind="selection" />;
  const pricingFallback = <SeatStepFallback kind="pricing" />;

  return (
    <div
      data-testid="mate-create-seat-step"
      data-pricing-phase={pricingPhase}
      data-selection-phase={selectionPhase}
      className="min-w-0 space-y-6 [overflow-wrap:anywhere] sm:space-y-8"
    >
      <h2 className="mb-4 text-lg font-bold text-primary sm:mb-6 sm:text-xl">
        좌석 정보
      </h2>

      {selectionPhase === 'fallback' ? selectionFallback : (
        <Suspense fallback={selectionFallback}>
          <MateCreateSeatSelectionFields
            formData={formData}
            availableCategoryKeys={availableCategoryKeys}
            updateFormData={updateFormData}
          />
        </Suspense>
      )}

      {pricingPhase === 'fallback' ? pricingFallback : (
        <Suspense fallback={pricingFallback}>
          <MateCreateSeatPricingFields
            formData={formData}
            updateFormData={updateFormData}
          />
        </Suspense>
      )}
    </div>
  );
}
