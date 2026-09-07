import { useState } from 'react';

import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { FieldLabel } from './MateCreatePrimitives';

interface MateCreateSeatPricingFieldsProps {
  formData: PartyFormData;
  updateFormData: (data: Partial<PartyFormData>) => void;
  visualQaInteractive?: boolean;
}

export default function MateCreateSeatPricingFields({
  formData,
  updateFormData,
  visualQaInteractive,
}: MateCreateSeatPricingFieldsProps) {
  const [visualQaFormData, setVisualQaFormData] = useState(formData);
  const shouldUseVisualQaState = import.meta.env?.PROD !== true && visualQaInteractive === true;
  const effectiveFormData = shouldUseVisualQaState ? visualQaFormData : formData;
  const effectiveUpdateFormData = shouldUseVisualQaState
    ? (data: Partial<PartyFormData>) => setVisualQaFormData((current) => ({ ...current, ...data }))
    : updateFormData;

  return (
    <div
      data-testid="mate-create-seat-pricing-fields"
      className="min-w-0 space-y-6 [overflow-wrap:anywhere]"
    >
      <div className="min-w-0 space-y-2">
        <FieldLabel htmlFor="maxParticipants" className="text-base font-bold sm:text-lg">모집 인원 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <select
          id="maxParticipants"
          data-testid="mate-create-max-participants"
          data-selected-value={effectiveFormData.maxParticipants}
          value={effectiveFormData.maxParticipants.toString()}
          onChange={(event) => effectiveUpdateFormData({ maxParticipants: parseInt(event.target.value, 10) })}
          required
          className="h-12 min-w-0 w-full rounded-md border border-gray-300 bg-white px-3 text-body text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-border dark:bg-input/30 dark:text-white"
        >
          <option value="2">2명 (본인 포함)</option>
          <option value="3">3명 (본인 포함)</option>
          <option value="4">4명 (본인 포함)</option>
        </select>
      </div>

      <div className="min-w-0 space-y-2">
        <FieldLabel htmlFor="ticketPrice" className="text-base font-bold sm:text-lg">티켓 가격 (1인당) <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <div className="relative min-w-0">
          <Input
            id="ticketPrice"
            data-testid="mate-create-ticket-price"
            type="number"
            min="1000"
            step="1000"
            required
            inputMode="numeric"
            value={effectiveFormData.ticketPrice || ''}
            onChange={(event) => effectiveUpdateFormData({ ticketPrice: parseInt(event.target.value, 10) || 0 })}
            placeholder="예: 12000"
            aria-describedby="ticket-price-help"
            className="h-12 pr-12 text-base sm:text-lg"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold dark:text-white">
            원
          </span>
        </div>
        <p id="ticket-price-help" className="text-body text-gray-500 mt-2 min-w-0 px-1 [overflow-wrap:anywhere] dark:text-white">
          * 선택하신 <span className="font-bold text-primary">{effectiveFormData.seatCategory}</span> 기준 예상 가격입니다. 실제 예매 가격과 다를 수 있습니다.
        </p>
        {effectiveFormData.ticketPrice > 0 && (
          <Alert data-testid="mate-create-ticket-price-alert" className="min-w-0">
            <AlertDescription className="min-w-0 text-body [overflow-wrap:anywhere] dark:text-white">
              참여자는 호스트 승인 후 채팅에서 티켓 가격 <span className="text-primary">{effectiveFormData.ticketPrice.toLocaleString()}원</span> 기준으로 직거래를 조율합니다.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="min-w-0 space-y-2">
        <FieldLabel htmlFor="reservationDepositAmount" className="text-base font-bold sm:text-lg">예약금 (선택)</FieldLabel>
        <div className="relative min-w-0">
          <Input
            id="reservationDepositAmount"
            data-testid="mate-create-reservation-deposit"
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            value={effectiveFormData.reservationDepositAmount || ''}
            onChange={(event) => effectiveUpdateFormData({ reservationDepositAmount: parseInt(event.target.value, 10) || 0 })}
            placeholder="예: 5000"
            aria-describedby="reservation-deposit-help"
            className="h-12 pr-12 text-base sm:text-lg"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold dark:text-white">
            원
          </span>
        </div>
        <p id="reservation-deposit-help" className="text-body text-gray-500 mt-2 min-w-0 px-1 [overflow-wrap:anywhere] dark:text-white">
          비워두면 상세 페이지에는 예약금 대신 승인 후 직거래 안내가 표시됩니다.
        </p>
      </div>
    </div>
  );
}
