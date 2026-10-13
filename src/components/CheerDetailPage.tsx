import {
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from 'react';

const CheerDetailRuntime = lazy(() => import('./CheerDetail'));

type CheerDetailRuntimeLoader = () => Promise<{
  default: ComponentType<Record<string, never>>;
}>;

export type CheerDetailPageProps = {
  runtimeLoader?: CheerDetailRuntimeLoader;
  runtimeOverride?: ReactNode;
};

const CheerDetailFallback = () => (
  <div
    className="min-h-screen bg-white font-sans transition-colors duration-200 dark:bg-background"
    data-testid="cheer-detail-route-loading"
  >
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-base text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-white dark:shadow-md">
        게시글 상세를 준비하고 있습니다.
      </div>
    </div>
  </div>
);

export default function CheerDetailPage({ runtimeLoader, runtimeOverride }: CheerDetailPageProps = {}) {
  const Runtime = runtimeLoader ? lazy(runtimeLoader) : CheerDetailRuntime;

  return (
    <Suspense fallback={<CheerDetailFallback />}>
      {runtimeOverride !== undefined
        ? runtimeOverride
        : <Runtime />}
    </Suspense>
  );
}
