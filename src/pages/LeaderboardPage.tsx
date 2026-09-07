import { createElement, lazy, Suspense, useMemo, type ComponentType } from 'react';
import type { LeaderboardPageRuntimeProps } from './LeaderboardPageRuntime';

const LeaderboardPageRuntime = lazy(() => import('./LeaderboardPageRuntime'));

interface LeaderboardPageProps {
  runtimeLoader?: () => Promise<{ default: ComponentType<LeaderboardPageRuntimeProps> }>;
}

export default function LeaderboardPage({ runtimeLoader }: LeaderboardPageProps = {}) {
  const runtimeComponent = useMemo(
    () => (runtimeLoader ? lazy(runtimeLoader) : LeaderboardPageRuntime),
    [runtimeLoader],
  );

  return (
    <Suspense
      fallback={(
        <div
          className="min-h-screen bg-[#fdf6e3] px-4 py-8 text-[#2f2a20]"
          data-testid="leaderboard-page-loading-fallback"
        >
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-[#d4b98f] bg-[#f4e3b5] px-6 py-10 text-center text-body font-semibold shadow-[0_6px_0_#b08b57]">
              리더보드를 준비하고 있습니다.
            </div>
          </div>
        </div>
      )}
    >
      {createElement(runtimeComponent, {})}
    </Suspense>
  );
}
