import { lazy, Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import LoadingSpinner from './LoadingSpinner';
import { MateAlertCircleIcon, MateChevronLeftIcon } from './icons/MateFlowIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import {
  appendMatePartyCheckInQueryData,
  getMatePartyCheckInsQueryOptions,
  updateMatePartyCollectionQueryData,
  useMatePartyFromRoute,
} from '../hooks/mateCheckInRoute';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { createCheckIn } from '../api/mate';
import { getApiErrorMessage } from '../utils/errorUtils';
import {
  matePageShellClass,
  mateMetaLabelClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import { hasSameMateUserIdentity, isPartyHostedByUser } from '../utils/mate';
import type { CheckIn, Party } from '../types/mate';

const MateCheckInContentRuntime = lazy(() => import('./MateCheckInContentRuntime'));

export type MateCheckInVisualQaStateOverride = {
  checkInStatus: CheckIn[];
  currentUser: { id: number; handle: string | null } | null;
  isAuthLoading: boolean;
  isChecking: boolean;
  isPartyLoading: boolean;
  isPartyRevalidating: boolean;
  manualCode: string;
  manualCodeError: string | null;
  party: Party | null;
  partyError: string | null;
  qrSessionId?: string;
  statusLoadError: string | null;
  visualQaContentPhase: 'fallback' | 'runtime';
};

type MateCheckInProps = {
  visualQaStateOverride?: MateCheckInVisualQaStateOverride;
};

export default function MateCheckIn({ visualQaStateOverride: visualQaStateOverrideProp }: MateCheckInProps = {}) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : visualQaStateOverrideProp;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const {
    party: liveParty,
    isLoading: livePartyLoading,
    isRevalidating: livePartyRevalidating,
    error: livePartyError,
  } = useMatePartyFromRoute(id);
  const {
    userHandle: liveCurrentUserHandle,
  } = useAuthProfileSnapshot();
  const { isAuthLoading: liveAuthLoading, userId: liveCurrentUserId } = useAuthSession();
  const queryClient = useQueryClient();

  const [liveIsChecking, setIsChecking] = useState(false);
  const [liveManualCode, setManualCode] = useState('');
  const [liveManualCodeError, setManualCodeError] = useState<string | null>(null);
  const liveQrSessionId = searchParams.get('sessionId')?.trim() || undefined;
  const liveCurrentUser = liveCurrentUserId
    ? { id: liveCurrentUserId, handle: liveCurrentUserHandle ?? null }
    : null;
  const party = visualQaStateOverride ? visualQaStateOverride.party : liveParty;
  const isPartyLoading = visualQaStateOverride?.isPartyLoading ?? livePartyLoading;
  const isPartyRevalidating = visualQaStateOverride?.isPartyRevalidating ?? livePartyRevalidating;
  const partyError = visualQaStateOverride ? visualQaStateOverride.partyError : livePartyError;
  const currentUser = visualQaStateOverride ? visualQaStateOverride.currentUser : liveCurrentUser;
  const currentUserHandle = currentUser?.handle ?? null;
  const isAuthLoading = visualQaStateOverride?.isAuthLoading ?? liveAuthLoading;
  const isChecking = visualQaStateOverride?.isChecking ?? liveIsChecking;
  const manualCode = visualQaStateOverride?.manualCode ?? liveManualCode;
  const manualCodeError = visualQaStateOverride
    ? visualQaStateOverride.manualCodeError
    : liveManualCodeError;
  const qrSessionId = visualQaStateOverride?.qrSessionId ?? liveQrSessionId;
  const contentPhase = import.meta.env?.PROD === true
    ? 'runtime'
    : visualQaStateOverride?.visualQaContentPhase ?? 'runtime';

  const checkInsQuery = useQuery({
    ...(party?.id != null
      ? getMatePartyCheckInsQueryOptions(party.id)
      : getMatePartyCheckInsQueryOptions('unknown')),
    enabled: visualQaStateOverride == null && Boolean(party?.id),
  });
  const checkInStatus = visualQaStateOverride
    ? visualQaStateOverride.checkInStatus
    : checkInsQuery.data ?? [];
  const statusLoadError = visualQaStateOverride
    ? visualQaStateOverride.statusLoadError
    : checkInsQuery.error
      ? '체크인 현황을 다시 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
      : null;

  if (isAuthLoading || (isPartyLoading && !party)) {
    return (
      <div
        data-testid="mate-check-in-loading"
        role="status"
        aria-busy="true"
        aria-label={isAuthLoading ? '사용자 정보 확인 중' : '체크인 파티 정보 준비 중'}
        className={`${matePageShellClass} flex min-h-dvh min-w-0 items-center justify-center overflow-x-clip px-4`}
      >
        <LoadingSpinner text="파티 정보를 불러오는 중입니다..." />
      </div>
    );
  }

  if (partyError || !party) {
    const resolvedError = partyError || '파티 정보를 찾을 수 없습니다.';
    return (
      <div
        data-testid="mate-check-in-error"
        className={`${matePageShellClass} min-h-dvh min-w-0 overflow-x-clip`}
      >
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
              <MateAlertCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="min-w-0 text-red-700 dark:text-red-300">
                <span className="block min-w-0 [overflow-wrap:anywhere]">{resolvedError}</span>
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                data-testid="mate-check-in-error-list"
                variant="ghost"
                size="touch"
                className="w-full sm:w-auto"
                onClick={() => navigate('/mate')}
              >
                <MateChevronLeftIcon className="mr-2 h-4 w-4" />
                목록으로
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div
        data-testid="mate-check-in-auth-required"
        className={`${matePageShellClass} flex min-h-dvh min-w-0 items-center overflow-x-clip px-4 py-10`}
      >
        <Card className={`mx-auto w-full max-w-lg p-6 ${mateSectionCardClass}`}>
          <p className={mateMetaLabelClass}>체크인 인증</p>
          <h1 className="mt-2 text-xl font-black text-gray-900 dark:text-white">로그인이 필요합니다</h1>
          <p className="mt-3 text-body leading-6 text-gray-600 dark:text-white">
            로그인한 참여자와 호스트만 체크인 현황을 확인하고 인증을 진행할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              data-testid="mate-check-in-login"
              size="touch"
              className="w-full sm:w-auto"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(id ? `/mate/${id}/checkin` : '/mate')}`)}
            >
              로그인
            </Button>
            <Button
              data-testid="mate-check-in-auth-list"
              variant="outline"
              size="touch"
              className="w-full sm:w-auto"
              onClick={() => navigate('/mate')}
            >
              메이트 목록
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isHost = isPartyHostedByUser(party, currentUser);
  const myCheckIn = checkInStatus.find((checkIn) => hasSameMateUserIdentity(
    { handle: checkIn.userHandle },
    { handle: currentUserHandle },
  ));
  const isCheckedIn = Boolean(myCheckIn);
  const hostCheckedIn = checkInStatus.some((checkIn) => hasSameMateUserIdentity(
    { handle: checkIn.userHandle },
    { handle: party.hostHandle },
  ));
  const totalParticipants = Math.max(party.currentParticipants, 1);
  const checkedInCount = checkInStatus.length;
  const remainingCount = Math.max(totalParticipants - checkedInCount, 0);
  const allCheckedIn = checkedInCount >= totalParticipants;
  const progressValue = Math.min(100, Math.round((checkedInCount / totalParticipants) * 100));

  const handleCheckIn = async () => {
    if (visualQaStateOverride) return;
    const trimmedManualCode = manualCode.trim();
    if (!qrSessionId && !/^\d{4}$/.test(trimmedManualCode)) {
      setManualCodeError('수동 체크인 코드를 4자리 숫자로 입력해주세요.');
      return;
    }

    setManualCodeError(null);
    setIsChecking(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const createdCheckIn = await createCheckIn({
        partyId: party.id,
        location: party.stadium,
        ...(qrSessionId ? { qrSessionId } : {}),
        ...(!qrSessionId ? { manualCode: trimmedManualCode } : {}),
      });
      const nextCheckIns = appendMatePartyCheckInQueryData(queryClient, party.id, createdCheckIn);
      if (nextCheckIns.length >= party.currentParticipants) {
        updateMatePartyCollectionQueryData(queryClient, party.id, (currentParty) => ({
          ...currentParty,
          status: 'CHECKED_IN',
        }));
      }
      toast.success('체크인이 완료되었습니다!');
    } catch (error) {
      console.error('체크인 중 오류:', error);
      toast.error(getApiErrorMessage(error, '체크인 중 오류가 발생했습니다.'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleComplete = () => {
    if (visualQaStateOverride) return;
    toast.success('경기 관람이 완료되었습니다!');
    navigate('/mate');
  };

  const contentFallback = (
    <Card
      data-testid="mate-check-in-content-fallback"
      role="status"
      aria-busy="true"
      aria-label="체크인 화면 준비 중"
      className={`p-5 sm:p-6 ${mateSectionCardClass}`}
    >
      <div className="space-y-4 animate-pulse" aria-hidden="true">
        <div className="h-6 w-40 max-w-full rounded bg-muted dark:bg-white/10" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl bg-muted/70 dark:bg-white/10" />
          ))}
        </div>
        <div className="h-48 rounded-xl bg-muted/70 dark:bg-white/10" />
      </div>
    </Card>
  );

  return (
    <div
      data-testid="mate-check-in"
      className={`${matePageShellClass} min-h-dvh min-w-0 overflow-x-clip pb-10`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-primary/5 dark:bg-primary/10" />
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Button
          data-testid="mate-check-in-back"
          variant="ghost"
          size="touch"
          onClick={() => navigate(`/mate/${id}`)}
          className="mb-3 -ml-2 text-gray-700 hover:text-gray-900 dark:text-white dark:hover:text-white sm:mb-4"
        >
          <MateChevronLeftIcon className="mr-2 h-4 w-4" />
          뒤로
        </Button>

        {contentPhase === 'fallback' ? contentFallback : (
        <Suspense fallback={contentFallback}>
          <Card className={`mb-6 p-5 sm:p-6 ${mateSectionCardClass}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className={mateMetaLabelClass}>
                  체크인 인증
                </p>
                <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                  {qrSessionId ? 'QR 세션이 연결된 체크인' : '수동 체크인 코드 입력'}
                </h2>
                <p className="mt-2 text-body leading-6 text-gray-600 dark:text-white">
                  {qrSessionId
                    ? '현재는 QR 세션으로 체크인할 수 있습니다. 세션이 만료되면 아래 수동 코드로도 진행할 수 있습니다.'
                    : '직접 진입한 화면입니다. 호스트가 보여준 4자리 수동 체크인 코드를 입력한 뒤 체크인을 진행하세요.'}
                </p>
              </div>
              <div className="w-full max-w-sm">
                <label htmlFor="manualCode" className="mb-2 block text-body font-semibold text-gray-900 dark:text-white">
                  수동 체크인 코드
                </label>
                <Input
                  data-testid="mate-check-in-manual-code"
                  id="manualCode"
                  inputMode="numeric"
                  maxLength={4}
                  value={manualCode}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/\D/g, '').slice(0, 4);
                    setManualCode(nextValue);
                    if (manualCodeError) {
                      setManualCodeError(null);
                    }
                  }}
                  placeholder="예: 0427"
                  className="h-11 min-w-0 text-base tracking-[0.35em]"
                />
                {manualCodeError ? (
                  <p className="mt-2 text-body text-red-600 dark:text-red-400">{manualCodeError}</p>
                ) : (
                  <p className="mt-2 text-body text-gray-500 dark:text-white">
                    {qrSessionId ? '수동 코드는 QR 세션 장애 시 백업 수단입니다.' : 'QR 세션 없이도 수동 코드만으로 체크인할 수 있습니다.'}
                  </p>
                )}
              </div>
            </div>
          </Card>
          <MateCheckInContentRuntime
            party={party}
            isHost={isHost}
            isCheckedIn={isCheckedIn}
            isChecking={isChecking}
            qrSessionId={qrSessionId}
            isPartyRevalidating={isPartyRevalidating}
            statusLoadError={statusLoadError}
            hostCheckedIn={hostCheckedIn}
            allCheckedIn={allCheckedIn}
            checkedInCount={checkedInCount}
            totalParticipants={totalParticipants}
            remainingCount={remainingCount}
            progressValue={progressValue}
            currentUserHandle={currentUserHandle}
            myCheckIn={myCheckIn}
            checkInStatus={checkInStatus}
            onRetryStatus={() => {
              if (!visualQaStateOverride) void checkInsQuery.refetch();
            }}
            onCheckIn={handleCheckIn}
            onComplete={handleComplete}
            onNavigateToChat={() => navigate(`/mate/${id}/chat`)}
          />
        </Suspense>
        )}
      </div>
    </div>
  );
}
