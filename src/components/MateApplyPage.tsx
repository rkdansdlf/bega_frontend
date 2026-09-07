import { lazy, Suspense } from 'react';

import type { MateApplyVisualQaStateOverride } from './MateApply';

const MateApplyRuntime = lazy(() => import('./MateApply'));

const MateApplyFallback = () => (
  <div
    data-testid="mate-apply-page-fallback"
    role="status"
    aria-busy="true"
    aria-label="메이트 신청 화면 준비 중"
    className="min-h-dvh min-w-0 overflow-x-clip bg-background transition-colors duration-200 dark:bg-background"
  >
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div
        className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-10 text-center text-base text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-white dark:shadow-md sm:px-6"
        aria-hidden="true"
      >
        메이트 신청 화면을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

type MateApplyPageProps = {
  visualQaPhase?: 'fallback' | 'runtime';
  visualQaRuntimeStateOverride?: MateApplyVisualQaStateOverride;
};

export default function MateApplyPage({
  visualQaPhase: visualQaPhaseProp,
  visualQaRuntimeStateOverride: visualQaRuntimeStateOverrideProp,
}: MateApplyPageProps = {}) {
  const visualQaPhase = import.meta.env?.PROD === true ? undefined : visualQaPhaseProp;
  const visualQaRuntimeStateOverride = import.meta.env?.PROD === true
    ? undefined
    : visualQaRuntimeStateOverrideProp;

  if (visualQaPhase === 'fallback') {
    return <MateApplyFallback />;
  }

  return (
    <Suspense fallback={<MateApplyFallback />}>
      <MateApplyRuntime visualQaStateOverride={visualQaRuntimeStateOverride} />
    </Suspense>
  );
}
