import { lazy, Suspense } from 'react';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import {
  MateCreateChevronLeftIcon as MateChevronLeftIcon,
  MateCreateChevronRightIcon as MateChevronRightIcon,
} from './icons/MateCreateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  useMateCreateController,
  type UseMateCreateControllerReturn,
} from '../hooks/useMateCreateController';
import type { PartyFormData } from '../utils/mateCreateDraft';

const MateCreateTicketStep = lazy(() => import('./MateCreateTicketStep'));
const MateCreateMatchStep = lazy(() => import('./MateCreateMatchStep'));
const MateCreateSeatStep = lazy(() => import('./MateCreateSeatStep'));
const MateCreateDescriptionStep = lazy(() => import('./MateCreateDescriptionStep'));
const MateCreateConfirmDialog = lazy(() => import('./MateCreateConfirmDialog'));
const VerificationRequiredDialog = lazy(() => import('./VerificationRequiredDialog'));

function MateCreateStepFallback() {
  return (
    <div
      data-testid="mate-create-step-fallback"
      role="status"
      aria-busy="true"
      className="min-w-0 py-16 text-center text-body text-gray-500 dark:text-white"
    >
      단계 로딩 중...
    </div>
  );
}

export type MateCreateVisualQaPhase =
  | 'ticket-fallback'
  | 'ticket-runtime'
  | 'match-fallback'
  | 'match-runtime'
  | 'seat-fallback'
  | 'seat-runtime'
  | 'description-fallback'
  | 'description-runtime'
  | 'confirm-fallback'
  | 'confirm-runtime'
  | 'verification-fallback'
  | 'verification-runtime';

export type MateCreateVisualQaStateOverride = {
  controller: Partial<UseMateCreateControllerReturn>;
  phase: MateCreateVisualQaPhase;
};

type MateCreateProps = {
  visualQaStateOverride?: MateCreateVisualQaStateOverride;
};

export default function MateCreate({
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MateCreateProps = {}) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const liveController = useMateCreateController({
    suppressExternalEffects: visualQaStateOverride != null,
  });
  const controller = visualQaStateOverride
    ? { ...liveController, ...visualQaStateOverride.controller }
    : liveController;
  const {
    createStep,
    canGoNext,
    canGoPrev,
    isScanning,
    isSubmitting,
    isSubmitDisabled,
    isLoadingMatches,
    isConfirming,
    availableMatches,
    errorType,
    formData,
    formErrors,
    updateFormData,
    goNext,
    goPrev,
    confirmSubmit,
    cancelSubmit,
    retry,
    availableCategoryKeys,
    blockedStepMessage,
    fileErrorMessage,
    handleBack,
    handleDescriptionBlur,
    handleDescriptionChange,
    handleFileUpload,
    handleSubmit,
    knownStadiumNames,
    matchLoadErrorMessage,
    progressValue,
    selectMatch,
    setShowVerificationDialog,
    showVerificationDialog,
  } = controller;
  const phase = visualQaStateOverride?.phase;
  const safeProgressValue = Number.isFinite(progressValue)
    ? Math.min(100, Math.max(0, progressValue))
    : 0;

  return (
    <div
      data-testid="mate-create"
      className="min-h-dvh min-w-0 overflow-x-clip bg-gray-50 transition-colors duration-200 dark:bg-background"
    >
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
        width={2000}
        height={2000}
        sizes="100vw"
        fetchPriority="low"
      />

      <div className="relative z-10 mx-auto min-w-0 max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <Button
            data-testid="mate-create-back"
            variant="ghost"
            size="touch"
            onClick={handleBack}
            className="-ml-2 mb-3 dark:text-white sm:mb-4 sm:ml-0"
          >
            <MateChevronLeftIcon className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <h1 className="mb-2 text-3xl sm:text-4xl text-primary">
            직관메이트 파티 만들기
          </h1>
          <p className="text-body text-gray-600 dark:text-white sm:text-base">단계별로 파티 정보를 입력해주세요</p>
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-body text-gray-600 dark:text-white">단계 {createStep} / 4</span>
            <span className="text-body text-primary">
              {safeProgressValue.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={safeProgressValue}
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${safeProgressValue}%` }}
            />
          </div>
        </div>

        <Card className="min-w-0 p-5 sm:p-8">
          {createStep === 1 && (
            phase === 'ticket-fallback' ? <MateCreateStepFallback /> : (
              <Suspense fallback={<MateCreateStepFallback />}>
                <MateCreateTicketStep
                  isScanning={isScanning}
                  ticketFile={formData.ticketFile}
                  fileErrorMessage={fileErrorMessage}
                  errorType={errorType}
                  retry={retry}
                  onFileUpload={handleFileUpload}
                  updateFormData={updateFormData as (data: Partial<PartyFormData>) => void}
                  goNext={goNext}
                />
              </Suspense>
            )
          )}

          {createStep === 2 && (
            phase === 'match-fallback' ? <MateCreateStepFallback /> : (
              <Suspense fallback={<MateCreateStepFallback />}>
                <MateCreateMatchStep
                  formData={formData}
                  matchLoadErrorMessage={matchLoadErrorMessage}
                  isLoadingMatches={isLoadingMatches}
                  availableMatches={availableMatches}
                  retry={retry}
                  selectMatch={selectMatch}
                  updateFormData={updateFormData as (data: Partial<PartyFormData>) => void}
                  knownStadiumNames={knownStadiumNames}
                />
              </Suspense>
            )
          )}

          {createStep === 3 && (
            phase === 'seat-fallback' ? <MateCreateStepFallback /> : (
              <Suspense fallback={<MateCreateStepFallback />}>
                <MateCreateSeatStep
                  formData={formData}
                  availableCategoryKeys={availableCategoryKeys}
                  updateFormData={updateFormData as (data: Partial<PartyFormData>) => void}
                />
              </Suspense>
            )
          )}

          {createStep === 4 && (
            phase === 'description-fallback' ? <MateCreateStepFallback /> : (
              <Suspense fallback={<MateCreateStepFallback />}>
                <MateCreateDescriptionStep
                  formData={formData}
                  formErrors={formErrors}
                  onDescriptionChange={handleDescriptionChange}
                  onDescriptionBlur={handleDescriptionBlur}
                />
              </Suspense>
            )
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            {createStep > 1 && (
              <Button
                data-testid="mate-create-prev"
                variant="outline"
                size="touch"
                onClick={goPrev}
                disabled={!canGoPrev}
                className="flex-1"
              >
                이전
              </Button>
            )}
            {createStep < 4 ? (
              <Button
                data-testid="mate-create-next"
                size="touch"
                onClick={goNext}
                disabled={!canGoNext}
                className="flex-1 text-white bg-primary"
              >
                다음
                <MateChevronRightIcon className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                data-testid="mate-create-submit"
                size="touch"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="flex-1 text-white bg-primary"
              >
                파티 만들기
              </Button>
            )}
          </div>
          {blockedStepMessage && (
            <p className={`mt-3 min-w-0 text-center text-body [overflow-wrap:anywhere] ${createStep === 4 ? 'text-red-500' : 'text-amber-600'}`}>
              {blockedStepMessage}
            </p>
          )}
        </Card>
      </div>

      {isConfirming && (
        phase === 'confirm-fallback' ? (
          <div
            data-testid="mate-create-confirm-fallback"
            role="status"
            aria-busy="true"
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          >
            <div className="w-full max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-6 text-center text-body text-muted-foreground shadow-dialog sm:max-w-md">
              파티 생성 확인 화면을 준비하고 있습니다.
            </div>
          </div>
        ) : (
          <Suspense fallback={(
            <div
              data-testid="mate-create-confirm-fallback"
              role="status"
              aria-busy="true"
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
            >
              <div className="w-full max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-6 text-center text-body text-muted-foreground shadow-dialog sm:max-w-md">
                파티 생성 확인 화면을 준비하고 있습니다.
              </div>
            </div>
          )}>
            <MateCreateConfirmDialog
              formData={formData}
              isSubmitting={isSubmitting}
              onCancel={cancelSubmit}
              onConfirm={confirmSubmit}
            />
          </Suspense>
        )
      )}

      {showVerificationDialog && (
        phase === 'verification-fallback' ? (
          <div
            data-testid="mate-create-verification-fallback"
            role="status"
            aria-busy="true"
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          >
            <div className="w-full max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-6 text-center text-body text-muted-foreground shadow-dialog sm:max-w-md">
              본인 인증 안내를 준비하고 있습니다.
            </div>
          </div>
        ) : (
          <Suspense fallback={(
            <div
              data-testid="mate-create-verification-fallback"
              role="status"
              aria-busy="true"
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
            >
              <div className="w-full max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-6 text-center text-body text-muted-foreground shadow-dialog sm:max-w-md">
                본인 인증 안내를 준비하고 있습니다.
              </div>
            </div>
          )}>
            <VerificationRequiredDialog
              isOpen={showVerificationDialog}
              onClose={() => setShowVerificationDialog(false)}
            />
          </Suspense>
        )
      )}
    </div>
  );
}
