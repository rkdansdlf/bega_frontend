import { lazy, Suspense } from 'react';

import type { NoticePageVisualQaStateOverride } from './NoticePageRuntime';

const NoticePageRuntime = lazy(() => import('./NoticePageRuntime'));

export type NoticePageVisualQaOverride =
  | { phase: 'fallback' }
  | { phase: 'runtime'; runtime: NoticePageVisualQaStateOverride };

interface NoticePageProps {
  visualQaStateOverride?: NoticePageVisualQaOverride;
}

const noticePageFallback = (
  <div
    className="min-h-screen bg-white transition-colors duration-200 dark:bg-background"
    data-testid="notice-page-fallback"
  >
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="min-w-0 break-words rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-10 text-center text-body text-slate-500 shadow-sm [overflow-wrap:anywhere] sm:px-6 dark:border-border dark:bg-card dark:text-white dark:shadow-md">
        공지사항을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

export default function NoticePage(props: NoticePageProps = {}) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : props.visualQaStateOverride;

  if (visualQaStateOverride?.phase === 'fallback') {
    return noticePageFallback;
  }

  return (
    <Suspense fallback={noticePageFallback}>
      <NoticePageRuntime
        visualQaStateOverride={visualQaStateOverride?.phase === 'runtime'
          ? visualQaStateOverride.runtime
          : undefined}
      />
    </Suspense>
  );
}
