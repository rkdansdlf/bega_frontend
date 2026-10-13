import { lazy, Suspense } from 'react';
import type { CheerBookmarksVisualQaStateOverride } from './CheerBookmarks';

const CheerBookmarksRuntime = lazy(() => import('./CheerBookmarks'));

export type CheerBookmarksPageVisualQaPhase = 'fallback' | 'runtime';

export interface CheerBookmarksPageProps {
  visualQaStateOverride?: CheerBookmarksVisualQaStateOverride;
  visualQaPhase?: CheerBookmarksPageVisualQaPhase;
}

const CheerBookmarksFallback = () => (
  <div className="min-h-screen bg-[var(--cheer-page-bg)] transition-colors duration-200">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[var(--cheer-line-10)] bg-[var(--cheer-card-bg)] px-6 py-10 text-center text-base text-slate-500 shadow-sm dark:text-white">
        북마크 목록을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

export default function CheerBookmarksPage({ visualQaStateOverride, visualQaPhase }: CheerBookmarksPageProps) {
  return (
    import.meta.env?.PROD !== true && visualQaPhase === 'fallback'
      ? <div data-testid="cheer-bookmarks-page-fallback"><CheerBookmarksFallback /></div>
      : (
        <Suspense fallback={<CheerBookmarksFallback />}>
          <CheerBookmarksRuntime visualQaStateOverride={visualQaStateOverride} />
        </Suspense>
      )
  );
}
