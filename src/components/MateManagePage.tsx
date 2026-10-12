import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

const MateManageRuntime = lazy(() => import('./MateManage'));

const MateManageFallback = () => (
  <div
    className="min-h-screen bg-white transition-colors duration-200 dark:bg-background"
    data-testid="mate-manage-route-loading"
  >
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-base text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-white dark:shadow-md">
        메이트 관리 화면을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

export type MateManagePageProps = {
  runtimeLoader?: () => Promise<{ default: ComponentType<Record<string, never>> }>;
  runtimeOverride?: ReactNode;
};

export default function MateManagePage({ runtimeLoader, runtimeOverride }: MateManagePageProps = {}) {
  const Runtime = runtimeLoader ? lazy(runtimeLoader) : MateManageRuntime;

  return (
    <Suspense fallback={<MateManageFallback />}>
      {runtimeOverride !== undefined ? runtimeOverride : <Runtime />}
    </Suspense>
  );
}
