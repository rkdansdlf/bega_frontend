import { createElement, lazy, Suspense } from 'react';

const homeRuntimeComponent = lazy(() => import('./HomeRuntime'));

export default function Home() {
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
      {createElement(homeRuntimeComponent)}
    </Suspense>
  );
}
