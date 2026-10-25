import { lazy, Suspense, type ComponentType, type CSSProperties, type ReactNode } from 'react';

import HomeGameCard from './HomeGameCard';
import type { Game } from '../../types/home';
import type { LeagueTab } from '../../utils/homeScheduleClassification';
import type { HomeLoadFailureReason } from '../../api/home';

import {
  EMPTY_BODY_CLASS,
  EMPTY_FRAME_CLASS,
  EMPTY_LAYOUT_CLASS,
  EMPTY_SYMBOL_CLASS,
  EMPTY_TITLE_CLASS,
} from '../status/statusTokens';

const LazyHomeScheduledMatchPanel = lazy(() => import('./HomeScheduledMatchPanel'));
const LazyHomeMatchPanelErrorState = lazy(() => import('./HomeMatchPanelErrorState'));

interface HomeMatchPanelProps {
  activeLeagueTab: LeagueTab;
  isLoading: boolean;
  isGamesError: boolean;
  /** 6초 안에 응답이 오지 않았지만 요청은 아직 진행 중. */
  isGamesDelayed?: boolean;
  /** 경기가 없는 날 보여줄 다음 행동. */
  emptyDateNavigation?: HomeMatchPanelEmptyNavigation;
  loadFailureReason: HomeLoadFailureReason | null;
  isScheduledLoading: boolean;
  isScheduledError: boolean;
  suppressRecoveryActions?: boolean;
  isSecondarySectionExpanded: boolean;
  loadingMatchCardCount: number;
  matchSectionMinHeightStyle: CSSProperties;
  activeStandardGames: Game[];
  scheduledPrimaryGames: Game[];
  scheduledSecondaryGames: Game[];
  liveOrFinishedScheduledGames: Game[];
  scheduledPrimaryGamesBySourceDate: Array<[string, Game[]]>;
  scheduledSecondaryGamesBySourceDate: Array<[string, Game[]]>;
  shouldMountTeamLogos: boolean;
  LoadingCardComponent: ComponentType;
  onRetry: () => void;
  onSelectPrediction: (game: Game) => void;
  onToggleSecondarySection: () => void;
}

export interface HomeMatchPanelEmptyNavigation {
  nextGameDate: string | null;
  prevGameDate: string | null;
  isOffSeason: boolean;
  onJumpToDate: (dateKey: string) => void;
  onOpenScheduled: () => void;
  onOpenOffseason: () => void;
}

const HOME_STATE_ACTION_CLASS = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-10 border border-primary/25 bg-white px-3 text-13 font-bold text-primary hover:bg-primary/5 dark:border-primary/40 dark:bg-card dark:text-emerald-300 dark:hover:bg-primary/10';
const HOME_STATE_PRIMARY_ACTION_CLASS = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-10 bg-primary px-3 text-13 font-bold text-white hover:bg-primary-hover';

const formatGameDateLabel = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(year, month - 1, day, 12).getDay()];
  return `${month}월 ${day}일 (${weekday})`;
};

function HomeMatchEmptyActions({ navigation }: { navigation: HomeMatchPanelEmptyNavigation }) {
  const { nextGameDate, prevGameDate, isOffSeason } = navigation;
  if (nextGameDate) {
    return (
      <>
        <button
          type="button"
          data-testid="home-empty-next-game"
          onClick={() => navigation.onJumpToDate(nextGameDate)}
          className={HOME_STATE_PRIMARY_ACTION_CLASS}
        >
          다음 경기 {formatGameDateLabel(nextGameDate)} 보기
        </button>
        {prevGameDate ? (
          <button
            type="button"
            data-testid="home-empty-prev-game"
            onClick={() => navigation.onJumpToDate(prevGameDate)}
            className={HOME_STATE_ACTION_CLASS}
          >
            지난 경기 보기
          </button>
        ) : null}
      </>
    );
  }

  if (isOffSeason) {
    return (
      <button
        type="button"
        data-testid="home-empty-offseason"
        onClick={navigation.onOpenOffseason}
        className={HOME_STATE_PRIMARY_ACTION_CLASS}
      >
        스토브리그 소식 보기
      </button>
    );
  }

  return (
    <>
      {prevGameDate ? (
        <button
          type="button"
          data-testid="home-empty-prev-game"
          onClick={() => navigation.onJumpToDate(prevGameDate)}
          className={HOME_STATE_ACTION_CLASS}
        >
          지난 경기 {formatGameDateLabel(prevGameDate)} 보기
        </button>
      ) : null}
      <button
        type="button"
        data-testid="home-empty-scheduled"
        onClick={navigation.onOpenScheduled}
        className={prevGameDate ? HOME_STATE_ACTION_CLASS : HOME_STATE_PRIMARY_ACTION_CLASS}
      >
        예정경기 보기
      </button>
    </>
  );
}

const HOME_MATCH_PANEL_COPY: Record<LeagueTab, { context: string; title: string; description: string }> = {
  regular: {
    context: 'KBO League',
    title: '오늘의 매치업',
    description: '경기 시간, 구장, 상태를 빠르게 확인하세요.',
  },
  postseason: {
    context: 'Postseason',
    title: '포스트시즌 매치업',
    description: '가을야구 일정을 간결하게 정리했습니다.',
  },
  koreanseries: {
    context: 'Korean Series',
    title: '한국시리즈 매치업',
    description: '챔피언 결정전의 경기 흐름을 확인하세요.',
  },
  scheduled: {
    context: 'Upcoming',
    title: '다가오는 경기',
    description: '예정 경기와 일정 변동을 날짜별로 확인하세요.',
  },
};

const BOARD_SHELL_CLASS = 'rounded-3xl border border-primary/20 bg-white p-4 shadow-home-board ring-1 ring-primary/10 dark:border-primary/25 dark:bg-card md:p-5';
const BOARD_GRID_CLASS = 'grid grid-cols-1 items-stretch gap-2.5';
const MATCH_PRIORITY_REGION_PROPS = {
  'aria-label': '오늘 경기 중심 영역',
  'data-priority': 'primary',
  'data-testid': 'home-match-priority-panel',
} as const;

function HomeScheduleBoardHeader({
  copy,
  countLabel,
  detailLabel,
  tone = 'default',
}: {
  copy: { context: string; title: string; description: string };
  countLabel: string;
  detailLabel?: string;
  tone?: 'default' | 'warning';
}) {
  const countClass = tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/25 dark:text-amber-200'
    : 'border-gray-200 bg-gray-100 text-gray-700 dark:border-white/10 dark:bg-white/10 dark:text-white';

  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-white/8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-13 font-semibold text-primary dark:text-emerald-300">
            {copy.context}
          </span>
        </div>
        <h3 className="truncate text-20 font-black tracking-tight text-gray-950 dark:text-white sm:text-2xl">
          {copy.title}
        </h3>
        <p className="mt-1 text-caption font-bold leading-relaxed text-gray-500 dark:text-white sm:text-15">
          {copy.description}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-caption font-black ${countClass}`}>
          {countLabel}
        </span>
        {detailLabel ? (
          <span className="inline-flex min-h-9 items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-caption font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            {detailLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function HomeScheduleStateShell({
  children,
  style,
  copy,
  countLabel,
  detailLabel,
  tone,
}: {
  children: ReactNode;
  style?: CSSProperties;
  copy?: { context: string; title: string; description: string };
  countLabel?: string;
  detailLabel?: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className={BOARD_SHELL_CLASS} style={style} {...MATCH_PRIORITY_REGION_PROPS}>
      {copy ? (
        <HomeScheduleBoardHeader
          copy={copy}
          countLabel={countLabel || '0경기'}
          detailLabel={detailLabel}
          tone={tone}
        />
      ) : null}
      {children}
    </div>
  );
}

function HomeScheduleErrorState({
  copy,
  countLabel,
  title,
  description,
  variant = 'error',
  onRetry,
}: {
  copy: { context: string; title: string; description: string };
  countLabel: string;
  title: string;
  description: string;
  variant?: 'error' | 'delayed';
  onRetry: () => void;
}) {
  const header = <HomeScheduleBoardHeader copy={copy} countLabel={countLabel} tone="warning" />;
  return (
    <Suspense
      fallback={(
        <HomeScheduleStateShell copy={copy} countLabel={countLabel} tone="warning">
          <div className={`${EMPTY_FRAME_CLASS.error} ${EMPTY_LAYOUT_CLASS}`}>
            <p className={EMPTY_TITLE_CLASS}>경기 상태를 확인하고 있습니다.</p>
          </div>
        </HomeScheduleStateShell>
      )}
    >
      <LazyHomeMatchPanelErrorState
        header={header}
        title={title}
        description={description}
        variant={variant}
        suppressRecoveryActions={false}
        onRetry={onRetry}
      />
    </Suspense>
  );
}

// 경기가 없는 날 — 첫 카드 경로라서 아이콘 라이브러리 없이 토큰 문자열만 씁니다.
function HomeMatchEmptyState({
  isOffSeason,
  navigation,
}: {
  isOffSeason: boolean;
  navigation?: HomeMatchPanelEmptyNavigation;
}) {
  const description = isOffSeason
    ? '새 시즌 일정이 나오면 이 자리에 경기가 표시돼요.'
    : navigation?.nextGameDate
      ? '가장 가까운 경기 날짜로 바로 이동할 수 있어요.'
      : '다가오는 일정은 예정경기에서 확인할 수 있어요.';

  return (
    <div role="status" data-testid="home-match-empty" className={`${EMPTY_FRAME_CLASS.filtered} ${EMPTY_LAYOUT_CLASS} py-8`}>
      <span className={EMPTY_SYMBOL_CLASS.filtered} aria-hidden="true">
        <span className="relative block h-[18px] w-[18px] rounded-[4px] border-2 border-current">
          <span className="absolute inset-x-0 top-[3px] block border-t-2 border-current" />
        </span>
      </span>
      <p className={`${EMPTY_TITLE_CLASS} break-keep`}>{isOffSeason ? '지금은 비시즌이에요' : '이 날은 경기가 없어요'}</p>
      <p className={`${EMPTY_BODY_CLASS} break-keep`}>{description}</p>
      {navigation ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
          <HomeMatchEmptyActions navigation={navigation} />
        </div>
      ) : null}
    </div>
  );
}

function HomeScheduleListHeader() {
  return (
    <div className="hidden px-3 pb-1 text-11 font-black text-gray-400 dark:text-white lg:grid lg:grid-cols-home-game-card lg:gap-4">
      <span>시간</span>
      <span>원정</span>
      <span className="text-center">경기</span>
      <span className="text-right">홈</span>
      <span>구장</span>
      <span className="text-right">상태</span>
    </div>
  );
}

function HomeScheduleGameList({
  games,
  sourceDate,
  shouldMountTeamLogos,
  onSelectPrediction,
}: {
  games: Game[];
  sourceDate?: string;
  shouldMountTeamLogos: boolean;
  onSelectPrediction: (game: Game) => void;
}) {
  const keySuffix = sourceDate ? `${sourceDate}-` : '';

  return (
    <div className={BOARD_GRID_CLASS}>
      {games.map((game, index) => (
        <div
          key={`${game.gameId}-${keySuffix}${index}`}
          className="h-full"
          data-testid="home-game-card"
          data-game-id={game.gameId}
        >
          <HomeGameCard
            game={game}
            shouldMountTeamLogo={shouldMountTeamLogos}
            onSelectPrediction={() => onSelectPrediction(game)}
          />
        </div>
      ))}
    </div>
  );
}

function HomeScheduledPanelFallback({
  matchSectionMinHeightStyle,
  loadingMatchCardCount,
  LoadingCardComponent,
}: {
  matchSectionMinHeightStyle: CSSProperties;
  loadingMatchCardCount: number;
  LoadingCardComponent: ComponentType;
}) {
  return (
    <HomeScheduleStateShell
      style={matchSectionMinHeightStyle}
      copy={HOME_MATCH_PANEL_COPY.scheduled}
      countLabel="예정 경기 확인 중"
      detailLabel="7일 일정"
    >
      <HomeScheduleListHeader />
      <div className={BOARD_GRID_CLASS}>
        {Array.from({ length: loadingMatchCardCount }, (_, index) => <LoadingCardComponent key={`scheduled-fallback-${index}`} />)}
      </div>
    </HomeScheduleStateShell>
  );
}

export default function HomeMatchPanel({
  activeLeagueTab,
  isLoading,
  isGamesError,
  isGamesDelayed = false,
  emptyDateNavigation,
  loadFailureReason,
  isScheduledLoading,
  isScheduledError,
  isSecondarySectionExpanded,
  loadingMatchCardCount,
  matchSectionMinHeightStyle,
  activeStandardGames,
  scheduledPrimaryGames,
  scheduledSecondaryGames,
  liveOrFinishedScheduledGames,
  scheduledPrimaryGamesBySourceDate,
  scheduledSecondaryGamesBySourceDate,
  shouldMountTeamLogos,
  LoadingCardComponent,
  onRetry,
  onSelectPrediction,
  onToggleSecondarySection,
}: HomeMatchPanelProps) {
  const activeTabIsScheduled = activeLeagueTab === 'scheduled';
  const isManualDataError = loadFailureReason === 'manual-data-required';
  const activePanelCopy = HOME_MATCH_PANEL_COPY[activeLeagueTab];

  if (isLoading) {
    return (
      <div
        className={BOARD_SHELL_CLASS}
        style={matchSectionMinHeightStyle}
        {...MATCH_PRIORITY_REGION_PROPS}
      >
        <HomeScheduleBoardHeader
          copy={activePanelCopy}
          countLabel="일정 확인 중"
          detailLabel="최신 경기 정보"
        />
        <HomeScheduleListHeader />
        <div className={BOARD_GRID_CLASS}>
          {Array.from({ length: loadingMatchCardCount }, (_, index) => <LoadingCardComponent key={`loading-game-${index}`} />)}
        </div>
      </div>
    );
  }

  if (isGamesError) {
    return (
      <HomeScheduleErrorState
        copy={activePanelCopy}
        countLabel="확인 필요"
        title={isManualDataError ? '경기 데이터를 준비하고 있어요' : '경기 일정을 불러오지 못했어요'}
        description={isManualDataError
          ? '데이터가 준비되면 이 자리에 일정이 표시돼요.'
          : '잠깐 연결이 불안정했어요. 다시 시도하면 최신 일정을 불러와요.'}
        onRetry={onRetry}
      />
    );
  }

  if (isGamesDelayed && !activeTabIsScheduled) {
    return (
      <HomeScheduleErrorState
        copy={activePanelCopy}
        countLabel="불러오는 중"
        variant="delayed"
        title="경기 정보가 늦게 도착하고 있어요"
        description="계속 불러오는 중이에요. 오래 걸리면 다시 시도해 주세요."
        onRetry={onRetry}
      />
    );
  }

  if (activeTabIsScheduled) {
    return (
      <Suspense
        fallback={(
          <HomeScheduledPanelFallback
            matchSectionMinHeightStyle={matchSectionMinHeightStyle}
            loadingMatchCardCount={loadingMatchCardCount}
            LoadingCardComponent={LoadingCardComponent}
          />
        )}
      >
        <LazyHomeScheduledMatchPanel
          isScheduledLoading={isScheduledLoading}
          isScheduledError={isScheduledError}
          loadFailureReason={loadFailureReason}
          isSecondarySectionExpanded={isSecondarySectionExpanded}
          loadingMatchCardCount={loadingMatchCardCount}
          matchSectionMinHeightStyle={matchSectionMinHeightStyle}
          scheduledPrimaryGames={scheduledPrimaryGames}
          scheduledSecondaryGames={scheduledSecondaryGames}
          liveOrFinishedScheduledGames={liveOrFinishedScheduledGames}
          scheduledPrimaryGamesBySourceDate={scheduledPrimaryGamesBySourceDate}
          scheduledSecondaryGamesBySourceDate={scheduledSecondaryGamesBySourceDate}
          shouldMountTeamLogos={shouldMountTeamLogos}
          onRetry={onRetry}
          onSelectPrediction={onSelectPrediction}
          onToggleSecondarySection={onToggleSecondarySection}
        />
      </Suspense>
    );
  }

  if (activeStandardGames.length === 0) {
    const isOffSeason = Boolean(emptyDateNavigation?.isOffSeason && !emptyDateNavigation.nextGameDate);
    return (
      <HomeScheduleStateShell
        copy={activePanelCopy}
        countLabel="0경기"
        detailLabel="선택 날짜"
      >
        <HomeMatchEmptyState isOffSeason={isOffSeason} navigation={emptyDateNavigation} />
      </HomeScheduleStateShell>
    );
  }

  return (
    <div className={BOARD_SHELL_CLASS} style={matchSectionMinHeightStyle} {...MATCH_PRIORITY_REGION_PROPS}>
      <HomeScheduleBoardHeader
        copy={activePanelCopy}
        countLabel={`${activeStandardGames.length}경기`}
        detailLabel="승부예측 이동 가능"
      />
      <HomeScheduleListHeader />
      <HomeScheduleGameList
        games={activeStandardGames}
        shouldMountTeamLogos={shouldMountTeamLogos}
        onSelectPrediction={onSelectPrediction}
      />
    </div>
  );
}
