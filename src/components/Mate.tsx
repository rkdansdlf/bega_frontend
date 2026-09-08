import { lazy, Suspense, useRef } from 'react';

import {
  useMateListController,
  type UseMateListControllerReturn,
} from '../hooks/useMateListController';
import { useUIStore } from '../store/uiStore';

const MateListControlsRuntime = lazy(() => import('./MateListControlsRuntime'));
const MateResultsRuntime = lazy(() => import('./MateResultsRuntime'));

function MateResultsFallback({ announce = true }: { announce?: boolean } = {}) {
  return (
    <div
      role={announce ? 'status' : undefined}
      aria-label="메이트 파티 목록 준비 중"
      aria-hidden={announce ? undefined : 'true'}
      data-testid="mate-results-fallback"
      className="min-w-0 space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 xl:gap-5 2xl:gap-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="min-w-0 h-[304px] rounded-22 border border-gray-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface-raised))]"
          >
            <div className="flex h-full animate-pulse flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-20 rounded-full bg-muted dark:bg-white/15" />
                  <div className="h-9 w-9 rounded-full bg-muted/70 dark:bg-white/10" />
                </div>
                <div className="h-6 w-3/4 rounded bg-muted dark:bg-white/15" />
                <div className="h-4 w-1/2 rounded bg-muted/70 dark:bg-white/10" />
              </div>
              <div className="space-y-3">
                <div className="h-14 rounded-2xl bg-muted/60 dark:bg-white/10" />
                <div className="h-10 rounded-full bg-muted dark:bg-white/15" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MateControlsFallback() {
  return (
    <div
      role="status"
      aria-label="메이트 화면 준비 중"
      data-testid="mate-controls-fallback"
      className="min-w-0 space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 hidden text-13 font-semibold text-gray-500 dark:text-white/70 sm:block">
            Mate Flow
          </p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            직관 메이트 찾기
          </h1>
        </div>
        <div className="h-11 w-20 shrink-0 animate-pulse rounded-full bg-muted/70 dark:bg-white/10" />
      </div>
      <div className="grid gap-[22px] lg:grid-cols-[264px_minmax(0,1fr)]">
        <div className="hidden h-[420px] rounded-2xl border border-border/70 bg-card p-5 lg:block">
          <div className="space-y-4 animate-pulse">
            <div className="h-5 w-28 rounded bg-muted dark:bg-white/15" />
            <div className="h-11 rounded-full bg-muted/70 dark:bg-white/10" />
            <div className="h-11 rounded-full bg-muted/70 dark:bg-white/10" />
            <div className="h-28 rounded-2xl bg-muted/60 dark:bg-white/10" />
          </div>
        </div>
        <MateResultsFallback announce={false} />
      </div>
    </div>
  );
}

export type MateVisualQaStateOverride =
  | { phase: 'controls-fallback' }
  | {
    phase: 'results-fallback' | 'runtime';
    controller: UseMateListControllerReturn;
  };

interface MateProps {
  visualQaStateOverride?: MateVisualQaStateOverride;
}

export default function Mate({ visualQaStateOverride: visualQaStateOverrideProp }: MateProps = {}) {
  const liveController = useMateListController();
  const recordedSearchTermsRef = useRef<Set<string>>(new Set());
  const mateListViewMode = useUIStore((state) => state.mateListViewMode);
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : visualQaStateOverrideProp;
  const controller = visualQaStateOverride?.phase === 'controls-fallback'
    ? liveController
    : visualQaStateOverride?.controller ?? liveController;
  const effectiveViewMode = controller.isDesktopListLayout ? mateListViewMode : 'grid';

  return (
    <div
      data-testid="mate-page"
      className="relative min-h-screen min-w-0 overflow-x-clip bg-gray-50 transition-colors duration-200 dark:bg-background"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-5 pb-8 sm:px-6 lg:px-8 2xl:max-w-[1440px]">
        {visualQaStateOverride?.phase === 'controls-fallback' ? (
          <MateControlsFallback />
        ) : (
          <Suspense fallback={<MateControlsFallback />}>
            <MateListControlsRuntime
              controller={controller}
              recordedSearchTermsRef={recordedSearchTermsRef}
            >
              {visualQaStateOverride?.phase === 'results-fallback' ? (
                <MateResultsFallback />
              ) : (
                <Suspense fallback={<MateResultsFallback />}>
                  <MateResultsRuntime
                    parties={controller.parties}
                    totalPages={controller.totalPages}
                    queryPage={controller.queryPage}
                    activeTab={controller.activeTab}
                    authUserId={controller.authUserId}
                    isLoading={controller.isLoading}
                    fetchError={controller.fetchError}
                    hasActiveFilters={controller.hasActiveFilters}
                    onRetry={controller.handleRetry}
                    onResetFilters={controller.handleResetFilters}
                    onCreateParty={controller.handleCreatePartyClick}
                    onPartyClick={controller.handlePartyClick}
                    onFavoriteToggle={controller.handleFavoriteToggle}
                    onPageChange={controller.setCurrentPage}
                    favoriteUpdatingPartyId={controller.favoriteUpdatingPartyId}
                    viewMode={effectiveViewMode}
                  />
                </Suspense>
              )}
            </MateListControlsRuntime>
          </Suspense>
        )}
      </div>
    </div>
  );
}
