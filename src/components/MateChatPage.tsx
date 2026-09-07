import { lazy, Suspense } from 'react';

import type { MateChatVisualQaStateOverride } from './MateChat';

const MateChatRuntime = lazy(() => import('./MateChat'));

const MateChatFallback = () => (
  <div
    data-testid="mate-chat-page-fallback"
    role="status"
    aria-busy="true"
    aria-label="메이트 채팅 화면 준비 중"
    className="min-h-dvh min-w-0 overflow-x-clip bg-background transition-colors duration-200 dark:bg-background"
  >
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div
        className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-10 text-center text-base text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-white dark:shadow-md sm:px-6"
        aria-hidden="true"
      >
        메이트 채팅을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

type MateChatPageProps = {
  visualQaPhase?: 'fallback' | 'runtime';
  visualQaRuntimeStateOverride?: MateChatVisualQaStateOverride;
};

export default function MateChatPage({
  visualQaPhase: visualQaPhaseProp,
  visualQaRuntimeStateOverride: visualQaRuntimeStateOverrideProp,
}: MateChatPageProps = {}) {
  const visualQaPhase = import.meta.env?.PROD === true ? undefined : visualQaPhaseProp;
  const visualQaRuntimeStateOverride = import.meta.env?.PROD === true
    ? undefined
    : visualQaRuntimeStateOverrideProp;

  if (visualQaPhase === 'fallback') {
    return <MateChatFallback />;
  }

  return (
    <Suspense fallback={<MateChatFallback />}>
      <MateChatRuntime visualQaStateOverride={visualQaRuntimeStateOverride} />
    </Suspense>
  );
}
