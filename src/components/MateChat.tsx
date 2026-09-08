import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import {
  getMatePartyMyApplicationQueryOptions,
  useMatePartyFromRoute,
} from '../hooks/mateChatRoute';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import {
  matePageShellClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import { isPartyHostedByUser } from '../utils/mate';
import type { Party } from '../types/mate';

const LazyMateChatApprovedRuntime = lazy(() => import('./MateChatApprovedRuntime'));
const LazyMateChatAccessStateRuntime = lazy(() => import('./MateChatAccessStateRuntime'));

export type MateChatVisualQaStateOverride = {
  approvalLoadError: string | null;
  approvedPhase: 'fallback';
  currentUser: {
    id: number;
    name: string;
    handle: string | null;
  } | null;
  isAuthLoading: boolean;
  isCheckingApproval: boolean;
  isPartyLoading: boolean;
  isPartyRevalidating: boolean;
  myApplication: { isApproved: boolean } | null;
  party: Party | null;
  partyError: string | null;
};

type MateChatProps = {
  visualQaStateOverride?: MateChatVisualQaStateOverride;
};

export default function MateChat({ visualQaStateOverride: visualQaStateOverrideProp }: MateChatProps = {}) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : visualQaStateOverrideProp;
  const { id } = useParams<{ id: string }>();
  const {
    party: liveParty,
    isLoading: livePartyLoading,
    isRevalidating: livePartyRevalidating,
    error: livePartyError,
  } = useMatePartyFromRoute(id);
  const {
    userName: authUserName,
    userHandle: authUserHandle,
  } = useAuthProfileSnapshot();
  const { isAuthLoading: liveAuthLoading, userId: currentUserId } = useAuthSession();

  const liveCurrentUser = currentUserId
    ? {
      id: currentUserId,
      name: authUserName ?? '',
      handle: authUserHandle ?? null,
    }
    : null;
  const currentUser = visualQaStateOverride
    ? visualQaStateOverride.currentUser
    : liveCurrentUser;
  const isAuthLoading = visualQaStateOverride?.isAuthLoading ?? liveAuthLoading;
  const party = visualQaStateOverride ? visualQaStateOverride.party : liveParty;
  const isPartyLoading = visualQaStateOverride?.isPartyLoading ?? livePartyLoading;
  const isPartyRevalidating = visualQaStateOverride?.isPartyRevalidating ?? livePartyRevalidating;
  const partyError = visualQaStateOverride ? visualQaStateOverride.partyError : livePartyError;

  const isHost = currentUser && party
    ? isPartyHostedByUser(party, { id: currentUser.id, handle: currentUser.handle ?? null })
    : false;
  const myApplicationQuery = useQuery({
    ...(party?.id != null
      ? getMatePartyMyApplicationQueryOptions(party.id, currentUserId)
      : getMatePartyMyApplicationQueryOptions('unknown', currentUserId)),
    enabled: visualQaStateOverride == null && Boolean(party?.id && currentUser && !isHost),
  });
  const myApplication = visualQaStateOverride
    ? visualQaStateOverride.myApplication
    : myApplicationQuery.data ?? null;
  const isCheckingApproval = visualQaStateOverride?.isCheckingApproval
    ?? Boolean(party && currentUser && !isHost && myApplicationQuery.isPending);
  const approvalLoadError = visualQaStateOverride
    ? visualQaStateOverride.approvalLoadError
    : myApplicationQuery.error
      ? '신청 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
      : null;

  if (isAuthLoading || (isPartyLoading && !party)) {
    return (
      <div
        className={`${matePageShellClass} flex min-h-dvh min-w-0 flex-col overflow-x-clip`}
        data-testid="mate-chat-loading"
        role="status"
        aria-busy="true"
        aria-label={isAuthLoading ? '사용자 정보 확인 중' : '메이트 채팅 정보 준비 중'}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8" aria-hidden="true">
          <div className="mb-4">
            <Skeleton className="mb-2 h-9 w-16 dark:bg-white/10" />
            <Card className={`p-4 ${mateSectionCardClass}`}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-2xl dark:bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 max-w-full dark:bg-white/10" />
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-20 max-w-full dark:bg-white/10" />
                    <Skeleton className="h-3 w-16 max-w-full dark:bg-white/10" />
                    <Skeleton className="h-3 w-12 max-w-full dark:bg-white/10" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <Card className={`mb-4 flex-1 overflow-hidden p-4 ${mateSectionCardClass}`} style={{ minHeight: '420px' }}>
            <div className="flex-1 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={`recv-${item}`} className="flex justify-start">
                  <div className="flex max-w-[60%] flex-col items-start space-y-1">
                    <Skeleton className="h-3 w-16 dark:bg-white/10" />
                    <Skeleton className="h-10 w-40 max-w-full rounded-2xl dark:bg-white/10" />
                    <Skeleton className="h-3 w-10 dark:bg-white/10" />
                  </div>
                </div>
              ))}
              {[1, 2].map((item) => (
                <div key={`send-${item}`} className="flex justify-end">
                  <div className="flex max-w-[60%] flex-col items-end space-y-1">
                    <Skeleton className="h-10 w-48 max-w-full rounded-2xl dark:bg-white/10" />
                    <Skeleton className="h-3 w-10 dark:bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className={`p-4 ${mateSectionCardClass}`}>
            <div className="flex gap-2">
              <Skeleton className="h-10 min-w-0 flex-1 rounded-md dark:bg-white/10" />
              <Skeleton className="h-10 w-16 shrink-0 rounded-md dark:bg-white/10" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (partyError || !party) {
    return (
      <Suspense fallback={null}>
        <LazyMateChatAccessStateRuntime
          state="partyError"
          partyId={id}
          message={partyError || '파티 정보를 찾을 수 없습니다.'}
        />
      </Suspense>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={null}>
        <LazyMateChatAccessStateRuntime state="unauthenticated" partyId={id} />
      </Suspense>
    );
  }

  if (isCheckingApproval) {
    return (
      <div
        className={`${matePageShellClass} flex min-h-dvh min-w-0 items-center justify-center overflow-x-clip px-4`}
        data-testid="mate-chat-approval-loading"
        role="status"
        aria-busy="true"
        aria-label="채팅 접근 상태 확인 중"
      >
        <div className="min-w-0 text-center">
          <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" aria-hidden="true" />
          <p className="text-body text-gray-500 dark:text-white">채팅 접근 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (approvalLoadError) {
    return (
      <Suspense fallback={null}>
        <LazyMateChatAccessStateRuntime
          state="approvalError"
          partyId={id}
          message={approvalLoadError}
          onRetry={() => void myApplicationQuery.refetch()}
        />
      </Suspense>
    );
  }

  if (!isHost && !myApplication?.isApproved) {
    return (
      <Suspense fallback={null}>
        <LazyMateChatAccessStateRuntime state="notApproved" partyId={id} />
      </Suspense>
    );
  }

  const mateChatViewFallback = (
    <div
      className={`${matePageShellClass} flex min-h-dvh min-w-0 flex-col overflow-x-clip`}
      data-testid="mate-chat-approved-fallback"
      role="status"
      aria-busy="true"
      aria-label="승인된 메이트 채팅 화면 준비 중"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 py-4 pb-6 sm:px-6 lg:px-8" aria-hidden="true">
        <Card className={`min-w-0 p-0 ${mateSectionCardClass}`}>
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 shrink-0 rounded-3xl dark:bg-white/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-24 max-w-full dark:bg-white/10" />
                <Skeleton className="h-7 w-40 max-w-full dark:bg-white/10" />
                <Skeleton className="h-4 w-56 max-w-full dark:bg-white/10" />
              </div>
            </div>
          </div>
        </Card>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={`mate-chat-summary-fallback-${index}`} className={`p-4 ${mateSectionCardClass}`}>
              <Skeleton className="h-4 w-16 dark:bg-white/10" />
              <Skeleton className="mt-3 h-5 w-24 max-w-full dark:bg-white/10" />
              <Skeleton className="mt-2 h-4 w-full dark:bg-white/10" />
            </Card>
          ))}
        </div>
        <Card className={`mt-4 flex-1 overflow-hidden p-3 sm:p-4 ${mateSectionCardClass}`}>
          <Skeleton className="h-5 w-24 dark:bg-white/10" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full dark:bg-white/10" />
          <div className="mt-4 space-y-4">
            {[0, 1, 2].map((index) => (
              <div key={`mate-chat-thread-fallback-${index}`} className="flex justify-start">
                <div className="max-w-[70%] space-y-2">
                  <Skeleton className="h-4 w-20 dark:bg-white/10" />
                  <Skeleton className="h-12 w-48 max-w-full rounded-3xl dark:bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  if (visualQaStateOverride?.approvedPhase === 'fallback') {
    return mateChatViewFallback;
  }

  return (
    <Suspense fallback={mateChatViewFallback}>
      <LazyMateChatApprovedRuntime
        party={party}
        partyId={id ?? String(party.id)}
        currentUser={{
          id: currentUser.id,
          name: currentUser.name,
        }}
        isHost={isHost}
        isPartyRevalidating={isPartyRevalidating}
      />
    </Suspense>
  );
}
