import type { CSSProperties, ReactNode } from 'react';

import HomeGameCard from './HomeGameCard';
import { GameCardSkeleton } from './GameCardSkeleton';
import StateBlock from '../status/StateBlock';
import { CalendarDaysIcon, ClockIcon } from '../icons/PublicFeatureIcons';
import { formatSourceDateLabel } from '../../utils/homeSeasonLogic';
import type { Game } from '../../types/home';
import type { HomeLoadFailureReason } from '../../api/home';

interface HomeScheduledMatchPanelProps {
  isScheduledLoading: boolean;
  isScheduledError: boolean;
  isGamesDelayed?: boolean;
  loadFailureReason: HomeLoadFailureReason | null;
  suppressRecoveryActions?: boolean;
  isSecondarySectionExpanded: boolean;
  loadingMatchCardCount: number;
  matchSectionMinHeightStyle: CSSProperties;
  scheduledPrimaryGames: Game[];
  scheduledSecondaryGames: Game[];
  liveOrFinishedScheduledGames: Game[];
  scheduledPrimaryGamesBySourceDate: Array<[string, Game[]]>;
  scheduledSecondaryGamesBySourceDate: Array<[string, Game[]]>;
  shouldMountTeamLogos: boolean;
  onRetry: () => void;
  onSelectPrediction: (game: Game) => void;
  onToggleSecondarySection: () => void;
}

const HOME_SCHEDULED_PANEL_COPY = {
  context: 'Upcoming',
  title: '다가오는 경기',
  description: '예정 경기와 일정 변동을 날짜별로 확인하세요.',
};
const BOARD_SHELL_CLASS = 'rounded-3xl border border-primary/20 bg-white p-4 shadow-home-board ring-1 ring-primary/10 dark:border-primary/25 dark:bg-card md:p-5';
const BOARD_GRID_CLASS = 'grid grid-cols-1 items-stretch gap-2.5';
const HOME_SCHEDULED_WARNING_BADGE_CLASS = 'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-11 font-black leading-none';
const HOME_SCHEDULED_CLOCK_ICON_CLASS = 'inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current';
const HOME_SCHEDULED_TOGGLE_ICON_CLASS = 'inline-block min-w-3.5 text-center text-12 font-black leading-none';
const MATCH_PRIORITY_REGION_PROPS = {
  'aria-label': '오늘 경기 중심 영역',
  'data-priority': 'primary',
  'data-testid': 'home-match-priority-panel',
} as const;

function HomeScheduledBoardHeader({
  countLabel,
  detailLabel,
  tone = 'default',
}: {
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
            {HOME_SCHEDULED_PANEL_COPY.context}
          </span>
        </div>
        <h3 className="truncate text-20 font-black tracking-tight text-gray-950 dark:text-white sm:text-2xl">
          {HOME_SCHEDULED_PANEL_COPY.title}
        </h3>
        <p className="mt-1 text-caption font-bold leading-relaxed text-gray-500 dark:text-white sm:text-15">
          {HOME_SCHEDULED_PANEL_COPY.description}
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

function HomeScheduledStateShell({
  children,
  countLabel,
}: {
  children: ReactNode;
  countLabel: string;
}) {
  // 빈 · 오류 상태는 문구 높이만큼만 차지합니다 (로딩용 최소 높이를 쓰지 않음).
  return (
    <div className={BOARD_SHELL_CLASS} {...MATCH_PRIORITY_REGION_PROPS}>
      <HomeScheduledBoardHeader
        countLabel={countLabel}
        detailLabel="7일 일정"
      />
      {children}
    </div>
  );
}

function HomeScheduledListHeader() {
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

function HomeScheduledGameList({
  games,
  sourceDate,
  shouldMountTeamLogos,
  onSelectPrediction,
}: {
  games: Game[];
  sourceDate: string;
  shouldMountTeamLogos: boolean;
  onSelectPrediction: (game: Game) => void;
}) {
  return (
    <div className={BOARD_GRID_CLASS}>
      {games.map((game, index) => (
        <div
          key={`${game.gameId}-${sourceDate}-${index}`}
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

export default function HomeScheduledMatchPanel({
  isScheduledLoading,
  isScheduledError,
  isGamesDelayed = false,
  loadFailureReason,
  suppressRecoveryActions = false,
  isSecondarySectionExpanded,
  loadingMatchCardCount,
  matchSectionMinHeightStyle,
  scheduledPrimaryGames,
  scheduledSecondaryGames,
  liveOrFinishedScheduledGames,
  scheduledPrimaryGamesBySourceDate,
  scheduledSecondaryGamesBySourceDate,
  shouldMountTeamLogos,
  onRetry,
  onSelectPrediction,
  onToggleSecondarySection,
}: HomeScheduledMatchPanelProps) {
  const isManualDataError = loadFailureReason === 'manual-data-required';
  const firstScheduledPrimaryDate = scheduledPrimaryGamesBySourceDate[0]?.[0];
  const scheduledTotalGames = scheduledPrimaryGames.length + scheduledSecondaryGames.length;

  if (isScheduledLoading) {
    return (
      <div
        className={BOARD_SHELL_CLASS}
        style={matchSectionMinHeightStyle}
        {...MATCH_PRIORITY_REGION_PROPS}
      >
        <HomeScheduledBoardHeader
          countLabel="예정 경기 확인 중"
          detailLabel="7일 일정"
        />
        <HomeScheduledListHeader />
        <div className={BOARD_GRID_CLASS}>
          {Array.from({ length: loadingMatchCardCount }, (_, index) => (
            <GameCardSkeleton key={`scheduled-skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  if (isScheduledError) {
    return (
      <HomeScheduledStateShell countLabel="확인 필요">
        <StateBlock
          kind="error"
          title={isManualDataError ? '경기 데이터를 준비하고 있어요' : '예정 경기를 불러오지 못했어요'}
          description={isManualDataError
            ? '데이터가 준비되면 이 자리에 일정이 표시돼요.'
            : '잠깐 연결이 불안정했어요. 다시 시도하면 최신 일정을 불러와요.'}
          onRetry={suppressRecoveryActions ? undefined : onRetry}
          className="py-8"
          testId="home-scheduled-error"
        />
      </HomeScheduledStateShell>
    );
  }

  if (isGamesDelayed) {
    return (
      <HomeScheduledStateShell countLabel="불러오는 중">
        <StateBlock
          kind="filtered"
          icon={<ClockIcon className="h-5 w-5" />}
          title="경기 정보가 늦게 도착하고 있어요"
          description="계속 불러오는 중이에요. 오래 걸리면 다시 시도해 주세요."
          onRetry={suppressRecoveryActions ? undefined : onRetry}
          retryLabel="다시 불러오기"
          className="py-8"
          testId="home-scheduled-delayed"
        />
      </HomeScheduledStateShell>
    );
  }

  if (scheduledPrimaryGames.length === 0 && scheduledSecondaryGames.length === 0) {
    return (
      <HomeScheduledStateShell countLabel="0경기">
        <StateBlock
          kind="filtered"
          icon={<CalendarDaysIcon className="h-5 w-5" />}
          title="앞으로 7일 동안 예정된 경기가 없어요"
          description="위의 날짜 변경에서 다른 날짜의 일정을 볼 수 있어요."
          className="py-8"
          testId="home-scheduled-empty"
        />
      </HomeScheduledStateShell>
    );
  }

  return (
    <div className={`${BOARD_SHELL_CLASS} space-y-6`} style={matchSectionMinHeightStyle} {...MATCH_PRIORITY_REGION_PROPS}>
      <HomeScheduledBoardHeader
        countLabel={`${scheduledTotalGames}경기`}
        detailLabel={`예정 ${scheduledPrimaryGames.length}건 · 변동 ${scheduledSecondaryGames.length}건`}
        tone={scheduledSecondaryGames.length > 0 ? 'warning' : 'default'}
      />

      {scheduledPrimaryGames.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-15 font-black text-gray-800 dark:text-white">
              <span className={`${HOME_SCHEDULED_CLOCK_ICON_CLASS} text-primary dark:text-emerald-300`} aria-hidden="true" />
              <span>곧 열리는 경기</span>
              <span className="text-gray-300 dark:text-white">·</span>
              <span>{scheduledPrimaryGames.length}건</span>
            </div>
            {firstScheduledPrimaryDate && (
              <span className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-1 text-caption font-black text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                {formatSourceDateLabel(firstScheduledPrimaryDate)}
              </span>
            )}
          </div>
          {scheduledPrimaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
            <div key={`scheduled-primary-${sourceDate}`} className="space-y-2.5">
              <div className={sourceDate === firstScheduledPrimaryDate ? 'sr-only' : 'flex items-center justify-between gap-2 px-1'}>
                <h4 className="text-caption font-black text-gray-600 dark:text-white">
                  {formatSourceDateLabel(sourceDate)}
                </h4>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-12 font-black text-gray-500 dark:bg-white/10 dark:text-white">
                  {groupedGames.length}경기
                </span>
              </div>
              <HomeScheduledListHeader />
              <HomeScheduledGameList
                games={groupedGames}
                sourceDate={sourceDate}
                shouldMountTeamLogos={shouldMountTeamLogos}
                onSelectPrediction={onSelectPrediction}
              />
            </div>
          ))}
        </section>
      )}

      {scheduledSecondaryGames.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/35 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-body font-black text-amber-700 dark:text-amber-200">
              <span className={HOME_SCHEDULED_WARNING_BADGE_CLASS} aria-hidden="true">!</span>
              연기/취소
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex min-w-10 justify-center rounded-full border border-amber-200 bg-white px-2 py-0.5 text-15 font-black text-amber-700 dark:border-amber-700/40 dark:bg-white/[0.04] dark:text-amber-200">
                {scheduledSecondaryGames.length}건
              </span>
              <button
                type="button"
                data-testid="home-scheduled-secondary-toggle"
                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1 text-15 font-black text-amber-700 hover:bg-amber-50 dark:border-amber-700/40 dark:bg-white/[0.04] dark:text-amber-200 dark:hover:bg-amber-950/20"
                aria-expanded={isSecondarySectionExpanded}
                onClick={onToggleSecondarySection}
              >
                {isSecondarySectionExpanded ? '접기' : '펼치기'}
                <span className={HOME_SCHEDULED_TOGGLE_ICON_CLASS} aria-hidden="true">
                  {isSecondarySectionExpanded ? '^' : 'v'}
                </span>
              </button>
            </div>
          </div>
          {isSecondarySectionExpanded ? (
            scheduledSecondaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
              <div key={`scheduled-secondary-${sourceDate}`} className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-1">
                  <h4 className="text-caption font-black text-amber-700 dark:text-amber-200">
                    {formatSourceDateLabel(sourceDate)}
                  </h4>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-12 font-black text-amber-700 dark:bg-amber-950/20 dark:text-amber-200">
                    {groupedGames.length}경기
                  </span>
                </div>
                <HomeScheduledListHeader />
                <HomeScheduledGameList
                  games={groupedGames}
                  sourceDate={sourceDate}
                  shouldMountTeamLogos={shouldMountTeamLogos}
                  onSelectPrediction={onSelectPrediction}
                />
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-15 font-bold text-amber-700 dark:border-amber-700/30 dark:bg-amber-950/20 dark:text-amber-200">
              연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.
            </p>
          )}
        </section>
      )}

      {liveOrFinishedScheduledGames.length > 0 && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-15 font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
          기타 상태 경기 {liveOrFinishedScheduledGames.length}건은 예정경기 탭에서 제외되었습니다.
        </p>
      )}
    </div>
  );
}
