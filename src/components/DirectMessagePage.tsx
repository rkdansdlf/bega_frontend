import {
  createElement,
  lazy,
  Suspense,
  useMemo,
  type ComponentType,
  type ReactNode,
} from 'react';

const directMessageRuntimeComponent = lazy(() => import('./dm/DirectMessageRuntime'));

type DirectMessageRuntimeLoader = () => Promise<{
  default: ComponentType<Record<string, never>>;
}>;

export type DirectMessagePageProps = {
  runtimeLoader?: DirectMessageRuntimeLoader;
  runtimeOverride?: ReactNode;
};

const DirectMessageFallback = () => (
  <div
    className="min-h-screen bg-background px-4 py-10 transition-colors duration-200 sm:px-6 lg:px-8"
    data-testid="dm-route-loading"
  >
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="h-6 w-24 rounded bg-gray-200 dark:bg-secondary" />
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-secondary" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-secondary" />
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-secondary" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-14 w-3/4 rounded-2xl bg-gray-100 dark:bg-secondary/60" />
          <div className="ml-auto h-14 w-2/3 rounded-2xl bg-gray-100 dark:bg-secondary/60" />
          <div className="h-14 w-1/2 rounded-2xl bg-gray-100 dark:bg-secondary/60" />
        </div>
      </div>
    </div>
  </div>
);

export default function DirectMessagePage({ runtimeLoader, runtimeOverride }: DirectMessagePageProps = {}) {
  const runtimeComponent = useMemo(
    () => (runtimeLoader ? lazy(runtimeLoader) : directMessageRuntimeComponent),
    [runtimeLoader],
  );

  return (
    <Suspense fallback={<DirectMessageFallback />}>
      {runtimeOverride !== undefined
        ? runtimeOverride
        : createElement(runtimeComponent)}
    </Suspense>
  );
}
