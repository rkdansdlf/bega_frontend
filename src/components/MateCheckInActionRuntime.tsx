import { cn } from '../lib/utils';
import {
  mateInsetPanelClass,
  mateMetaLabelClass,
  mateMobileBarClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import { MateCheckCircleIcon, MateLoaderIcon } from './icons/MateFlowIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface MateCheckInActionRuntimeProps {
  isCheckedIn: boolean;
  isChecking: boolean;
  allCheckedIn: boolean;
  isHost: boolean;
  checkedInCount: number;
  totalParticipants: number;
  onCheckIn: () => void;
  onComplete: () => void;
  onNavigateToChat: () => void;
}

export default function MateCheckInActionRuntime({
  isCheckedIn,
  isChecking,
  allCheckedIn,
  isHost,
  checkedInCount,
  totalParticipants,
  onCheckIn,
  onComplete,
  onNavigateToChat,
}: MateCheckInActionRuntimeProps) {
  const safeTotalParticipants = Number.isFinite(totalParticipants)
    ? Math.max(0, Math.trunc(totalParticipants))
    : 0;
  const safeCheckedInCount = Number.isFinite(checkedInCount)
    ? Math.min(safeTotalParticipants, Math.max(0, Math.trunc(checkedInCount)))
    : 0;
  const primaryMobileAction = !isCheckedIn
    ? {
      label: isChecking ? '처리 중...' : '체크인하기',
      onClick: onCheckIn,
      disabled: isChecking,
      className: 'bg-primary text-white',
    }
    : allCheckedIn
      ? {
        label: '완료 확인',
        onClick: onComplete,
        disabled: false,
        className: 'bg-primary text-white',
      }
      : null;
  const mobileSummary = !isCheckedIn
    ? `${safeCheckedInCount}/${safeTotalParticipants}명 체크인 완료`
    : allCheckedIn
      ? `${safeCheckedInCount}/${safeTotalParticipants}명 · 전원 체크인 완료`
      : isHost
        ? `${safeCheckedInCount}/${safeTotalParticipants}명 · 참여자 도착 확인 중`
        : `${safeCheckedInCount}/${safeTotalParticipants}명 · 다른 참여자의 체크인을 기다리는 중`;

  return (
    <div data-testid="mate-check-in-action-runtime" className="min-w-0">
      <Card className={`hidden overflow-hidden p-5 lg:sticky lg:top-6 lg:flex ${mateSectionCardClass}`}>
        <div className="min-w-0">
          <p className={mateMetaLabelClass}>
            우선 작업
          </p>
          <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">지금 해야 할 일</h3>
          <p className="mt-2 text-body leading-6 text-gray-600 dark:text-white">
            {!isCheckedIn
              ? '먼저 본인 체크인을 완료하세요. 그 다음 그룹 진행률을 확인하면 됩니다.'
              : allCheckedIn
                ? '전체 체크인이 마무리되었습니다. 완료 확인 후 목록으로 돌아갈 수 있습니다.'
                : isHost
                  ? '다른 참여자의 도착 상태를 확인하고 필요하면 채팅에서 위치를 조율하세요.'
                  : '다른 참여자가 도착할 때까지 채팅에서 위치와 시간을 다시 맞출 수 있습니다.'}
          </p>

          <div className="mt-4 space-y-2">
            {!isCheckedIn ? (
              <Button
                data-testid="mate-check-in-desktop-check-in"
                onClick={onCheckIn}
                disabled={isChecking}
                className="w-full bg-primary text-white"
              >
                {isChecking ? (
                  <>
                    <MateLoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <MateCheckCircleIcon className="mr-2 h-4 w-4" />
                    체크인하기
                  </>
                )}
              </Button>
            ) : allCheckedIn ? (
              <Button
                data-testid="mate-check-in-desktop-complete"
                onClick={onComplete}
                className="w-full bg-primary text-white"
              >
                완료 확인
              </Button>
            ) : (
              <div className={`${mateInsetPanelClass} p-4 text-body text-gray-600 dark:text-white`}>
                {isHost ? '아직 도착하지 않은 참여자를 기다리는 중입니다.' : '다른 참여자의 체크인 완료를 기다리는 중입니다.'}
              </div>
            )}

            <Button
              data-testid="mate-check-in-desktop-chat"
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
              onClick={onNavigateToChat}
            >
              채팅으로 이동
            </Button>
          </div>

          <div className={`${mateInsetPanelClass} mt-4 p-4`}>
            <p className="text-body font-semibold text-gray-900 dark:text-white">체크인 기준</p>
            <ul className="mt-3 space-y-2 text-body text-gray-600 dark:text-white">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>개인 체크인이 먼저 완료되어야 그룹 진행률이 올라갑니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>QR 세션 진입 여부와 관계없이 기록 기준은 동일합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>전원 체크인 이후에는 완료 확인 단계로 넘어갑니다.</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <div
        data-testid="mate-check-in-mobile-bar"
        aria-live="polite"
        className={`${mateMobileBarClass} lg:hidden`}
      >
        <div className="mx-auto min-w-0 max-w-6xl overflow-hidden">
          <div className="min-w-0">
            <p className={mateMetaLabelClass}>
              체크인 요약
            </p>
            <p className="mt-1 max-w-full text-body font-semibold text-gray-900 [overflow-wrap:anywhere] dark:text-white">
              {mobileSummary}
            </p>
          </div>
          <div className={cn('mt-3 grid min-w-0 gap-2', primaryMobileAction ? 'grid-cols-2' : 'grid-cols-1')}>
            <Button
              data-testid="mate-check-in-mobile-chat"
              onClick={onNavigateToChat}
              variant="outline"
              size="touch"
              className="min-w-0 w-full border-primary px-3 text-primary hover:bg-primary/10"
            >
              채팅으로
            </Button>
            {primaryMobileAction ? (
              <Button
                data-testid="mate-check-in-mobile-primary"
                onClick={primaryMobileAction.onClick}
                disabled={primaryMobileAction.disabled}
                size="touch"
                className={cn('min-w-0 w-full px-3', primaryMobileAction.className)}
              >
                {primaryMobileAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
