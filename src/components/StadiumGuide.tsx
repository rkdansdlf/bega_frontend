import { lazy, Suspense, type ReactNode } from 'react';
import './StadiumGuide.css';

const StadiumGuideRuntime = lazy(() => import('./StadiumGuideRuntime'));

const renderStadiumGuideFallback = () => (
  <div
    className="stadium-guide-page min-h-screen bg-white dark:bg-background transition-colors duration-200"
    data-testid="stadium-guide-route-fallback"
  >
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="stadium-guide-panel min-w-0 rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-body text-slate-500 [overflow-wrap:anywhere] shadow-sm dark:text-white dark:shadow-md">
        구장 가이드를 준비하고 있습니다.
      </div>
    </div>
  </div>
);

type StadiumGuideProps = {
  visualQaPhase?: 'fallback' | 'runtime';
  visualQaRuntimeOverride?: ReactNode;
};

export default function StadiumGuide({
  visualQaPhase: visualQaPhaseProp,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: StadiumGuideProps = {}) {
  const visualQaPhase = import.meta.env?.PROD === true ? undefined : visualQaPhaseProp;
  const visualQaRuntimeOverride = import.meta.env?.PROD === true
    ? undefined
    : visualQaRuntimeOverrideProp;

  if (visualQaPhase === 'fallback') {
    return renderStadiumGuideFallback();
  }

  return (
    <Suspense
      fallback={renderStadiumGuideFallback()}
    >
      {visualQaRuntimeOverride ?? <StadiumGuideRuntime />}
    </Suspense>
  );
}
