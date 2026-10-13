import {
  createElement,
  lazy,
  Suspense,
  useMemo,
  type ComponentType,
  type ReactNode,
} from 'react';

const homeRuntimeComponent = lazy(() => import('./HomeRuntime'));

type HomeRuntimeLoader = () => Promise<{
  default: ComponentType<Record<string, never>>;
}>;

type HomeProps = {
  runtimeLoader?: HomeRuntimeLoader;
  runtimeOverride?: ReactNode;
};

export default function Home({ runtimeLoader, runtimeOverride }: HomeProps = {}) {
  const runtimeComponent = useMemo(
    () => (runtimeLoader ? lazy(runtimeLoader) : homeRuntimeComponent),
    [runtimeLoader],
  );

  return (
    <Suspense
      fallback={(
        <div
          className="min-h-screen bg-gray-50 dark:bg-background"
          aria-busy="true"
          data-testid="home-route-loading"
        />
      )}
    >
      {runtimeOverride !== undefined
        ? runtimeOverride
        : createElement(runtimeComponent)}
    </Suspense>
  );
}
