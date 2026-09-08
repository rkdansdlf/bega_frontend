import { useEffect, useState } from 'react';

import { Button } from './ui/plain-button';
import PlainDialog from './ui/plain-dialog';
import { Input } from './ui/input';
import type { CancelReasonType } from '../types/mate';

type CancelReasonOption = {
  value: CancelReasonType;
  label: string;
  description: string;
};

export type MateDetailActionDialogsVisualQaStateOverride = {
  interactive: boolean;
};

interface MateDetailActionDialogsProps {
  showCancelDialog: boolean;
  showSaleDialog: boolean;
  isCancelling: boolean;
  isConvertingToSale: boolean;
  cancelReasonOptions: CancelReasonOption[];
  selectedCancelReason: CancelReasonType;
  cancelMemo: string;
  salePrice: string;
  salePriceError: string;
  onCloseCancelDialog: () => void;
  onExecuteCancelApplication: () => void;
  onSelectCancelReason: (reason: CancelReasonType) => void;
  onChangeCancelMemo: (value: string) => void;
  onCloseSaleDialog: () => void;
  onConfirmSale: () => void;
  onChangeSalePrice: (value: string) => void;
  visualQaStateOverride?: MateDetailActionDialogsVisualQaStateOverride;
}

export default function MateDetailActionDialogs({
  showCancelDialog,
  showSaleDialog,
  isCancelling,
  isConvertingToSale,
  cancelReasonOptions,
  selectedCancelReason,
  cancelMemo,
  salePrice,
  salePriceError,
  onCloseCancelDialog,
  onExecuteCancelApplication,
  onSelectCancelReason,
  onChangeCancelMemo,
  onCloseSaleDialog,
  onConfirmSale,
  onChangeSalePrice,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MateDetailActionDialogsProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaInteractive = visualQaStateOverride?.interactive === true;
  const [visualSelectedCancelReason, setVisualSelectedCancelReason] = useState(selectedCancelReason);
  const [visualCancelMemo, setVisualCancelMemo] = useState(cancelMemo);
  const [visualSalePrice, setVisualSalePrice] = useState(salePrice);
  const [visualIsCancelling, setVisualIsCancelling] = useState(isCancelling);
  const [visualIsConvertingToSale, setVisualIsConvertingToSale] = useState(isConvertingToSale);

  useEffect(() => {
    if (!visualQaInteractive) return;
    setVisualSelectedCancelReason(selectedCancelReason);
    setVisualCancelMemo(cancelMemo);
    setVisualSalePrice(salePrice);
    setVisualIsCancelling(isCancelling);
    setVisualIsConvertingToSale(isConvertingToSale);
  }, [
    cancelMemo,
    isCancelling,
    isConvertingToSale,
    salePrice,
    selectedCancelReason,
    visualQaInteractive,
  ]);

  const selectedCancelReasonValue = visualQaInteractive
    ? visualSelectedCancelReason
    : selectedCancelReason;
  const cancelMemoValue = visualQaInteractive ? visualCancelMemo : cancelMemo;
  const salePriceValue = visualQaInteractive ? visualSalePrice : salePrice;
  const isCancellingValue = visualQaInteractive ? visualIsCancelling : isCancelling;
  const isConvertingToSaleValue = visualQaInteractive
    ? visualIsConvertingToSale
    : isConvertingToSale;

  const handleSelectCancelReason = (reason: CancelReasonType) => {
    if (visualQaInteractive) setVisualSelectedCancelReason(reason);
    onSelectCancelReason(reason);
  };
  const handleChangeCancelMemo = (value: string) => {
    if (visualQaInteractive) setVisualCancelMemo(value);
    onChangeCancelMemo(value);
  };
  const handleChangeSalePrice = (value: string) => {
    if (visualQaInteractive) setVisualSalePrice(value);
    onChangeSalePrice(value);
  };
  const handleExecuteCancelApplication = () => {
    if (visualQaInteractive) setVisualIsCancelling(true);
    onExecuteCancelApplication();
  };
  const handleConfirmSale = () => {
    if (visualQaInteractive) setVisualIsConvertingToSale(true);
    onConfirmSale();
  };

  return (
    <>
      <PlainDialog
        open={showCancelDialog}
        onClose={onCloseCancelDialog}
        title="취소 사유 선택"
        contentTestId="mate-detail-cancel-dialog"
        className="max-w-[calc(100vw-2rem)] sm:max-w-lg"
        bodyClassName="[overflow-wrap:anywhere]"
        footer={(
          <>
            <Button
              data-testid="mate-detail-cancel-back"
              variant="outline"
              size="touch"
              className="min-h-11 w-full sm:w-auto"
              disabled={isCancellingValue}
              onClick={onCloseCancelDialog}
            >
              뒤로가기
            </Button>
            <Button
              data-testid="mate-detail-cancel-confirm"
              data-pending={isCancellingValue}
              size="touch"
              disabled={isCancellingValue}
              className="min-h-11 w-full bg-primary text-white sm:w-auto"
              onClick={handleExecuteCancelApplication}
            >
              {isCancellingValue ? '취소 처리 중...' : '취소하기'}
            </Button>
          </>
        )}
      >
        <div className="py-2">
          <p className="mb-3 text-body text-gray-600 dark:text-white/70">
            직거래 파티는 취소 시 플랫폼 결제/환불이 적용되지 않습니다.
          </p>
          <div className="space-y-2" role="group" aria-label="취소 사유">
            {cancelReasonOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                data-testid={`mate-detail-cancel-reason-${option.value}`}
                aria-pressed={selectedCancelReasonValue === option.value}
                onClick={() => handleSelectCancelReason(option.value)}
                className={`min-h-11 min-w-0 w-full rounded-lg border px-3 py-2 text-left transition-colors [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:transform-none dark:focus-visible:ring-offset-[#000000] ${selectedCancelReasonValue === option.value
                  ? 'border-primary bg-primary/10 text-primary dark:border-emerald-400 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-gray-200 bg-white text-gray-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white'
                  }`}
                disabled={isCancellingValue}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="text-body text-gray-500 dark:text-white/60">{option.description}</p>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label htmlFor="mate-detail-cancel-memo" className="mb-1 block text-body font-semibold text-gray-700 dark:text-white/80">
              추가 메모 (선택)
            </label>
            <Input
              id="mate-detail-cancel-memo"
              data-testid="mate-detail-cancel-memo"
              data-current-value={cancelMemoValue}
              value={cancelMemoValue}
              onChange={(event) => handleChangeCancelMemo(event.target.value)}
              placeholder="선택 사유를 더 자세히 입력하세요."
              disabled={isCancellingValue}
              className="min-h-11"
            />
          </div>
        </div>
      </PlainDialog>

      <PlainDialog
        open={showSaleDialog}
        onClose={onCloseSaleDialog}
        title="티켓 판매 전환"
        contentTestId="mate-detail-sale-dialog"
        className="max-w-[calc(100vw-2rem)] sm:max-w-md"
        bodyClassName="[overflow-wrap:anywhere]"
        footer={(
          <>
            <Button
              data-testid="mate-detail-sale-cancel"
              variant="outline"
              size="touch"
              className="min-h-11 w-full sm:w-auto"
              disabled={isConvertingToSaleValue}
              onClick={onCloseSaleDialog}
            >
              취소
            </Button>
            <Button
              data-testid="mate-detail-sale-confirm"
              data-pending={isConvertingToSaleValue}
              size="touch"
              disabled={isConvertingToSaleValue}
              className="min-h-11 w-full bg-primary text-white sm:w-auto"
              onClick={handleConfirmSale}
            >
              {isConvertingToSaleValue ? '전환 중...' : '확인'}
            </Button>
          </>
        )}
      >
        <div className="py-2">
          <label htmlFor="mate-detail-sale-price" className="mb-1 block text-body font-semibold text-gray-700 dark:text-white/80">
            판매 가격 (원)
          </label>
          <Input
            id="mate-detail-sale-price"
            data-testid="mate-detail-sale-price"
            data-current-value={salePriceValue}
            type="number"
            inputMode="numeric"
            min={100}
            step={1}
            placeholder="예: 15000"
            value={salePriceValue}
            onChange={(event) => handleChangeSalePrice(event.target.value)}
            aria-invalid={Boolean(salePriceError)}
            aria-describedby={salePriceError ? 'mate-detail-sale-price-error' : undefined}
            disabled={isConvertingToSaleValue}
            className="mt-1 min-h-11"
          />
          {salePriceError && (
            <p id="mate-detail-sale-price-error" role="alert" className="mt-1 text-body text-red-500 [overflow-wrap:anywhere] dark:text-red-300">
              {salePriceError}
            </p>
          )}
        </div>
      </PlainDialog>
    </>
  );
}
