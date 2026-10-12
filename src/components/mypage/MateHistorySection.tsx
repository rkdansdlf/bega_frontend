// MateHistorySection.tsx
import { useState } from 'react';
import { useMateHistory } from '../../hooks/useMateHistory';
import { MateHistoryTab, MateParty } from '../../types/mate';
import MateHistoryCard from './MateHistoryCard';
import LoadingSpinner from '../LoadingSpinner';

export interface MateHistorySectionVisualQaTabState {
  parties: MateParty[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  isEmpty?: boolean;
  emptyMessage: string;
}

export interface MateHistorySectionVisualQaStateOverride {
  initialTab?: MateHistoryTab;
  tabStates: Partial<Record<MateHistoryTab, MateHistorySectionVisualQaTabState>>;
  onFetchNextPage?: () => void | Promise<unknown>;
}

interface MateHistorySectionProps {
  visualQaStateOverride?: MateHistorySectionVisualQaStateOverride;
}

interface MateHistoryContentProps {
  tab: MateHistoryTab;
  visualQaStateOverride?: MateHistorySectionVisualQaStateOverride;
}

function MateHistoryContent({ tab, visualQaStateOverride }: MateHistoryContentProps) {
  const liveState = useMateHistory(tab);
  const overrideState = visualQaStateOverride?.tabStates[tab];
  const {
    parties,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    isEmpty,
    emptyMessage,
  } = overrideState ?? liveState;
  const resolvedFetchNextPage = visualQaStateOverride?.onFetchNextPage ?? liveState.fetchNextPage;
  const resolvedIsEmpty = overrideState?.isEmpty ?? isEmpty;

  if (isLoading) {
    return (
      <LoadingSpinner size="md" text="메이트 내역을 불러오는 중..." fullScreen={false} />
    );
  }

  if (resolvedIsEmpty) {
    return (
      <div className="mypage-season-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mypage-season-mate-list">
      {parties.map((party) => (
        <MateHistoryCard key={party.id} party={party} />
      ))}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            data-testid="mypage-mate-history-load-more"
            onClick={() => void resolvedFetchNextPage()}
            disabled={isFetchingNextPage}
            className="mypage-season-ghost-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetchingNextPage ? '불러오는 중...' : '더보기'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MateHistorySection({
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MateHistorySectionProps) {
  const visualQaStateOverride = import.meta.env.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const [mateHistoryTab, setMateHistoryTab] = useState<MateHistoryTab>(
    visualQaStateOverride?.initialTab ?? 'all',
  );

  const tabs: Array<{ key: MateHistoryTab; label: string }> = [
    { key: 'all', label: '전체' },
    { key: 'completed', label: '완료됨' },
    { key: 'ongoing', label: '진행 중' },
  ];

  return (
    <section data-screen-label="메이트 내역" data-testid="mypage-mate-history-section">
      <div className="mypage-season-head">
        <div>
          <h1>메이트 내역</h1>
          <p>참여한 직관 메이트와 진행 상태를 확인해요</p>
        </div>
      </div>

      <div className="mypage-season-panel">
        <div className="mypage-season-tabs" data-testid="mypage-mate-history-tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              data-testid={`mypage-mate-history-tab-${tab.key}`}
              onClick={() => setMateHistoryTab(tab.key)}
              className={mateHistoryTab === tab.key ? 'is-active' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <MateHistoryContent tab={mateHistoryTab} visualQaStateOverride={visualQaStateOverride} />
      </div>
    </section>
  );
}
