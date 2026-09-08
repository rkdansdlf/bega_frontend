import {
  createElement,
  lazy,
  Suspense,
  useCallback,
  useMemo,
  type ComponentType,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaderboard } from '../hooks/useLeaderboardPublic';
import { isLoggedInUser, useAuthStore } from '../store/authStore';
import RetroLeaderboard from '../components/retro/RetroLeaderboard';
import type { LeaderboardEntry, HotStreak } from '../api/leaderboard';
import type { TickerMessage } from '../components/retro/NewsTicker';
import type {
  AuthenticatedRetroLeaderboardProps,
  AuthenticatedRetroLeaderboardStateOverride,
} from '../components/retro/AuthenticatedRetroLeaderboard';

const AuthenticatedRetroLeaderboard = lazy(() => import('../components/retro/AuthenticatedRetroLeaderboard'));

interface LeaderboardPageRuntimeAuthStateOverride {
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  currentUserHandle?: string;
}

interface LeaderboardPageRuntimeDataOverride {
  leaderboard: LeaderboardEntry[];
  hotStreaks: HotStreak[];
  tickerMessages: TickerMessage[];
  isLoading: boolean;
}

export interface LeaderboardPageRuntimeProps {
  authStateOverride?: LeaderboardPageRuntimeAuthStateOverride;
  leaderboardStateOverride?: LeaderboardPageRuntimeDataOverride;
  authenticatedStateOverride?: AuthenticatedRetroLeaderboardStateOverride;
  authenticatedRuntimeLoader?: () => Promise<{
    default: ComponentType<AuthenticatedRetroLeaderboardProps>;
  }>;
}

/**
 * 리더보드 페이지 컨테이너
 * useLeaderboard 훅으로 데이터를 가져와 RetroLeaderboard에 전달
 */
export default function LeaderboardPageRuntime({
  authStateOverride,
  leaderboardStateOverride,
  authenticatedStateOverride,
  authenticatedRuntimeLoader,
}: LeaderboardPageRuntimeProps = {}) {
  const navigate = useNavigate();

  const storeIsLoggedIn = useAuthStore((state) => isLoggedInUser(state.user));
  const storeIsAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const storeCurrentUserHandle = useAuthStore((state) => state.user?.handle);

  const leaderboardQuery = useLeaderboard('season', 0, 10);
  const {
    leaderboard,
    hotStreaks,
    tickerMessages,
    isLoading,
  } = leaderboardStateOverride ?? leaderboardQuery;
  const isLoggedIn = authStateOverride?.isLoggedIn ?? storeIsLoggedIn;
  const isAuthLoading = authStateOverride?.isAuthLoading ?? storeIsAuthLoading;
  const currentUserHandle = authStateOverride?.currentUserHandle ?? storeCurrentUserHandle;
  const refetchLeaderboard = leaderboardQuery.refetch;
  const authenticatedComponent = useMemo<ComponentType<AuthenticatedRetroLeaderboardProps>>(
    () => (authenticatedRuntimeLoader
      ? lazy(authenticatedRuntimeLoader)
      : AuthenticatedRetroLeaderboard),
    [authenticatedRuntimeLoader],
  );

  const handleRefresh = useCallback(() => {
    void refetchLeaderboard();
  }, [refetchLeaderboard]);

  const handlePredict = useCallback(() => {
    navigate('/prediction');
  }, [navigate]);

  const hotStreakEntries = useMemo(() => hotStreaks.map((hs) => ({
    handle: hs.handle,
    userName: hs.userName,
    profileImageUrl: hs.profileImageUrl,
    level: hs.level,
    rankTitle: '',
    score: 0,
    streak: hs.streak,
  })), [hotStreaks]);

  const retroLeaderboardProps = {
    leaderboard,
    tickerMessages,
    hotStreaks: hotStreakEntries,
    isLoading,
    currentUserHandle,
    onRefresh: handleRefresh,
    onPredict: handlePredict,
    containerTestId: 'leaderboard-page-runtime',
  } as const;

  if (isLoggedIn && !isAuthLoading) {
    return (
      <Suspense fallback={<RetroLeaderboard {...retroLeaderboardProps} />}>
        {createElement(authenticatedComponent, {
          ...retroLeaderboardProps,
          stateOverride: authenticatedStateOverride,
        })}
      </Suspense>
    );
  }

  return (
    <RetroLeaderboard
      {...retroLeaderboardProps}
    />
  );
}
