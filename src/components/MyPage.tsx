import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

const myPageRuntimeComponent = lazy(() => import('./MyPageRuntime'));
const MyPageFallback = () => (
  <div
    className="min-h-screen bg-background text-foreground transition-colors duration-200"
    data-testid="mypage-route-loading"
  >
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-body text-muted-foreground font-bold leading-relaxed shadow-sm">
        마이페이지를 준비하고 있습니다.
      </div>
    </div>
  </div>
);

export type MyPageProps = {
  runtimeLoader?: () => Promise<{ default: ComponentType<Record<string, never>> }>;
  runtimeOverride?: ReactNode;
};

export default function MyPage({ runtimeLoader, runtimeOverride }: MyPageProps = {}) {
  const Runtime = runtimeLoader ? lazy(runtimeLoader) : myPageRuntimeComponent;

  return (
    <Suspense
      fallback={<MyPageFallback />}
    >
      {runtimeOverride !== undefined ? runtimeOverride : <Runtime />}
    </Suspense>
  );
}
