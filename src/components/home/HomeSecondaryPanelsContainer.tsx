import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getHomeWidgetsQueryOptions } from '../../api/home';
import { seedMatePartyQueryData } from '../../hooks/mateList';
import { useTodayKey } from '../../hooks/useTodayKey';
import type { FeaturedMateCard, HomeWidgetsResponse } from '../../types/home';
import { buildDisplayableRankings } from '../../utils/homeDashboard';
import { getRankingDisplayName } from '../../utils/homeTeamNameResolution';
import HomeSecondaryPanelsSkeleton from './HomeSecondaryPanelsSkeleton';
const HomeSecondaryPanels = lazy(() => import('./HomeSecondaryPanels'));

const HOME_DASHBOARD_TEAM_COUNT = 10;
const HOME_DASHBOARD_MOBILE_CARD_HEIGHT_CLASS = 'min-h-[238px]';
const HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS = 'lg:h-[650px]';
const HOME_DASHBOARD_RANKING_ROW_CLASS = 'xl:h-[65px] xl:min-h-[65px]';
const HOME_DASHBOARD_CARD_HEIGHT_CLASS = `${HOME_DASHBOARD_MOBILE_CARD_HEIGHT_CLASS} ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`;
const TEAM_RANKING_CARD_HEIGHT_CLASS = `min-h-[320px] ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`;

interface HomeSecondaryPanelsContainerProps {
  selectedDate: Date;
  selectedDateKey: string;
  calendarMonth: Date;
  showCalendar: boolean;
  shouldMountWelcomeGuide: boolean;
  calendarDialogTitleId: string;
  loggedIn: boolean;
  userId: string | null;
  suppressRecoveryActions?: boolean;
  onNavigateToCheer: () => void;
  onNavigateToMate: () => void;
  onNavigateToCheerPost: (postId: number) => void;
  onSelectFeaturedMate: (mate: FeaturedMateCard) => void;
  onCloseCalendar: () => void;
  onCalendarMonthChange: (month: Date) => void;
  onSelectCalendarDate: (date: Date) => void;
  visualQaStateOverride?: HomeSecondaryPanelsContainerVisualQaStateOverride;
}

export type HomeSecondaryPanelsContainerVisualQaStateOverride = {
  status: 'error' | 'loading' | 'success';
  data?: HomeWidgetsResponse;
  onRetry?: () => void;
};

export default function HomeSecondaryPanelsContainer({
  selectedDate,
  selectedDateKey,
  calendarMonth,
  showCalendar,
  shouldMountWelcomeGuide,
  calendarDialogTitleId,
  loggedIn,
  userId,
  suppressRecoveryActions = false,
  onNavigateToCheer,
  onNavigateToMate,
  onNavigateToCheerPost,
  onSelectFeaturedMate,
  onCloseCalendar,
  onCalendarMonthChange,
  onSelectCalendarDate,
  visualQaStateOverride,
}: HomeSecondaryPanelsContainerProps) {
  const queryClient = useQueryClient();
  const todayKey = useTodayKey();
  const [rankingSeasonOverride, setRankingSeasonOverride] = useState<number | null>(null);
  const homeSecondaryPanelsFallback = <HomeSecondaryPanelsSkeleton />;

  useEffect(() => {
    setRankingSeasonOverride(null);
  }, [selectedDateKey]);

  const widgetsQuery = useQuery({
    ...getHomeWidgetsQueryOptions(selectedDate),
    enabled: visualQaStateOverride === undefined,
    refetchOnWindowFocus: false,
  });

  const rankingOverrideQuery = useQuery({
    ...getHomeWidgetsQueryOptions(selectedDate, rankingSeasonOverride ?? undefined),
    enabled: visualQaStateOverride === undefined && rankingSeasonOverride != null,
    refetchOnWindowFocus: false,
  });

  const widgetsData = visualQaStateOverride === undefined
    ? widgetsQuery.data
    : visualQaStateOverride.data;
  const rankingSnapshot = rankingSeasonOverride == null
    ? widgetsData?.rankingSnapshot ?? null
    : rankingOverrideQuery.data?.rankingSnapshot ?? null;
  const rankingSeasonYear = rankingSnapshot?.rankingSeasonYear
    ?? rankingSeasonOverride
    ?? selectedDate.getFullYear();
  const currentYear = Number(todayKey.slice(0, 4));

  const displayableRankings = useMemo(
    () => buildDisplayableRankings(rankingSnapshot?.rankings ?? [], getRankingDisplayName),
    [rankingSnapshot?.rankings],
  );
  const displayedRankings = displayableRankings.slice(0, HOME_DASHBOARD_TEAM_COUNT);
  const rankingPlaceholderRows = Math.max(0, HOME_DASHBOARD_TEAM_COUNT - displayedRankings.length);

  const widgetsFailedWithoutData = visualQaStateOverride === undefined
    ? widgetsQuery.isError && !widgetsData
    : visualQaStateOverride.status === 'error' && !widgetsData;
  const rankingFailedWithoutData = rankingSeasonOverride == null
    ? widgetsFailedWithoutData
    : rankingOverrideQuery.isError && !rankingOverrideQuery.data;
  const isWidgetsLoading = visualQaStateOverride === undefined
    ? widgetsQuery.isLoading && !widgetsData
    : visualQaStateOverride.status === 'loading' && !widgetsData;
  const isHotCheerLoading = isWidgetsLoading;
  const isFeaturedMatesLoading = isWidgetsLoading;
  const isRankingsLoading = visualQaStateOverride === undefined
    ? rankingSeasonOverride == null
      ? widgetsQuery.isLoading && !widgetsData
      : rankingOverrideQuery.isLoading && !rankingOverrideQuery.data
    : visualQaStateOverride.status === 'loading' && !widgetsData;
  const hotCheerPosts = widgetsData?.hotCheerPosts ?? [];
  const featuredMates = widgetsData?.featuredMates ?? [];
  const hotCheerError = widgetsFailedWithoutData ? '인기 응원글을 불러오지 못했어요' : null;
  const featuredMatesError = widgetsFailedWithoutData ? '메이트 모집글을 불러오지 못했어요' : null;
  const rankingSourceMessage = rankingSnapshot?.rankingSourceMessage ?? '';
  const rankingDataVisibilityMessage = displayableRankings.length === 0 && (rankingSnapshot?.rankings.length ?? 0) > 0
    ? '지금은 표시할 수 있는 팀 순위가 없어요'
    : `${rankingSeasonYear} 시즌 순위가 아직 집계되지 않았어요`;
  const rankingStatusHintMessage = rankingSourceMessage || (rankingSnapshot?.isOffSeason
    ? '연도 옆 화살표로 지난 시즌 순위를 볼 수 있어요.'
    : '경기 결과가 쌓이면 이 자리에 순위가 표시돼요.');

  const handleRetryWidgets = () => {
    if (visualQaStateOverride !== undefined) {
      visualQaStateOverride.onRetry?.();
      return;
    }
    void widgetsQuery.refetch();
  };

  const handleRetryRanking = () => {
    if (visualQaStateOverride !== undefined) {
      visualQaStateOverride.onRetry?.();
      return;
    }
    if (rankingSeasonOverride == null) {
      void widgetsQuery.refetch();
      return;
    }
    void rankingOverrideQuery.refetch();
  };

  const handleSelectFeaturedMate = (mate: FeaturedMateCard) => {
    seedMatePartyQueryData(queryClient, mate);
    onSelectFeaturedMate(mate);
  };

  return (
    <Suspense fallback={homeSecondaryPanelsFallback}>
      <HomeSecondaryPanels
        selectedDate={selectedDate}
        calendarMonth={calendarMonth}
        showCalendar={showCalendar}
        shouldMountWelcomeGuide={shouldMountWelcomeGuide}
        calendarDialogTitleId={calendarDialogTitleId}
        loggedIn={loggedIn}
        userId={userId}
        suppressRecoveryActions={suppressRecoveryActions}
        currentYear={currentYear}
        todayKey={todayKey}
        isHotCheerLoading={isHotCheerLoading}
        hotCheerError={hotCheerError}
        hotCheerPosts={hotCheerPosts}
        isFeaturedMatesLoading={isFeaturedMatesLoading}
        featuredMatesError={featuredMatesError}
        featuredMates={featuredMates}
        rankingSeasonYear={rankingSeasonYear}
        isRankingsLoading={isRankingsLoading}
        rankingsError={rankingFailedWithoutData}
        displayedRankings={displayedRankings}
        rankingDataVisibilityMessage={rankingDataVisibilityMessage}
        rankingStatusHintMessage={rankingStatusHintMessage}
        rankingPlaceholderRows={rankingPlaceholderRows}
        homeDashboardCardHeightClass={HOME_DASHBOARD_CARD_HEIGHT_CLASS}
        teamRankingCardHeightClass={TEAM_RANKING_CARD_HEIGHT_CLASS}
        homeDashboardRankingRowClass={HOME_DASHBOARD_RANKING_ROW_CLASS}
        onRetryWidgets={handleRetryWidgets}
        onRetryRanking={handleRetryRanking}
        onLoadPreviousRankingSeason={() => {
          setRankingSeasonOverride(rankingSeasonYear - 1);
        }}
        onLoadNextRankingSeason={() => {
          if (rankingSeasonYear >= currentYear) {
            return;
          }
          setRankingSeasonOverride(rankingSeasonYear + 1);
        }}
        onNavigateToCheer={onNavigateToCheer}
        onNavigateToMate={onNavigateToMate}
        onNavigateToCheerPost={onNavigateToCheerPost}
        onSelectFeaturedMate={handleSelectFeaturedMate}
        onCloseCalendar={onCloseCalendar}
        onCalendarMonthChange={onCalendarMonthChange}
        onSelectCalendarDate={onSelectCalendarDate}
      />
    </Suspense>
  );
}
