import { useEffect, useRef } from 'react';

import { Button } from './ui/button';
import TeamLogo from './TeamLogo';
import { TEAMS } from '../utils/constants';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface MateCreateConfirmDialogProps {
  formData: PartyFormData;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function MateCreateConfirmDialog({
  formData,
  isSubmitting,
  onCancel,
  onConfirm,
}: MateCreateConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, { active: true, initialFocus: 'container' });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onCancel]);

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onCancel} />
      <div className="absolute inset-0 overflow-y-auto p-4" onClick={onCancel}>
        <div className="flex min-h-full items-start justify-center sm:items-center">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-busy={isSubmitting}
            aria-labelledby="mate-create-confirm-title"
            aria-describedby="mate-create-confirm-description"
            data-testid="mate-create-confirm-dialog"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="min-w-0 w-full max-w-[calc(100vw-2rem)] overflow-x-clip rounded-xl border bg-background p-6 shadow-dialog ring-1 ring-black/5 focus:outline-none sm:max-w-md"
          >
            <div className="min-w-0 space-y-2">
              <h2 id="mate-create-confirm-title" className="text-lg font-semibold text-primary">
                파티 생성 확인
              </h2>
              <p id="mate-create-confirm-description" className="text-body text-muted-foreground">
                아래 내용을 확인하고 파티를 생성하시겠습니까?
              </p>
            </div>

            <div className="min-w-0 space-y-4 py-4">
              <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-gray-50 p-4 dark:bg-card sm:flex-row sm:items-center sm:justify-center">
              <div className="flex items-center justify-center gap-2">
                <TeamLogo teamId={formData.awayTeam} size="sm" />
                <span className="font-bold text-body text-foreground">
                  {TEAMS.find((team) => team.id === formData.awayTeam)?.name}
                </span>
              </div>
              <span className="text-center text-gray-400 text-body font-bold">VS</span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-bold text-body text-foreground">
                  {TEAMS.find((team) => team.id === formData.homeTeam)?.name}
                </span>
                <TeamLogo teamId={formData.homeTeam} size="sm" />
              </div>
            </div>

            <div className="space-y-2 text-body">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <span className="text-gray-500">경기 일시</span>
                <span className="min-w-0 break-words font-semibold text-foreground [overflow-wrap:anywhere] sm:text-right">
                  {formData.gameDate} {formData.gameTime || '18:30'}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <span className="text-gray-500">경기장</span>
                <span className="min-w-0 break-words font-semibold text-foreground [overflow-wrap:anywhere] sm:text-right">{formatStadiumDisplayName(formData.stadium)}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <span className="text-gray-500">좌석</span>
                <span className="min-w-0 break-words font-semibold text-foreground [overflow-wrap:anywhere] sm:text-right">
                  {formData.seatDetail
                    ? [
                      formData.cheeringSide === 'HOME' ? '[홈응원]' : formData.cheeringSide === 'AWAY' ? '[원정응원]' : formData.cheeringSide === 'NEUTRAL' ? '[중립]' : '',
                      formData.seatCategory,
                      formData.seatDetail,
                    ].filter(Boolean).join(' ')
                    : formData.section}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <span className="text-gray-500">모집 인원</span>
                <span className="min-w-0 font-semibold text-foreground [overflow-wrap:anywhere] sm:text-right">{formData.maxParticipants}명 (본인 포함)</span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3 text-body">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <span className="text-gray-500">거래 기준 금액</span>
                <span className="min-w-0 font-semibold text-foreground [overflow-wrap:anywhere] sm:text-right">{formData.ticketPrice.toLocaleString()}원</span>
              </div>
              {formData.reservationDepositAmount > 0 && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <span className="text-gray-500">예약금</span>
                  <span className="min-w-0 font-semibold text-foreground [overflow-wrap:anywhere] sm:text-right">{formData.reservationDepositAmount.toLocaleString()}원</span>
                </div>
              )}
              <p className="text-body text-gray-500">
                앱 내 결제 없이 승인 후 채팅으로 직거래를 진행합니다.
              </p>
            </div>

            <div className="border-t pt-3">
              <p className="mb-1 text-body text-gray-500">소개글</p>
              <p className="min-w-0 line-clamp-3 text-body text-gray-700 [overflow-wrap:anywhere] dark:text-white">
                {formData.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              data-testid="mate-create-confirm-cancel"
              variant="outline"
              size="touch"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              수정하기
            </Button>
            <Button
              data-testid="mate-create-confirm-submit"
              size="touch"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="w-full bg-primary text-white sm:w-auto"
            >
              {isSubmitting ? '생성 중...' : '확인'}
            </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
