import type { ChangeEvent } from 'react';

import {
  MateCreateAlertCircleIcon as MateAlertCircleIcon,
  MateCreateCheckCircleIcon as MateCheckCircleIcon,
  MateCreateLoaderIcon as MateLoaderIcon,
  MateCreateTicketIcon as MateTicketIcon,
} from './icons/MateCreateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { FieldLabel } from './MateCreatePrimitives';

interface MateCreateTicketStepProps {
  isScanning: boolean;
  ticketFile: File | null;
  fileErrorMessage: string;
  errorType: 'scan' | 'matches' | 'submit' | null;
  retry: () => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  updateFormData: (data: Partial<PartyFormData>) => void;
  goNext: () => void;
  visualQaStateOverride?: MateCreateTicketStepVisualQaStateOverride;
}

export type MateCreateTicketStepVisualQaStateOverride = {
  showDevelopmentFixture: boolean;
};

export default function MateCreateTicketStep({
  isScanning,
  ticketFile,
  fileErrorMessage,
  errorType,
  retry,
  onFileUpload,
  updateFormData,
  goNext,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MateCreateTicketStepProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const isScanFailed = errorType === 'scan' && Boolean(ticketFile);
  const hasValidationError = errorType !== 'scan' && Boolean(fileErrorMessage);
  const uploadState = isScanning
    ? 'scanning'
    : isScanFailed
      ? 'scan-error'
      : hasValidationError
        ? 'validation-error'
        : ticketFile
          ? 'selected'
          : 'idle';
  const showDevelopmentFixture = import.meta.env?.DEV === true
    && visualQaStateOverride?.showDevelopmentFixture !== false;

  return (
    <div
      data-testid="mate-create-ticket-step"
      className="min-w-0 space-y-6 [overflow-wrap:anywhere]"
    >
      <h2 className="mb-4 text-lg font-bold text-primary sm:mb-6 sm:text-xl">
        티켓 인증
      </h2>

      <div className="space-y-4">
        <FieldLabel>예매내역 스크린샷</FieldLabel>
        <div
          data-testid="mate-create-ticket-upload"
          data-upload-state={uploadState}
          aria-busy={isScanning}
          className={`min-w-0 rounded-xl border-2 border-dashed p-4 text-center transition-colors sm:p-8 ${isScanning
            ? 'border-primary bg-slate-50 dark:bg-card/60'
            : isScanFailed || hasValidationError
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : ticketFile
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-slate-300 dark:border-border bg-slate-50 dark:bg-card/60 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
        >
          <input
            type="file"
            id="ticketFile"
            accept="image/*"
            onChange={onFileUpload}
            className="hidden"
            disabled={isScanning}
            aria-label="티켓 이미지 업로드"
          />
          <label
            htmlFor="ticketFile"
            tabIndex={isScanning ? -1 : 0}
            role="button"
            aria-disabled={isScanning}
            data-testid="mate-create-ticket-picker"
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !isScanning) {
                event.preventDefault();
                document.getElementById('ticketFile')?.click();
              }
            }}
            className={`flex min-h-11 min-w-0 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:bg-black/5 dark:active:bg-white/10 ${isScanning ? 'pointer-events-none cursor-default' : 'cursor-pointer'}`}
          >
            {isScanning ? (
              <div
                className="flex min-w-0 flex-col items-center gap-3"
                role="status"
                aria-live="polite"
              >
                <MateLoaderIcon className="h-10 w-10 animate-spin text-primary motion-reduce:animate-none sm:h-14 sm:w-14" />
                <p className="text-base font-bold text-primary sm:text-lg">AI가 티켓을 분석 중...</p>
                <p className="text-body text-muted-foreground sm:text-base">경기 정보를 자동으로 추출합니다</p>
              </div>
            ) : isScanFailed ? (
              <div className="flex min-w-0 flex-col items-center gap-3">
                <MateAlertCircleIcon className="h-10 w-10 text-red-500 sm:h-14 sm:w-14" />
                <p
                  className="line-clamp-3 break-all text-base font-bold text-red-700 dark:text-red-300 sm:text-lg"
                  title={ticketFile?.name}
                >
                  {ticketFile?.name}
                </p>
                <p className="text-body font-semibold text-red-600 dark:text-red-400 sm:text-base">
                  파일 업로드 완료, AI 분석 실패
                </p>
                <p className="text-body text-gray-500">클릭 또는 Enter로 다른 파일 선택</p>
              </div>
            ) : ticketFile ? (
              <div className="flex min-w-0 flex-col items-center gap-3">
                <MateCheckCircleIcon className="h-10 w-10 text-green-500 sm:h-14 sm:w-14" />
                <p
                  className="line-clamp-3 break-all text-base font-bold text-green-700 dark:text-green-400 sm:text-lg"
                  title={ticketFile.name}
                >
                  {ticketFile.name}
                </p>
                <p className="text-body text-gray-500">클릭 또는 Enter로 다른 파일 선택</p>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col items-center gap-3">
                <MateTicketIcon className="h-10 w-10 text-primary sm:h-14 sm:w-14" />
                <p className="text-base font-bold text-primary sm:text-lg">티켓 사진으로 자동 입력</p>
                <p className="text-body text-gray-500">JPG, PNG (최대 10MB)</p>
              </div>
            )}
          </label>
        </div>
        {fileErrorMessage && (
          <div
            data-testid="mate-create-ticket-error"
            className="min-w-0 rounded-lg border border-red-300 bg-red-50 px-3 py-2 [overflow-wrap:anywhere] dark:border-red-800 dark:bg-red-950/30"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-body font-semibold text-red-700 dark:text-red-300">
              {fileErrorMessage}
            </p>
          </div>
        )}
        {errorType === 'scan' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={isScanning}
            data-testid="mate-create-ticket-retry"
            className="min-h-11 w-full sm:w-auto"
          >
            다시 시도
          </Button>
        )}
      </div>

      <Alert>
        <MateAlertCircleIcon className="w-4 h-4" />
        <AlertDescription>
          <ul className="list-outside space-y-1 pl-5 text-body">
            <li>티켓 사진을 올리면 AI가 경기 정보를 자동으로 입력합니다</li>
            <li>예매번호와 좌석 정보가 명확히 보여야 합니다</li>
            <li>개인정보는 가려서 업로드해주세요</li>
            <li className="font-semibold text-primary">티켓 업로드는 파티 생성 필수 조건입니다</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="mt-4 flex min-w-0 flex-col items-center gap-3 border-t border-dashed border-gray-200 pt-4">
        <p className="text-center text-body text-gray-500 [overflow-wrap:anywhere]">OCR이 실패하면 같은 파일 또는 다른 파일로 다시 시도해주세요.</p>
        {showDevelopmentFixture && (
          <button
            type="button"
            onClick={() => {
              updateFormData({
                gameDate: '2026-05-23',
                gameTime: '17:00',
                homeTeam: 'doosan',
                awayTeam: 'lg',
                stadium: '잠실야구장',
                section: '',
                cheeringSide: 'HOME',
                seatCategory: '일반/시야',
                seatDetail: '1루 네이비석 305블록 12열 15번',
                maxParticipants: 1,
                ticketPrice: 25000,
                reservationNumber: 'T-1234567890',
                ticketFile: new File([''], 'test-ticket.jpg', { type: 'image/jpeg' }),
              });
              goNext();
            }}
            className="text-body text-gray-300 hover:text-gray-500 transition-colors"
          >
            (테스트 데이터로 채우기)
          </button>
        )}
      </div>
    </div>
  );
}
