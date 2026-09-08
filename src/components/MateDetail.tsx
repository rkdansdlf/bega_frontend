import { lazy, Suspense } from 'react';

const MateDetailRuntime = lazy(() => import('./MateDetailRuntime'));

type MateDetailProps = {
  visualQaPhase?: 'fallback' | 'runtime';
};

export default function MateDetail({ visualQaPhase: visualQaPhaseProp }: MateDetailProps = {}) {
  const visualQaPhase = import.meta.env?.PROD === true ? undefined : visualQaPhaseProp;
  const fallback = (
    <div
      data-testid="mate-detail-page-fallback"
      role="status"
      aria-busy="true"
      aria-label="메이트 상세 화면 준비 중"
      className="min-h-dvh min-w-0 overflow-x-clip bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-background dark:text-foreground"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-10 text-center text-base text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-white dark:shadow-md sm:px-6"
          aria-hidden="true"
        >
          메이트 상세를 준비하고 있습니다.
        </div>
      </div>
    </div>
  );

  if (visualQaPhase === 'fallback') {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <MateDetailRuntime />
    </Suspense>
  );
}
