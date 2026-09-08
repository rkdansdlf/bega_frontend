import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminStats } from '../types/admin';
import { getAdminStatsQueryOptions } from '../hooks/adminStatsQueryOptions';
import type { AdminTabValue } from './admin/adminPageTabs';
import {
  AdminActivityIcon,
  AdminCalendarIcon,
  AdminMessageSquareIcon,
  AdminTrendingUpIcon,
  AdminUsersIcon,
} from './admin/AdminPanelIcons';
import { StatCard } from './admin/StatCard';

const AdminCommunityRuntime = lazy(() => import('./admin/AdminCommunityRuntime'));
const AdminModerationRuntime = lazy(() => import('./admin/AdminModerationRuntime'));
const AdminStadiumsRuntime = lazy(() => import('./admin/AdminStadiumsRuntime'));
const AdminAiOperationsRuntime = lazy(() => import('./admin/AdminAiOperationsRuntime'));

const COMMUNITY_TABS = new Set<AdminTabValue>(['users', 'posts', 'parties']);
const MODERATION_TABS = new Set<AdminTabValue>([
  'reports',
  'gameStatus',
  'clientErrors',
  'seatViews',
  'offseason',
]);
const DEFAULT_ADMIN_STATS: AdminStats = {
  totalUsers: 0,
  totalPosts: 0,
  totalMates: 0,
};

interface AdminPageDataRuntimeProps {
  activeTab: AdminTabValue;
  animateStatsOverride?: boolean;
  initialErrorOverride?: string | null;
  initialSuccessMessageOverride?: string | null;
  panelContentOverride?: ReactNode;
  statsErrorOverride?: string | null;
  statsOverride?: AdminStats;
}

export default function AdminPageDataRuntime({
  activeTab,
  animateStatsOverride,
  initialErrorOverride,
  initialSuccessMessageOverride,
  panelContentOverride,
  statsErrorOverride,
  statsOverride,
}: AdminPageDataRuntimeProps) {
  const hasStatsOverride = statsOverride !== undefined || statsErrorOverride !== undefined;
  const {
    data: statsData,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    ...getAdminStatsQueryOptions(),
    enabled: !hasStatsOverride,
  });
  const stats = statsOverride ?? statsData ?? DEFAULT_ADMIN_STATS;
  const [error, setError] = useState<string | null>(initialErrorOverride ?? null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccessMessageOverride ?? null);
  const [hasMountedCommunityRuntime, setHasMountedCommunityRuntime] = useState(
    COMMUNITY_TABS.has(activeTab),
  );
  const [hasMountedModerationRuntime, setHasMountedModerationRuntime] = useState(
    MODERATION_TABS.has(activeTab),
  );
  const [hasMountedStadiumsRuntime, setHasMountedStadiumsRuntime] = useState(activeTab === 'stadiums');
  const [hasMountedAiRuntime, setHasMountedAiRuntime] = useState(activeTab === 'ai');

  const loadStats = useCallback(async () => {
    await refetchStats();
  }, [refetchStats]);

  const statsError = statsErrorOverride !== undefined
    ? statsErrorOverride
    : isStatsError
      ? '통계를 불러오는데 실패했습니다.'
      : null;
  const displayedError = error ?? statsError;

  useEffect(() => {
    if (COMMUNITY_TABS.has(activeTab)) {
      setHasMountedCommunityRuntime(true);
    }
    if (MODERATION_TABS.has(activeTab)) {
      setHasMountedModerationRuntime(true);
    }
    if (activeTab === 'stadiums') {
      setHasMountedStadiumsRuntime(true);
    }
    if (activeTab === 'ai') {
      setHasMountedAiRuntime(true);
    }
  }, [activeTab]);

  return (
    <div className="min-w-0" data-testid="admin-page-data-runtime">
      {successMessage && (
        <div className="mb-6 min-w-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300" data-testid="admin-success-message" role="status">
          <div className="flex min-w-0 items-start gap-2">
            <AdminActivityIcon className="h-5 w-5 shrink-0" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{successMessage}</span>
          </div>
        </div>
      )}

      {displayedError && (
        <div className="mb-6 min-w-0 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300" data-testid="admin-error-message" role="alert">
          <div className="flex min-w-0 items-start gap-2">
            <AdminTrendingUpIcon className="h-5 w-5 shrink-0 rotate-180" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{displayedError}</span>
          </div>
        </div>
      )}

      <div className="mb-10 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
        <StatCard animate={animateStatsOverride} icon={AdminUsersIcon} label="전체 사용자" value={stats.totalUsers} color="amber" testId="admin-stat-users" />
        <div className="grid gap-6">
          <StatCard animate={animateStatsOverride} icon={AdminMessageSquareIcon} label="전체 게시글" value={stats.totalPosts} color="emerald" testId="admin-stat-posts" />
          <StatCard animate={animateStatsOverride} icon={AdminCalendarIcon} label="메이트 모임" value={stats.totalMates} color="sky" testId="admin-stat-mates" />
        </div>
      </div>

      {panelContentOverride !== undefined ? (
        <div className="min-w-0" data-testid="admin-runtime-panel-slot">
          {panelContentOverride}
        </div>
      ) : null}

      {panelContentOverride === undefined && hasMountedCommunityRuntime && (
        <div className={COMMUNITY_TABS.has(activeTab) ? 'block' : 'hidden'}>
          <Suspense fallback={<div className="mx-6 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">커뮤니티 관리 로딩 중...</div>}>
            <AdminCommunityRuntime
              activeTab={activeTab}
              onErrorChange={setError}
              onSuccessMessageChange={setSuccessMessage}
              refreshStats={loadStats}
            />
          </Suspense>
        </div>
      )}

      {panelContentOverride === undefined && hasMountedModerationRuntime && (
        <div className={MODERATION_TABS.has(activeTab) ? 'block' : 'hidden'}>
          <Suspense fallback={<div className="mx-6 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">모더레이션 패널 로딩 중...</div>}>
            <AdminModerationRuntime
              activeTab={activeTab}
              onErrorChange={setError}
              onSuccessMessageChange={setSuccessMessage}
            />
          </Suspense>
        </div>
      )}

      {panelContentOverride === undefined && hasMountedStadiumsRuntime && (
        <div className={activeTab === 'stadiums' ? 'p-6' : 'hidden'}>
          <Suspense fallback={<div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">구장 관리 로딩 중...</div>}>
            <AdminStadiumsRuntime />
          </Suspense>
        </div>
      )}

      {panelContentOverride === undefined && hasMountedAiRuntime && (
        <div className={activeTab === 'ai' ? 'p-6' : 'hidden'}>
          <Suspense fallback={<div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">AI 운영 패널 로딩 중...</div>}>
            <AdminAiOperationsRuntime />
          </Suspense>
        </div>
      )}
    </div>
  );
}
