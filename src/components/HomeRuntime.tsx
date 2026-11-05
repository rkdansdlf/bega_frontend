import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
    buildHomeLoadState,
    fetchHomeBootstrap,
    fetchHomeScopedNavigation,
    shouldRetryHomeBootstrapQuery,
    shouldShowHomeConnectionError,
    type HomeNavigationScope,
    type HomeLoadFailureReason,
    type HomeCoreLoadSuccessState,
    type HomeLoadState,
} from '../api/homeCore';
import {
    hasPrimaryScheduledGame,
    partitionScheduledGames,
    shouldAutoSwitchToScheduled,
    type LeagueTab,
} from '../utils/homeScheduleClassification';
import { cacheLeagueStartDates, formatDateForAPI, getFallbackLeagueStartDates } from '../utils/home';
import { readTimedMapValue, writeTimedMapValue } from '../utils/expiredMapEntries';
import { groupGamesBySourceDate, summarizeHomeLeagueGames } from '../utils/homeGameGrouping';
import {
    buildHomeRouteSearchParams,
    coerceHomeRouteTab,
    resolveHomeRouteState,
} from '../utils/homeRouteState';
import {
    normalizeSameSeasonNavigationDate,
    resolveNavigationTargetDate,
} from '../utils/homeNavigationLogic';
import type { Game, HomeBootstrapLoadState, HomeScopedNavigationResponse, LeagueStartDates } from '../types/home';
import type { ManualBaseballDataRequest } from '../types/manualBaseballData';
import {
    toLocalMiddayDate,
    formatHomeDate,
    isOffSeasonByDate,
} from '../utils/homeSeasonLogic';
import { resolveLeagueBadge } from '../utils/homeLeagueBadge';
import { buildHomeRequestErrorContext, buildHomeNavigationState } from '../utils/homeErrorContext';
import type { HomeNavigationState } from '../utils/homeErrorContext';
import type { HomeAuthSnapshot } from './home/HomeAuthBridge';
import HomePullToRefresh from './home/HomePullToRefresh';
import HomeRecoveryBanner from './home/HomeRecoveryBanner';
import HomeSecondaryPanelsSkeleton from './home/HomeSecondaryPanelsSkeleton';
import {
    MANUAL_BASEBALL_DATA_REQUIRED_CODE,
} from '../utils/manualBaseballDataContract';
import './HomeRuntime.css';

const homeMatchPanelModulePromise = import('./home/HomeMatchPanel');
const LazyHomeDeferredSurfaces = lazy(() => import('./home/HomeDeferredSurfaces'));
const LazyHomeMatchPanel = lazy(() => homeMatchPanelModulePromise);

const HOME_FIRST_CARD_READY_EVENT = 'bega:home-first-card-ready';
const HOME_BUTTON_BASE_CLASS = 'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-15 font-semibold transition-all outline-none focus-visible:border-ring focus-visible:ring focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0';
// Keep touch targets in CSS pixels at text zoom. Rem-based h-11/size-11
// becomes 88px at 200%, which pushes the date controls outside 320px and
// makes the header feel like it is colliding with the first content row.
const HOME_BUTTON_OUTLINE_TOUCH_CLASS = `${HOME_BUTTON_BASE_CLASS} h-[44px] min-h-[44px] rounded-xl border bg-background px-4 text-15 text-foreground hover:bg-accent hover:text-accent-foreground has-[>svg]:px-3 dark:border-input dark:bg-input/30 dark:hover:bg-input/50`;
const HOME_BUTTON_GHOST_ICON_TOUCH_CLASS = `${HOME_BUTTON_BASE_CLASS} h-[44px] min-h-[44px] w-[44px] min-w-[44px] rounded-xl p-0 hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50`;
const HOME_BUTTON_LINK_SM_CLASS = `${HOME_BUTTON_BASE_CLASS} h-8 rounded-md px-3 text-primary underline-offset-4 hover:underline has-[>svg]:px-2.5`;
const HOME_CSS_CHEVRON_LEFT_CLASS = 'block h-3.5 w-3.5 -rotate-45 border-l-2 border-t-2 border-current';
const HOME_CSS_CHEVRON_RIGHT_CLASS = 'block h-3.5 w-3.5 rotate-45 border-r-2 border-t-2 border-current';
const HOME_CSS_FLAME_CLASS = 'mr-2 inline-block h-4 w-3 rotate-45 rounded-bl-sm rounded-br-full rounded-t-full bg-orange-500';
const HOME_DEFERRED_SURFACES_DEFER_DELAY_MS = 1800;
const HOME_DEFERRED_SURFACES_IDLE_TIMEOUT_MS = 1200;
const HOME_LIVE_POLLING_DEFER_DELAY_MS = 1200;
const HOME_LIVE_POLLING_IDLE_TIMEOUT_MS = 1200;
const HOME_LOAD_TELEMETRY_IDLE_TIMEOUT_MS = 1800;

type HomeFirstCardReadyWindow = Window & {
    __begaHomeFirstCardReadyPathname?: string;
};

type HomeMatchPanelSuspenseFallbackProps = {
    loadingMatchCardCount: number;
    matchSectionMinHeightStyle: { minHeight: string };
};

type ScheduledGamePartitions = {
    primary: Game[];
    secondary: Game[];
    excluded: Game[];
};

const EMPTY_SCHEDULED_GAMES: Game[] = [];
const EMPTY_GROUPED_GAMES_BY_SOURCE_DATE: Array<[string, Game[]]> = [];
const EMPTY_SCHEDULED_GAME_PARTITIONS: ScheduledGamePartitions = {
    primary: EMPTY_SCHEDULED_GAMES,
    secondary: EMPTY_SCHEDULED_GAMES,
    excluded: EMPTY_SCHEDULED_GAMES,
};

const HOME_FALLBACK_BLOCK_CLASS = 'animate-pulse bg-gray-200 dark:bg-white/10';

// 실제 HomeGameCard 행(시간 · 원정 로고+이름 · vs · 홈 이름+로고 · 구장 · 상태)과 같은 골격.
// 공용 카드 스켈레톤을 가져오지 않는 이유: 첫 카드 경로의 정적 의존성을 늘리지 않기 위해서입니다.
function HomeMatchPanelFallbackCard() {
    return (
        <div className="min-h-[168px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card lg:min-h-[86px]">
            <div className="flex h-full flex-col gap-3 p-3 sm:p-4 lg:hidden">
                <div className="flex items-center justify-between gap-2">
                    <div className={`h-5 w-16 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    <div className={`h-6 w-20 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                </div>
                {/* 원정 · VS · 홈 — 실제 모바일 카드처럼 위아래로 쌓습니다. */}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025]">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div className={`h-9 w-9 shrink-0 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                        <div className="min-w-0 space-y-2">
                            <div className={`h-5 w-16 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                            <div className={`h-3 w-20 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                        </div>
                    </div>
                    <div className={`h-8 w-10 rounded-md ${HOME_FALLBACK_BLOCK_CLASS}`} />
                </div>
                <div className={`mx-auto h-4 w-8 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025]">
                    <div className={`h-8 w-10 rounded-md ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                        <div className="flex min-w-0 flex-col items-end space-y-2">
                            <div className={`h-5 w-16 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                            <div className={`h-3 w-20 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                        </div>
                        <div className={`h-9 w-9 shrink-0 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-white/8">
                    <div className={`h-4 w-32 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    <div className={`h-8 w-20 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                </div>
            </div>
            <div className="hidden h-full grid-cols-home-game-card items-center gap-4 px-4 py-3 lg:grid">
                <div className="space-y-2">
                    <div className={`h-5 w-14 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    <div className={`h-4 w-12 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                </div>
                <div className="flex min-w-0 items-center gap-4">
                    <div className={`h-10 w-10 shrink-0 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    <div className="min-w-0 space-y-2">
                        <div className={`h-5 w-14 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                        <div className={`h-3 w-20 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    </div>
                </div>
                <div className={`mx-auto h-5 w-8 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                <div className="flex min-w-0 items-center justify-end gap-4">
                    <div className="flex min-w-0 flex-col items-end space-y-2">
                        <div className={`h-5 w-14 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                        <div className={`h-3 w-20 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    </div>
                    <div className={`h-10 w-10 shrink-0 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                </div>
                <div className="space-y-2">
                    <div className={`h-4 w-28 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    <div className={`h-3 w-14 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`h-6 w-16 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                    <div className={`h-6 w-20 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                </div>
            </div>
        </div>
    );
}

function HomeMatchPanelSuspenseFallback({
    loadingMatchCardCount,
    matchSectionMinHeightStyle,
}: HomeMatchPanelSuspenseFallbackProps) {
    return (
        <div
            className="rounded-3xl border border-primary/20 bg-white p-4 shadow-home-board ring-1 ring-primary/10 dark:border-primary/25 dark:bg-card md:p-5"
            style={matchSectionMinHeightStyle}
            aria-busy="true"
        >
            <div className="mb-4 space-y-2 border-b border-gray-100 pb-4 dark:border-white/8">
                <div className={`h-4 w-20 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
                <div className={`h-7 w-40 rounded-full ${HOME_FALLBACK_BLOCK_CLASS}`} />
            </div>
            <div className="grid grid-cols-1 items-stretch gap-2.5">
                {Array.from({ length: loadingMatchCardCount }, (_, i) => (
                    <HomeMatchPanelFallbackCard key={`fallback-card-${i}`} />
                ))}
            </div>
        </div>
    );
}

const isPublicApiTimeoutError = (error: unknown): boolean => (
    error instanceof Error && /^Request timed out after \d+ms$/i.test(error.message)
);

const scheduleHomeLoadTelemetry = (payload: {
    selectedDate: string;
    loadState: HomeLoadState;
    success: HomeCoreLoadSuccessState;
    showConnectionError: boolean;
}) => {
    if (typeof window === 'undefined') {
        return;
    }

    const loadTelemetry = () => {
        void import('../utils/homeLoadTelemetry')
            .then(({ logHomeLoadTelemetry }) => logHomeLoadTelemetry(payload))
            .catch(() => undefined);
    };
    const setWindowTimeout = window.setTimeout.bind(window);

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadTelemetry, {
            timeout: HOME_LOAD_TELEMETRY_IDLE_TIMEOUT_MS,
        });
        return;
    }

    setWindowTimeout(loadTelemetry, 0);
};

const GAME_CARD_MIN_HEIGHT = 'min-h-[240px]';
const GAME_CARD_MIN_HEIGHT_PX = 240;
const MIN_LOADING_CARD_COUNT = 5;
const LOADING_CARD_COUNT_MAX = MIN_LOADING_CARD_COUNT;
const HOME_BOOTSTRAP_SOFT_FALLBACK_DELAY_MS = 6000;
const HOME_BOOTSTRAP_CACHE_STALE_MS = 60 * 1000;
const HOME_BOOTSTRAP_CORE_SECTIONS = [
    'leagueStartDates',
    'navigation',
    'games',
    'scheduledGamesWindow',
] as const;
const HOME_LEAGUE_TABS: Array<{ value: LeagueTab; label: string }> = [
    { value: 'regular', label: '정규시즌' },
    { value: 'postseason', label: '포스트시즌' },
    { value: 'koreanseries', label: '한국시리즈' },
    { value: 'scheduled', label: '예정경기' },
];
const EMPTY_HOME_AUTH_SNAPSHOT: HomeAuthSnapshot = {
    userId: null,
    isLoggedIn: false,
    isAdmin: false,
};

type HomeLiveSummaryTimeoutWarningState = {
    consecutiveTimeoutCount: number;
    timeoutWarningLogged: boolean;
};
type HomeBootstrapData = Awaited<ReturnType<typeof fetchHomeBootstrap>>;
type HomeScopedNavigationState = {
    scope: HomeNavigationScope;
    dateKey: string;
    response: HomeScopedNavigationResponse | null;
};
const homeBootstrapCache = new Map<string, { data: HomeBootstrapData; updatedAt: number }>();

const getTodayMidday = () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
};

const readCachedHomeBootstrap = (date: Date): HomeBootstrapData | null => {
    return readTimedMapValue(
        homeBootstrapCache,
        formatDateForAPI(date),
        Date.now(),
        HOME_BOOTSTRAP_CACHE_STALE_MS,
    );
};

const writeCachedHomeBootstrap = (date: Date, data: HomeBootstrapData) => {
    writeTimedMapValue(
        homeBootstrapCache,
        formatDateForAPI(date),
        data,
        Date.now(),
        HOME_BOOTSTRAP_CACHE_STALE_MS,
    );
};

const fetchHomeBootstrapWithRetry = async (date: Date): Promise<HomeBootstrapData> => {
    try {
        const data = await fetchHomeBootstrap(date);
        writeCachedHomeBootstrap(date, data);
        return data;
    } catch (error) {
        if (!shouldRetryHomeBootstrapQuery(0, error)) {
            throw error;
        }

        const data = await fetchHomeBootstrap(date);
        writeCachedHomeBootstrap(date, data);
        return data;
    }
};

const createHomeLiveSummaryTimeoutWarningState = (): HomeLiveSummaryTimeoutWarningState => ({
    consecutiveTimeoutCount: 0,
    timeoutWarningLogged: false,
});

const buildHomeLivePollingCandidateKey = (
    games: Game[],
    scheduledGames: Game[],
    selectedDateKey: string,
): string => {
    let candidateKey = '';
    for (const game of games) {
        const segment = `${game.gameId ?? ''}:${game.gameStatus ?? ''}:${game.sourceDate || game.gameDate || selectedDateKey}`;
        candidateKey = candidateKey ? `${candidateKey}|${segment}` : segment;
    }

    for (const game of scheduledGames) {
        const segment = `${game.gameId ?? ''}:${game.gameStatus ?? ''}:${game.sourceDate || game.gameDate || selectedDateKey}`;
        candidateKey = candidateKey ? `${candidateKey}|${segment}` : segment;
    }

    return candidateKey;
};

const isVisibleLeagueTab = (tabValue: LeagueTab, visibleLeagueTabs: typeof HOME_LEAGUE_TABS) => (
    visibleLeagueTabs.some((tab) => tab.value === tabValue)
);

const coerceVisibleLeagueTab = (tabValue: LeagueTab, visibleLeagueTabs: typeof HOME_LEAGUE_TABS): LeagueTab => (
    isVisibleLeagueTab(tabValue, visibleLeagueTabs) ? tabValue : 'regular'
);

const normalizeHomeBootstrapSectionList = (sections: string[] | null | undefined): string[] => (
    HOME_BOOTSTRAP_CORE_SECTIONS.filter((section) => sections?.includes(section))
);

const buildBootstrapSuccessState = (backendLoadState?: HomeBootstrapLoadState): HomeCoreLoadSuccessState => {
    const failedSections = new Set([
        ...normalizeHomeBootstrapSectionList(backendLoadState?.failedSections),
        ...normalizeHomeBootstrapSectionList(backendLoadState?.timedOutSections),
    ]);

    return {
        leagueStartDates: !failedSections.has('leagueStartDates'),
        navigation: !failedSections.has('navigation'),
        games: !failedSections.has('games'),
        scheduledGames: !failedSections.has('scheduledGamesWindow'),
    };
};

const buildBootstrapLoadState = (
    clientTimedOut: boolean,
    backendLoadState?: HomeBootstrapLoadState,
): HomeLoadState => {
    const timedOutSections = normalizeHomeBootstrapSectionList(backendLoadState?.timedOutSections);
    const failedSections = normalizeHomeBootstrapSectionList(backendLoadState?.failedSections);

    return buildHomeLoadState('bootstrap', {
        isFallback: backendLoadState?.isFallback === true || failedSections.length > 0,
        timedOut: clientTimedOut || backendLoadState?.timedOut === true || timedOutSections.length > 0,
        timedOutSections,
        failedSections,
        failureReason: backendLoadState?.failureReason
            ?? (failedSections.length > 0 ? 'request-failed' : null),
        manualDataRequest: backendLoadState?.manualDataRequest ?? null,
    });
};

const isHomeBootstrapSectionTimedOut = (
    loadState: HomeLoadState,
    section: (typeof HOME_BOOTSTRAP_CORE_SECTIONS)[number],
): boolean => loadState.timedOutSections.includes(section);

const isSameOrAfterDateKey = (date: Date, startDateKey: string | null | undefined): boolean => {
    if (!startDateKey) {
        return false;
    }

    const startDate = toLocalMiddayDate(startDateKey);
    if (Number.isNaN(startDate.getTime())) {
        return false;
    }

    return formatDateForAPI(date) >= formatDateForAPI(startDate);
};

const normalizeComparableDateKey = (dateKey: string | null | undefined): string | null => {
    if (!dateKey) {
        return null;
    }

    const parsedDate = toLocalMiddayDate(dateKey);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return formatDateForAPI(parsedDate);
};

const hasValidPostseasonStart = (leagueStartDates: LeagueStartDates): boolean => {
    const regularStart = normalizeComparableDateKey(leagueStartDates.regularSeasonStart);
    const postseasonStart = normalizeComparableDateKey(leagueStartDates.postseasonStart);

    return Boolean(regularStart && postseasonStart && postseasonStart > regularStart);
};

const hasValidKoreanSeriesStart = (leagueStartDates: LeagueStartDates): boolean => {
    const regularStart = normalizeComparableDateKey(leagueStartDates.regularSeasonStart);
    const postseasonStart = normalizeComparableDateKey(leagueStartDates.postseasonStart);
    const koreanSeriesStart = normalizeComparableDateKey(leagueStartDates.koreanSeriesStart);

    if (!regularStart || !koreanSeriesStart || koreanSeriesStart <= regularStart) {
        return false;
    }

    return !postseasonStart || koreanSeriesStart >= postseasonStart;
};

const buildVisibleLeagueTabs = (today: Date, leagueStartDates: LeagueStartDates) => (
    HOME_LEAGUE_TABS.filter((tab) => {
        if (tab.value === 'regular' || tab.value === 'scheduled') {
            return true;
        }
        if (tab.value === 'postseason') {
            return hasValidPostseasonStart(leagueStartDates)
                && isSameOrAfterDateKey(today, leagueStartDates.postseasonStart);
        }
        if (tab.value === 'koreanseries') {
            return hasValidKoreanSeriesStart(leagueStartDates)
                && isSameOrAfterDateKey(today, leagueStartDates.koreanSeriesStart);
        }
        return false;
    })
);

const resolveAutomaticLeagueTab = (
    games: Game[],
    scheduledGames: Game[],
    visibleLeagueTabs: typeof HOME_LEAGUE_TABS,
): LeagueTab | null => {
    if (games.length > 0) {
        const firstType = games[0].leagueType;
        if (firstType === 'POSTSEASON') return coerceVisibleLeagueTab('postseason', visibleLeagueTabs);
        if (firstType === 'KOREAN_SERIES') return coerceVisibleLeagueTab('koreanseries', visibleLeagueTabs);
        return 'regular';
    }

    if (hasPrimaryScheduledGame(scheduledGames)) {
        return 'scheduled';
    }

    return null;
};

interface HomeLoadSnapshot {
    leagueStartDates: LeagueStartDates;
    navigation: HomeNavigationState;
    games: Game[];
    scheduledGames: Game[];
    success: HomeCoreLoadSuccessState;
    loadState: HomeLoadState;
}

export default function HomeRuntime() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialHomeRouteStateRef = useRef<ReturnType<typeof resolveHomeRouteState> | null>(null);
    if (initialHomeRouteStateRef.current === null) {
        initialHomeRouteStateRef.current = resolveHomeRouteState(searchParams, getTodayMidday());
    }
    const initialHomeRouteState = initialHomeRouteStateRef.current;

    const [selectedDate, setSelectedDate] = useState(() => initialHomeRouteState.date);
    const [showCalendar, setShowCalendar] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [leagueStartDates, setLeagueStartDates] = useState<LeagueStartDates>(() => getFallbackLeagueStartDates());

    const [navInfo, setNavInfo] = useState<{ prev: string | null; next: string | null; hasPrev: boolean; hasNext: boolean }>({
        prev: null, next: null, hasPrev: true, hasNext: true
    });

    const [isLoading, setIsLoading] = useState(true);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [isGamesError, setIsGamesError] = useState(false);
    const [isGamesDelayed, setIsGamesDelayed] = useState(false);
    const [loadFailureReason, setLoadFailureReason] = useState<HomeLoadFailureReason | null>(null);
    const [manualDataRequest, setManualDataRequest] = useState<ManualBaseballDataRequest | null>(null);
    const [homeAuthSnapshot, setHomeAuthSnapshot] = useState<HomeAuthSnapshot>(EMPTY_HOME_AUTH_SNAPSHOT);

    const [activeLeagueTab, setActiveLeagueTab] = useState<LeagueTab>(() => initialHomeRouteState.tab);
    const [scheduledGames, setScheduledGames] = useState<Game[]>([]);
    const [isScheduledLoading, setIsScheduledLoading] = useState(false);
    const [isScheduledError, setIsScheduledError] = useState(false);
    const [isSecondarySectionExpanded, setIsSecondarySectionExpanded] = useState(false);
    const [scopedNavInfo, setScopedNavInfo] = useState<HomeScopedNavigationState | null>(null);
    const [isScopedNavigationLoading, setIsScopedNavigationLoading] = useState(false);
    const hasUserChangedTabRef = useRef(initialHomeRouteState.hasExplicitTab);
    const shouldSyncHomeRouteQueryRef = useRef(initialHomeRouteState.hasRouteQuery);
    const searchParamsRef = useRef(searchParams);
    const bootstrapRequestIdRef = useRef(0);
    const scopedNavigationRequestIdRef = useRef(0);
    const lastBootstrapDateKeyRef = useRef<string | null>(null);
    const homeLiveSummaryInFlightRef = useRef(false);
    const homeLiveSummaryAbortRef = useRef<AbortController | null>(null);
    const homeLiveSummaryTimeoutWarningRef = useRef(createHomeLiveSummaryTimeoutWarningState());
    const lastObservedHomeRouteSearchRef = useRef(searchParams.toString());
    const pendingHomeRouteSearchRef = useRef<string | null>(null);
    const deferredSurfacesTimeoutRef = useRef<number | null>(null);
    const deferredSurfacesIdleCallbackRef = useRef<number | null>(null);
    const matchLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const scheduledLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const [shouldMountDeferredSurfaces, setShouldMountDeferredSurfaces] = useState(false);
    const [isHomeFirstCardReady, setIsHomeFirstCardReady] = useState(false);
    const [shouldMountHomeTeamLogos, setShouldMountHomeTeamLogos] = useState(false);
    const [shouldResolveHomeLivePollingCandidateKey, setShouldResolveHomeLivePollingCandidateKey] = useState(false);
    const authUserId = homeAuthSnapshot.userId;
    const isLoggedIn = homeAuthSnapshot.isLoggedIn;
    const isAdmin = homeAuthSnapshot.isAdmin;

    const clampLoadingCount = (value: number) => (
        Math.max(MIN_LOADING_CARD_COUNT, Math.min(LOADING_CARD_COUNT_MAX, value))
    );

    useEffect(() => {
        const searchString = searchParams.toString();
        const previousSearchString = lastObservedHomeRouteSearchRef.current;
        const pendingSearchString = pendingHomeRouteSearchRef.current;

        if (pendingSearchString && searchString !== pendingSearchString) {
            return;
        }

        searchParamsRef.current = searchParams;

        if (pendingSearchString === searchString) {
            pendingHomeRouteSearchRef.current = null;
        }

        lastObservedHomeRouteSearchRef.current = searchString;
        const routeState = resolveHomeRouteState(searchParams, getTodayMidday());
        if (routeState.hasRouteQuery) {
            shouldSyncHomeRouteQueryRef.current = true;
            hasUserChangedTabRef.current = routeState.hasExplicitTab;
            const routeDateKey = formatDateForAPI(routeState.date);
            if (routeDateKey !== formatDateForAPI(selectedDate)) {
                setSelectedDate(routeState.date);
            }
            if (routeState.tab !== activeLeagueTab) {
                setActiveLeagueTab(routeState.tab);
            }
            return;
        }

        const previousRouteState = previousSearchString
            ? resolveHomeRouteState(new URLSearchParams(previousSearchString), getTodayMidday())
            : null;
        if (!previousRouteState?.hasRouteQuery) {
            return;
        }

        shouldSyncHomeRouteQueryRef.current = false;
        hasUserChangedTabRef.current = false;
        const today = getTodayMidday();
        if (formatDateForAPI(today) !== formatDateForAPI(selectedDate)) {
            setSelectedDate(today);
        }
        if (activeLeagueTab !== 'regular') {
            setActiveLeagueTab('regular');
        }
    }, [activeLeagueTab, searchParams, selectedDate]);

    const replaceHomeRouteState = useCallback((nextDate: Date, nextTab: LeagueTab) => {
        shouldSyncHomeRouteQueryRef.current = true;
        const nextSearchParams = buildHomeRouteSearchParams({
            searchParams: searchParamsRef.current,
            date: nextDate,
            tab: nextTab,
        });
        if (nextSearchParams.toString() === searchParamsRef.current.toString()) {
            return;
        }

        pendingHomeRouteSearchRef.current = nextSearchParams.toString();
        searchParamsRef.current = nextSearchParams;
        setSearchParams(nextSearchParams, { replace: true });
    }, [setSearchParams]);

    const handleGameCardSelectPrediction = async (game: Game) => {
        const fallbackDate = formatDateForAPI(selectedDate);
        const { buildPredictionMatchHandoff } = await import('../utils/predictionDeepLink')
            .catch(() => ({ buildPredictionMatchHandoff: null }));

        if (!buildPredictionMatchHandoff) {
            navigate(`/prediction?date=${encodeURIComponent(fallbackDate)}`);
            return;
        }

        const handoff = buildPredictionMatchHandoff({
            sourcePage: 'home',
            game,
            fallbackDate,
        });

        navigate(handoff.path, {
            state: handoff.state,
        });
    };

    const clearDeferredSurfacesMount = useCallback(() => {
        if (deferredSurfacesIdleCallbackRef.current !== null && 'cancelIdleCallback' in window) {
            window.cancelIdleCallback(deferredSurfacesIdleCallbackRef.current);
            deferredSurfacesIdleCallbackRef.current = null;
        }
        if (deferredSurfacesTimeoutRef.current !== null) {
            window.clearTimeout(deferredSurfacesTimeoutRef.current);
            deferredSurfacesTimeoutRef.current = null;
        }
    }, []);

    const handleHomeAuthSnapshotChange = useCallback((nextSnapshot: HomeAuthSnapshot) => {
        setHomeAuthSnapshot((currentSnapshot) => (
            currentSnapshot.userId === nextSnapshot.userId
            && currentSnapshot.isLoggedIn === nextSnapshot.isLoggedIn
            && currentSnapshot.isAdmin === nextSnapshot.isAdmin
                ? currentSnapshot
                : nextSnapshot
        ));
    }, []);

    const loadScopedNavigation = useCallback(async (
        scope: HomeNavigationScope,
        anchorDate: Date,
        options: { applyResolvedDate?: boolean } = {},
    ) => {
        const requestId = ++scopedNavigationRequestIdRef.current;
        setIsScopedNavigationLoading(true);

        try {
            const navigation = await fetchHomeScopedNavigation(anchorDate, scope, anchorDate.getFullYear());
            if (requestId !== scopedNavigationRequestIdRef.current) {
                return;
            }

            const resolvedDate = navigation.resolvedDate
                ? toLocalMiddayDate(navigation.resolvedDate)
                : null;
            const hasResolvedDate = resolvedDate !== null && !Number.isNaN(resolvedDate.getTime());
            const navigationDate = hasResolvedDate ? resolvedDate : anchorDate;
            setScopedNavInfo({
                scope,
                dateKey: formatDateForAPI(navigationDate),
                response: navigation,
            });
            if (options.applyResolvedDate && hasResolvedDate) {
                if (formatDateForAPI(resolvedDate) !== formatDateForAPI(anchorDate)) {
                    setSelectedDate(resolvedDate);
                    replaceHomeRouteState(resolvedDate, scope);
                }
            }
        } catch {
            if (requestId === scopedNavigationRequestIdRef.current) {
                setScopedNavInfo({
                    scope,
                    dateKey: formatDateForAPI(anchorDate),
                    response: null,
                });
            }
        } finally {
            if (requestId === scopedNavigationRequestIdRef.current) {
                setIsScopedNavigationLoading(false);
            }
        }
    }, [replaceHomeRouteState]);

    const currentDateNavigation = activeLeagueTab === 'regular'
        ? navInfo
        : scopedNavInfo?.scope === activeLeagueTab
            && scopedNavInfo.dateKey === formatDateForAPI(selectedDate)
            && scopedNavInfo.response
            ? {
                prev: scopedNavInfo.response.prevGameDate ?? null,
                next: scopedNavInfo.response.nextGameDate ?? null,
            }
            : null;

    const changeDate = (direction: 'prev' | 'next') => {
        // 헤더의 이전/다음 버튼은 사용자가 직접 누르는 동작이라 지연 중에도 허용합니다.
        const targetDateKey = resolveNavigationTargetDate(
            direction,
            currentDateNavigation,
            selectedDate.getFullYear(),
        );
        if (!targetDateKey) {
            return;
        }

        const targetDate = toLocalMiddayDate(targetDateKey);
        if (Number.isNaN(targetDate.getTime())) {
            return;
        }

        hasUserChangedTabRef.current = true;
        setSelectedDate(targetDate);
        replaceHomeRouteState(targetDate, activeLeagueTab);
    };

    const applyHomeSnapshot = useCallback((date: Date, snapshot: HomeLoadSnapshot, options: { isDelayedPlaceholder?: boolean } = {}) => {
        const normalizedGames = snapshot.games.map((game) => ({
            ...game,
            sourceDate: game.sourceDate || game.gameDate || formatDateForAPI(date),
        }));
        const normalizedScheduledGames = snapshot.scheduledGames.map((game) => ({
            ...game,
            sourceDate: game.sourceDate || game.gameDate || formatDateForAPI(date),
            leagueBadge: game.leagueBadge || resolveLeagueBadge(game.leagueType),
        }));

        cacheLeagueStartDates(snapshot.leagueStartDates);
        setLeagueStartDates(snapshot.leagueStartDates);
        setNavInfo(snapshot.navigation);
        setGames(normalizedGames);

        // 지연 표시용 임시 스냅샷(빈 경기 목록)으로는 탭을 자동 전환하지 않습니다.
        if (!hasUserChangedTabRef.current && !options.isDelayedPlaceholder) {
            const automaticTab = resolveAutomaticLeagueTab(
                normalizedGames,
                normalizedScheduledGames,
                buildVisibleLeagueTabs(getTodayMidday(), snapshot.leagueStartDates),
            );
            if (automaticTab) {
                setActiveLeagueTab(automaticTab);
            }
        }

        setScheduledGames(normalizedScheduledGames);
        const showConnectionError = shouldShowHomeConnectionError(snapshot.success);
        if (!showConnectionError) {
            setLastRefreshedAt(new Date());
        }

        setIsLoading(false);
        setIsGamesDelayed(false);
        setIsGamesError(!snapshot.success.games && !isHomeBootstrapSectionTimedOut(snapshot.loadState, 'games'));
        setIsScheduledLoading(false);
        setIsScheduledError(!snapshot.success.scheduledGames && !isHomeBootstrapSectionTimedOut(snapshot.loadState, 'scheduledGamesWindow'));
        setLoadFailureReason(snapshot.loadState.failureReason);
        setManualDataRequest(snapshot.loadState.manualDataRequest);

        scheduleHomeLoadTelemetry({
            selectedDate: formatDateForAPI(date),
            loadState: snapshot.loadState,
            success: snapshot.success,
            showConnectionError,
        });
    }, []);

    const buildBootstrapHomeSnapshot = (date: Date, timedOut: boolean, data: HomeBootstrapData): HomeLoadSnapshot => {
        const loadState = buildBootstrapLoadState(timedOut, data.loadState);

        return {
            leagueStartDates: data.leagueStartDates,
            navigation: buildHomeNavigationState(data.navigation),
            games: data.games,
            scheduledGames: data.scheduledGamesWindow.map((game) => ({
                ...game,
                sourceDate: game.sourceDate || game.gameDate || formatDateForAPI(date),
                leagueBadge: game.leagueBadge || resolveLeagueBadge(game.leagueType),
            })),
            success: buildBootstrapSuccessState(data.loadState),
            loadState,
        };
    };

    const buildLegacyFailureSnapshot = (
        date: Date,
        timedOut: boolean,
        failureReason: HomeLoadFailureReason,
        manualDataRequest?: ManualBaseballDataRequest | null,
    ): HomeLoadSnapshot => {
        return {
            leagueStartDates,
            navigation: {
                prev: null,
                next: null,
                hasPrev: true,
                hasNext: true,
            },
            games: [],
            scheduledGames: [],
            success: {
                leagueStartDates: false,
                navigation: false,
                games: false,
                scheduledGames: false,
            },
            loadState: buildHomeLoadState('legacy-fallback', {
                timedOut,
                timedOutSections: timedOut ? [...HOME_BOOTSTRAP_CORE_SECTIONS] : [],
                failedSections: [...HOME_BOOTSTRAP_CORE_SECTIONS],
                failureReason,
                manualDataRequest,
            }),
        };
    };

    const getCachedBootstrapSnapshot = (date: Date, timedOut: boolean): HomeLoadSnapshot | null => {
        const cachedBootstrap = readCachedHomeBootstrap(date);

        if (!cachedBootstrap) {
            return null;
        }

        return buildBootstrapHomeSnapshot(date, timedOut, cachedBootstrap);
    };

    const loadHomeBootstrap = useCallback(async (date: Date) => {
        const requestId = ++bootstrapRequestIdRef.current;
        let timedOut = false;
        let didResolve = false;
        let timeoutId: number | null = null;

        const applyTransientSnapshotIfCurrent = (snapshot: HomeLoadSnapshot, isDelayedPlaceholder = false) => {
            if (requestId !== bootstrapRequestIdRef.current) {
                return false;
            }

            applyHomeSnapshot(date, snapshot, { isDelayedPlaceholder });
            return true;
        };

        const applySnapshotIfCurrent = (snapshot: HomeLoadSnapshot) => {
            if (requestId !== bootstrapRequestIdRef.current || didResolve) {
                return false;
            }

            didResolve = true;
            applyHomeSnapshot(date, snapshot);
            return true;
        };

        setIsLoading(true);
        setIsGamesError(false);
        setIsGamesDelayed(false);
        setIsScheduledLoading(true);
        setIsScheduledError(false);
        setLoadFailureReason(null);
        setManualDataRequest(null);
        setIsHomeFirstCardReady(false);
        setShouldMountHomeTeamLogos(false);
        setShouldResolveHomeLivePollingCandidateKey(false);
        matchLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;
        scheduledLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;

        timeoutId = window.setTimeout(() => {
            if (requestId !== bootstrapRequestIdRef.current || didResolve) {
                return;
            }

            timedOut = true;
            const cachedSnapshot = getCachedBootstrapSnapshot(date, timedOut);
            if (cachedSnapshot) {
                applyTransientSnapshotIfCurrent(cachedSnapshot);
                return;
            }
            // 요청은 계속 진행 중입니다. "경기 없음"이나 "실패"로 보이지 않도록 지연 상태로 표시하고,
            // 응답이 도착하면 applySnapshotIfCurrent 가 실제 결과로 교체합니다.
            if (applyTransientSnapshotIfCurrent(buildLegacyFailureSnapshot(date, timedOut, 'request-failed'), true)) {
                setIsGamesDelayed(true);
            }
        }, HOME_BOOTSTRAP_SOFT_FALLBACK_DELAY_MS);

        try {
            const data = await fetchHomeBootstrapWithRetry(date);
            applySnapshotIfCurrent(buildBootstrapHomeSnapshot(date, timedOut, data));
        } catch (error) {
            if (requestId !== bootstrapRequestIdRef.current) {
                return;
            }

            const errorContext = buildHomeRequestErrorContext(error, '/home/bootstrap', date);
            if (errorContext.responseCode === MANUAL_BASEBALL_DATA_REQUIRED_CODE || errorContext.status === 409) {
                console.warn('[HomeBootstrap] Business conflict while loading bootstrap:', errorContext);
            } else {
                console.error('[HomeBootstrap] Error loading bootstrap:', errorContext, error);
            }
            const cachedSnapshot = getCachedBootstrapSnapshot(date, timedOut);
            if (cachedSnapshot) {
                applySnapshotIfCurrent(cachedSnapshot);
                return;
            }
            // 여기까지 왔다면 요청이 실제로 실패한 것입니다. 앞서 지연 표시가 있었더라도
            // "시간 초과"가 아니라 실패로 분류해야 경기 보드가 오류와 재시도를 보여줍니다.
            applySnapshotIfCurrent(buildLegacyFailureSnapshot(
                date,
                false,
                errorContext.responseCode === MANUAL_BASEBALL_DATA_REQUIRED_CODE || errorContext.status === 409
                    ? 'manual-data-required'
                    : 'request-failed',
                errorContext.manualDataRequest,
            ));
        } finally {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        }
    }, [applyHomeSnapshot, buildLegacyFailureSnapshot, leagueStartDates]);

    /**
     * 풀투리프레시 전용: loadHomeBootstrap과 달리 로딩 스켈레톤으로
     * 되돌리지 않고 조용히 최신 데이터로 교체합니다.
     */
    const refreshHomeSilently = useCallback(async (date: Date) => {
        const requestId = ++bootstrapRequestIdRef.current;
        try {
            const data = await fetchHomeBootstrapWithRetry(date);
            if (requestId !== bootstrapRequestIdRef.current) {
                return;
            }
            applyHomeSnapshot(date, buildBootstrapHomeSnapshot(date, false, data));
        } catch (error) {
            if (requestId !== bootstrapRequestIdRef.current) {
                return;
            }
            console.warn('[HomePullToRefresh] Failed to refresh:', error);
        }
    }, [applyHomeSnapshot]);

    const handleTabChange = (tabValue: LeagueTab) => {
        if (!isVisibleLeagueTab(tabValue, visibleLeagueTabs)) {
            return;
        }

        hasUserChangedTabRef.current = true;
        setActiveLeagueTab(tabValue);
        const today = getTodayMidday();
        setSelectedDate(today);
        replaceHomeRouteState(today, tabValue);
    };

    const selectedDateKey = useMemo(() => formatDateForAPI(selectedDate), [selectedDate]);
    useEffect(() => {
        if (activeLeagueTab === 'regular') {
            scopedNavigationRequestIdRef.current += 1;
            setScopedNavInfo(null);
            setIsScopedNavigationLoading(false);
            return;
        }

        void loadScopedNavigation(activeLeagueTab, selectedDate, { applyResolvedDate: true });
    }, [activeLeagueTab, loadScopedNavigation, selectedDate, selectedDateKey]);

    const homeLivePollingCandidateKey = useMemo(
        () => shouldResolveHomeLivePollingCandidateKey
            ? buildHomeLivePollingCandidateKey(games, scheduledGames, selectedDateKey)
            : '',
        [games, scheduledGames, selectedDateKey, shouldResolveHomeLivePollingCandidateKey],
    );
    const visibleLeagueTabs = useMemo(
        () => buildVisibleLeagueTabs(getTodayMidday(), leagueStartDates),
        [leagueStartDates],
    );
    const dateNavigation = useMemo(() => {
        const seasonYear = selectedDate.getFullYear();
        const prev = normalizeSameSeasonNavigationDate(currentDateNavigation?.prev, seasonYear);
        const next = normalizeSameSeasonNavigationDate(currentDateNavigation?.next, seasonYear);

        return {
            prev,
            next,
            hasPrev: Boolean(prev),
            hasNext: Boolean(next),
        };
    }, [currentDateNavigation, selectedDate]);
    const activeTabIsScheduled = activeLeagueTab === 'scheduled';
    const showAdminManualDataRecoveryBanner = isAdmin
        && loadFailureReason === 'manual-data-required'
        && manualDataRequest !== null;
    // 연결 실패는 경기 보드 안의 오류 블록(다시 시도 포함)이 설명합니다. 상단 배너는
    // 운영자가 데이터를 넣어야 하는 관리자 전용 상황에만 씁니다.
    const showConnectionRecoveryBanner = showAdminManualDataRecoveryBanner;
    const handleJumpToGameDate = (dateKey: string) => {
        if (isGamesDelayed) {
            return;
        }
        const targetDate = toLocalMiddayDate(dateKey);
        if (Number.isNaN(targetDate.getTime())) {
            return;
        }
        hasUserChangedTabRef.current = true;
        setSelectedDate(targetDate);
        replaceHomeRouteState(targetDate, activeLeagueTab);
    };
    const visibleLeagueTabGridClass = visibleLeagueTabs.length >= 4
        ? 'grid-cols-4'
        : visibleLeagueTabs.length === 3
            ? 'grid-cols-3'
            : 'grid-cols-2';
    const isTodayOffSeason = useMemo(() => {
        return isOffSeasonByDate(getTodayMidday(), leagueStartDates);
    }, [leagueStartDates]);
    const emptyDateNavigation = {
        nextGameDate: dateNavigation.next,
        prevGameDate: dateNavigation.prev,
        isOffSeason: isTodayOffSeason,
        onJumpToDate: handleJumpToGameDate,
        onOpenScheduled: () => {
            if (isGamesDelayed) {
                return;
            }
            handleTabChange('scheduled');
        },
        onOpenOffseason: () => navigate('/offseason'),
    };

    const handleNavigateToTodayPrediction = () => {
        const today = getTodayMidday();
        const todayDateKey = formatDateForAPI(today);

        navigate(`/prediction?date=${todayDateKey}`, {
            state: {
                sourcePage: 'home',
                date: todayDateKey,
            },
        });
    };

    useEffect(() => {
        if (shouldMountDeferredSurfaces) {
            return clearDeferredSurfacesMount;
        }

        if (!isHomeFirstCardReady) {
            clearDeferredSurfacesMount();
            return clearDeferredSurfacesMount;
        }

        const mountDeferredSurfaces = () => {
            setShouldMountDeferredSurfaces(true);
            clearDeferredSurfacesMount();
        };

        deferredSurfacesTimeoutRef.current = globalThis.setTimeout(() => {
            deferredSurfacesTimeoutRef.current = null;
            if ('requestIdleCallback' in window) {
                deferredSurfacesIdleCallbackRef.current = window.requestIdleCallback(mountDeferredSurfaces, {
                    timeout: HOME_DEFERRED_SURFACES_IDLE_TIMEOUT_MS,
                });
                return;
            }
            mountDeferredSurfaces();
        }, HOME_DEFERRED_SURFACES_DEFER_DELAY_MS) as unknown as number;

        return clearDeferredSurfacesMount;
    }, [clearDeferredSurfacesMount, isHomeFirstCardReady, shouldMountDeferredSurfaces]);

    useEffect(() => {
        const dateKey = selectedDateKey;
        if (lastBootstrapDateKeyRef.current === dateKey) {
            return;
        }

        lastBootstrapDateKeyRef.current = dateKey;
        void loadHomeBootstrap(selectedDate);
    }, [loadHomeBootstrap, selectedDate, selectedDateKey]);

    useEffect(() => {
        if (isLoading || typeof window === 'undefined') {
            return;
        }

        let firstFrameId: number | null = null;
        let secondFrameId: number | null = null;

        firstFrameId = window.requestAnimationFrame(() => {
            secondFrameId = window.requestAnimationFrame(() => {
                const typedWindow = window as HomeFirstCardReadyWindow;
                typedWindow.__begaHomeFirstCardReadyPathname = window.location.pathname;
                window.dispatchEvent(new Event(HOME_FIRST_CARD_READY_EVENT));
                setIsHomeFirstCardReady(true);
                setShouldMountHomeTeamLogos(true);
                setShouldResolveHomeLivePollingCandidateKey(true);
            });
        });

        return () => {
            if (firstFrameId !== null) {
                window.cancelAnimationFrame(firstFrameId);
            }
            if (secondFrameId !== null) {
                window.cancelAnimationFrame(secondFrameId);
            }
        };
    }, [isLoading, selectedDateKey]);

    useEffect(() => {
        const coercedTab = coerceHomeRouteTab(activeLeagueTab, visibleLeagueTabs);
        if (coercedTab === activeLeagueTab) {
            return;
        }

        setActiveLeagueTab(coercedTab);
        if (shouldSyncHomeRouteQueryRef.current) {
            replaceHomeRouteState(selectedDate, coercedTab);
        }
    }, [activeLeagueTab, replaceHomeRouteState, selectedDate, visibleLeagueTabs]);

    useEffect(() => {
        if (!shouldSyncHomeRouteQueryRef.current) {
            return;
        }

        const coercedTab = coerceHomeRouteTab(activeLeagueTab, visibleLeagueTabs);
        if (coercedTab !== activeLeagueTab) {
            return;
        }

        replaceHomeRouteState(selectedDate, activeLeagueTab);
    }, [activeLeagueTab, replaceHomeRouteState, selectedDate, visibleLeagueTabs]);

    useEffect(() => {
        if (!homeLivePollingCandidateKey) {
            return;
        }
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        let disposed = false;
        let startTimeoutId: number | null = null;
        let startIdleCallbackId: number | null = null;
        let intervalId: number | null = null;
        let handleVisibilityOrFocus: (() => void) | null = null;

        const startLiveSummaryPolling = async () => {
            const [
                {
                    LIVE_GAME_POLL_INTERVAL_MS,
                    mergeHomeGamesWithLiveSummaries,
                    recordHomeLiveSummaryTimeoutFailure,
                    resetHomeLiveSummaryTimeoutWarningState,
                    selectHomeLivePollingGameIds,
                },
                { fetchGameLiveSummaries },
            ] = await Promise.all([
                import('../utils/liveGame'),
                import('../api/prediction'),
            ]);

            if (disposed) {
                return;
            }

            const gameIds = selectHomeLivePollingGameIds(games, scheduledGames, selectedDateKey);
            if (!gameIds.length) {
                return;
            }

            resetHomeLiveSummaryTimeoutWarningState(homeLiveSummaryTimeoutWarningRef.current);

            const refreshLiveSummaries = async () => {
                if (disposed || document.visibilityState === 'hidden' || homeLiveSummaryInFlightRef.current) {
                    return;
                }

                const abortController = new AbortController();
                homeLiveSummaryInFlightRef.current = true;
                homeLiveSummaryAbortRef.current = abortController;

                try {
                    const summaries = await fetchGameLiveSummaries(gameIds, { signal: abortController.signal });
                    resetHomeLiveSummaryTimeoutWarningState(homeLiveSummaryTimeoutWarningRef.current);
                    if (disposed || abortController.signal.aborted || summaries.length === 0) {
                        return;
                    }
                    setGames((prev) => mergeHomeGamesWithLiveSummaries(prev, summaries));
                    setScheduledGames((prev) => mergeHomeGamesWithLiveSummaries(prev, summaries));
                } catch (error) {
                    if (!abortController.signal.aborted) {
                        if (isPublicApiTimeoutError(error)) {
                            if (recordHomeLiveSummaryTimeoutFailure(homeLiveSummaryTimeoutWarningRef.current)) {
                                console.warn('[HomeLivePolling] Failed to refresh live summaries:', error);
                            }
                            return;
                        }
                        console.warn('[HomeLivePolling] Failed to refresh live summaries:', error);
                    }
                } finally {
                    if (homeLiveSummaryAbortRef.current === abortController) {
                        homeLiveSummaryAbortRef.current = null;
                    }
                    homeLiveSummaryInFlightRef.current = false;
                }
            };

            handleVisibilityOrFocus = () => {
                if (document.visibilityState === 'hidden') {
                    homeLiveSummaryAbortRef.current?.abort();
                    return;
                }
                void refreshLiveSummaries();
            };

            void refreshLiveSummaries();
            intervalId = window.setInterval(() => {
                void refreshLiveSummaries();
            }, LIVE_GAME_POLL_INTERVAL_MS);

            document.addEventListener('visibilitychange', handleVisibilityOrFocus);
            window.addEventListener('focus', handleVisibilityOrFocus);
        };

        const beginLiveSummaryPolling = () => {
            void startLiveSummaryPolling().catch((error) => {
                if (!disposed) {
                    console.warn('[HomeLivePolling] Failed to initialize live summaries:', error);
                }
            });
        };

        startTimeoutId = globalThis.setTimeout(() => {
            startTimeoutId = null;
            if ('requestIdleCallback' in window) {
                startIdleCallbackId = window.requestIdleCallback(beginLiveSummaryPolling, {
                    timeout: HOME_LIVE_POLLING_IDLE_TIMEOUT_MS,
                });
                return;
            }
            beginLiveSummaryPolling();
        }, HOME_LIVE_POLLING_DEFER_DELAY_MS) as unknown as number;

        return () => {
            disposed = true;
            if (startIdleCallbackId !== null && 'cancelIdleCallback' in window) {
                window.cancelIdleCallback(startIdleCallbackId);
                startIdleCallbackId = null;
            }
            if (startTimeoutId !== null) {
                window.clearTimeout(startTimeoutId);
                startTimeoutId = null;
            }
            homeLiveSummaryAbortRef.current?.abort();
            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
            if (handleVisibilityOrFocus !== null) {
                document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
                window.removeEventListener('focus', handleVisibilityOrFocus);
            }
        };
    }, [homeLivePollingCandidateKey, selectedDateKey]);

    useEffect(() => {
        setIsSecondarySectionExpanded(false);
    }, [selectedDate]);

    useEffect(() => {
        if (showCalendar) {
            clearDeferredSurfacesMount();
            setShouldMountDeferredSurfaces(true);
        }
    }, [clearDeferredSurfacesMount, showCalendar]);

    const {
        regularSeasonCount,
        postSeasonCount,
        koreanSeriesCount,
        activeStandardGames,
    } = useMemo(
        () => summarizeHomeLeagueGames(games, activeLeagueTab),
        [activeLeagueTab, games],
    );
    const hasScheduledPrimaryGame = useMemo(
        () => hasPrimaryScheduledGame(scheduledGames),
        [scheduledGames],
    );
    const scheduledGamePartitions = useMemo(
        () => activeTabIsScheduled ? partitionScheduledGames(scheduledGames) : EMPTY_SCHEDULED_GAME_PARTITIONS,
        [activeTabIsScheduled, scheduledGames],
    );
    const {
        primary: scheduledPrimaryGames,
        secondary: scheduledSecondaryGames,
        excluded: liveOrFinishedScheduledGames,
    } = scheduledGamePartitions;
    const scheduledPrimaryGamesBySourceDate = useMemo(
        () => activeTabIsScheduled ? groupGamesBySourceDate(scheduledPrimaryGames, selectedDateKey) : EMPTY_GROUPED_GAMES_BY_SOURCE_DATE,
        [activeTabIsScheduled, scheduledPrimaryGames, selectedDateKey],
    );
    const scheduledSecondaryGamesBySourceDate = useMemo(
        () => activeTabIsScheduled ? groupGamesBySourceDate(scheduledSecondaryGames, selectedDateKey) : EMPTY_GROUPED_GAMES_BY_SOURCE_DATE,
        [activeTabIsScheduled, scheduledSecondaryGames, selectedDateKey],
    );
    const displayedHomeDate = selectedDate;
    const matchSkeletonCount = clampLoadingCount(
        Math.max(regularSeasonCount, postSeasonCount, koreanSeriesCount),
    );
    const scheduledSkeletonCount = clampLoadingCount(
        activeTabIsScheduled
            ? Math.max(scheduledPrimaryGames.length + scheduledSecondaryGames.length, scheduledGames.length)
            : scheduledGames.length,
    );

    if (!isLoading) {
        matchLoadingCardCountRef.current = Math.max(
            matchLoadingCardCountRef.current,
            matchSkeletonCount
        );
    }

    if (!isScheduledLoading) {
        scheduledLoadingCardCountRef.current = Math.max(
            MIN_LOADING_CARD_COUNT,
            scheduledSkeletonCount,
            scheduledLoadingCardCountRef.current
        );
    }

    const activeCardHeight = GAME_CARD_MIN_HEIGHT_PX;
    const loadingMatchCardCount = activeTabIsScheduled
        ? scheduledLoadingCardCountRef.current
        : matchLoadingCardCountRef.current;
    const minLoadingCount = Math.max(MIN_LOADING_CARD_COUNT, loadingMatchCardCount);
    const desktopRows = Math.max(1, Math.ceil(Math.min(minLoadingCount, 4) / 2));
    const mobileRows = Math.max(1, Math.min(minLoadingCount, 2));
    const mobileHeight = (mobileRows * activeCardHeight) + ((mobileRows - 1) * 12);
    const desktopHeight = (desktopRows * activeCardHeight) + ((desktopRows - 1) * 12);
    const calculatedMatchSectionMinHeight = Math.max(Math.max(mobileHeight, desktopHeight) + 24, 100);
    const matchSectionMinHeightStyle = { minHeight: `${calculatedMatchSectionMinHeight}px` };
    // 로딩 중에만 자리를 예약합니다. 빈 날 · 오류는 문구 높이만큼만.
    const shouldReserveMatchSectionHeight = isLoading || (activeTabIsScheduled && isScheduledLoading);

    useEffect(() => {
        const shouldSwitch = shouldAutoSwitchToScheduled({
            activeLeagueTab,
            hasUserChangedTab: hasUserChangedTabRef.current,
            isLoading,
            isScheduledLoading,
            isGamesDelayed,
            regularCount: regularSeasonCount,
            postseasonCount: postSeasonCount,
            koreanSeriesCount,
            scheduledPrimaryCount: hasScheduledPrimaryGame ? 1 : 0,
        });

        if (shouldSwitch) {
            setActiveLeagueTab('scheduled');
        }
    }, [
        activeLeagueTab,
        isGamesDelayed,
        isLoading,
        isScheduledLoading,
        regularSeasonCount,
        postSeasonCount,
        koreanSeriesCount,
        hasScheduledPrimaryGame,
    ]);

    return (
        <div className="min-h-screen overflow-x-clip bg-gray-50 dark:bg-background transition-colors duration-300 pb-[var(--mobile-content-safe-bottom)] lg:pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <HomePullToRefresh
                contentClassName="space-y-5"
                lastRefreshedLabel={lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : null}
                onRefresh={() => refreshHomeSilently(selectedDate)}
              >
                {showConnectionRecoveryBanner && (
                    <HomeRecoveryBanner
                        loadFailureReason={loadFailureReason}
                        manualDataRequest={manualDataRequest}
                        onRetry={() => {
                            setManualDataRequest(null);
                            void loadHomeBootstrap(selectedDate);
                        }}
                    />
                )}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/70 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-primary to-primary/50" aria-hidden="true" />
                            <div>
                                <span className="block text-13 font-semibold text-muted-foreground">
                                    Scoreboard
                                </span>
                                <h1 className="text-3xl font-extrabold tracking-tight text-primary dark:text-emerald-400">
                                    KBO LEAGUE
                                </h1>
                            </div>
                        </div>
                        <p className="mt-2 pl-[18px] font-medium text-muted-foreground">
                            {selectedDate.getFullYear()} 시즌 경기 일정 및 순위
                        </p>
                    </div>
                    <div>
                        {isTodayOffSeason ? (
                            <button
                                type="button"
                                data-testid="home-offseason-cta"
                                onClick={() => navigate('/offseason')}
                                className={`${HOME_BUTTON_OUTLINE_TOUCH_CLASS} home-runtime-touch-outline border-emerald-600/20 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-900/20`}
                            >
                                <span className={HOME_CSS_FLAME_CLASS} aria-hidden="true" />
                                스토브리그
                            </button>
                        ) : (
                            <button
                                type="button"
                                data-priority="secondary"
                                data-testid="home-secondary-prediction-cta"
                                onClick={handleNavigateToTodayPrediction}
                                className={`${HOME_BUTTON_OUTLINE_TOUCH_CLASS} home-runtime-touch-outline border-primary/25 bg-white font-black text-primary hover:bg-primary/5 dark:border-primary/40 dark:bg-card dark:text-emerald-300 dark:hover:bg-primary/10`}
                            >
                                전력분석실 보기
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-border bg-card px-[min(1rem,16px)] py-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 sm:flex-row sm:items-center sm:justify-center sm:px-6 md:w-fit md:mx-auto">
                  <div className="flex items-center justify-center gap-[min(1rem,12px)] sm:gap-6">
                    <button
                      type="button"
                      data-testid="home-date-prev"
                      onClick={() => changeDate('prev')}
                      disabled={isLoading || isScopedNavigationLoading || !dateNavigation.hasPrev}
                      aria-label="이전 날짜"
                      className={`${HOME_BUTTON_GHOST_ICON_TOUCH_CLASS} home-runtime-touch-icon home-runtime-date-control hover:bg-emerald-50 hover:text-primary disabled:opacity-30 dark:hover:bg-emerald-900/20`}
                    >
                        <span className={HOME_CSS_CHEVRON_LEFT_CLASS} aria-hidden="true" />
                    </button>

                    <div className="flex min-w-0 max-w-full flex-col items-center">
                        <h2 className="mb-1 max-w-full text-center break-words break-keep text-[length:min(1.25rem,30px)] font-extrabold leading-none tracking-tight text-foreground">
                            {formatHomeDate(displayedHomeDate).split(' ').map((part, index) => (
                                <Fragment key={index}>
                                    {index > 0 ? ' ' : null}
                                    <span className="whitespace-nowrap">{part}</span>
                                </Fragment>
                            ))}
                        </h2>
                        <button
                            type="button"
                            onClick={() => {
                                setShouldMountDeferredSurfaces(true);
                                setShowCalendar(true);
                            }}
                            className={`${HOME_BUTTON_LINK_SM_CLASS} home-runtime-date-link min-h-[44px] px-2 py-0 text-body font-bold text-primary opacity-80 transition-opacity hover:opacity-100 dark:text-emerald-400`}
                        >
                            날짜 변경
                        </button>
                    </div>

                    <button
                      type="button"
                      data-testid="home-date-next"
                      onClick={() => changeDate('next')}
                      disabled={isLoading || isScopedNavigationLoading || !dateNavigation.hasNext}
                      aria-label="다음 날짜"
                      className={`${HOME_BUTTON_GHOST_ICON_TOUCH_CLASS} home-runtime-touch-icon home-runtime-date-control hover:bg-emerald-50 hover:text-primary disabled:opacity-30 dark:hover:bg-emerald-900/20`}
                    >
                        <span className={HOME_CSS_CHEVRON_RIGHT_CLASS} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-3">
                    <div className="w-full">
                        <div className="flex justify-center mb-6">
                            <div
                                role="tablist"
                                aria-label="경기 구분 선택"
                                className={`grid w-full max-w-xl ${visibleLeagueTabGridClass} bg-muted p-1 rounded-xl mx-auto`}
                            >
                                {visibleLeagueTabs.map((tab) => {
                                    const isActive = activeLeagueTab === tab.value;
                                    return (
                                        <button
                                            key={tab.value}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`home-tabpanel-${tab.value}`}
                                            id={`home-tab-${tab.value}`}
                                            className={`min-h-11 rounded-lg px-2 py-2 text-body font-bold transition-all ${
                                                isActive
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            onClick={() => handleTabChange(tab.value)}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            id={`home-tabpanel-${activeLeagueTab}`}
                            role="tabpanel"
                            aria-labelledby={`home-tab-${activeLeagueTab}`}
                            className="animate-in fade-in duration-150"
                            style={shouldReserveMatchSectionHeight ? matchSectionMinHeightStyle : undefined}
                        >
                            <Suspense
                                fallback={(
                                    <HomeMatchPanelSuspenseFallback
                                        loadingMatchCardCount={loadingMatchCardCount}
                                        matchSectionMinHeightStyle={matchSectionMinHeightStyle}
                                    />
                                )}
                            >
                                <LazyHomeMatchPanel
                                    activeLeagueTab={activeLeagueTab}
                                    isLoading={isLoading}
                                    isGamesError={isGamesError}
                                    isGamesDelayed={isGamesDelayed}
                                    emptyDateNavigation={emptyDateNavigation}
                                    loadFailureReason={loadFailureReason}
                                    isScheduledLoading={isScheduledLoading}
                                    isScheduledError={isScheduledError}
                                    suppressRecoveryActions={showConnectionRecoveryBanner}
                                    isSecondarySectionExpanded={isSecondarySectionExpanded}
                                    loadingMatchCardCount={loadingMatchCardCount}
                                    matchSectionMinHeightStyle={matchSectionMinHeightStyle}
                                    activeStandardGames={activeStandardGames}
                                    scheduledPrimaryGames={scheduledPrimaryGames}
                                    scheduledSecondaryGames={scheduledSecondaryGames}
                                    liveOrFinishedScheduledGames={liveOrFinishedScheduledGames}
                                    scheduledPrimaryGamesBySourceDate={scheduledPrimaryGamesBySourceDate}
                                    scheduledSecondaryGamesBySourceDate={scheduledSecondaryGamesBySourceDate}
                                    shouldMountTeamLogos={shouldMountHomeTeamLogos}
                                    LoadingCardComponent={HomeMatchPanelFallbackCard}
                                    onRetry={() => void loadHomeBootstrap(selectedDate)}
                                    onSelectPrediction={handleGameCardSelectPrediction}
                                    onToggleSecondarySection={() => setIsSecondarySectionExpanded(prev => !prev)}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>
              </HomePullToRefresh>

                {shouldMountDeferredSurfaces || showCalendar ? (
                    <Suspense fallback={<HomeSecondaryPanelsSkeleton />}>
                        <LazyHomeDeferredSurfaces
                            selectedDate={selectedDate}
                            selectedDateKey={selectedDateKey}
                            showCalendar={showCalendar}
                            loggedIn={isLoggedIn}
                            userId={authUserId ? String(authUserId) : null}
                            suppressRecoveryActions={showConnectionRecoveryBanner}
                            onAuthSnapshotChange={handleHomeAuthSnapshotChange}
                            onCloseCalendar={() => setShowCalendar(false)}
                            onSelectCalendarDate={(nextDate) => {
                                hasUserChangedTabRef.current = true;
                                setSelectedDate(nextDate);
                                replaceHomeRouteState(nextDate, activeLeagueTab);
                                setShowCalendar(false);
                            }}
                        />
                    </Suspense>
                ) : (
                    <HomeSecondaryPanelsSkeleton />
                )}
                <div
                    className="h-[var(--mobile-content-safe-bottom)] lg:hidden"
                    aria-hidden="true"
                    data-testid="home-mobile-bottom-spacer"
                />
            </div>
        </div>
    );
}
