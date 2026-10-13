import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

const dmInboxRuntimeComponent = lazy(() => import('./dm/DmInboxRuntime'));

const DmInboxFallback = () => (
  <div
    className="min-h-screen bg-background px-4 py-10 transition-colors duration-200 sm:px-6 lg:px-8"
    data-testid="dm-inbox-route-loading"
  >
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="h-7 w-32 rounded bg-gray-200 dark:bg-secondary" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-200 dark:bg-secondary" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 max-w-full rounded bg-gray-200 dark:bg-secondary" />
            <div className="h-3 w-40 max-w-full rounded bg-gray-100 dark:bg-secondary/60" />
          </div>
          <div className="h-3 w-10 rounded bg-gray-100 dark:bg-secondary/60" />
        </div>
      ))}
    </div>
  </div>
);

export type DmInboxPageProps = {
  runtimeLoader?: () => Promise<{ default: ComponentType<Record<string, never>> }>;
  runtimeOverride?: ReactNode;
};

export default function DmInboxPage({ runtimeLoader, runtimeOverride }: DmInboxPageProps = {}) {
  const Runtime = runtimeLoader ? lazy(runtimeLoader) : dmInboxRuntimeComponent;

  return (
    <Suspense fallback={<DmInboxFallback />}>
      {runtimeOverride !== undefined ? runtimeOverride : <Runtime />}
    </Suspense>
  );
}
