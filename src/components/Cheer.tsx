import {
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from 'react';

import type { CheerProps } from './CheerRuntime';

const cheerRuntimeComponent = lazy(() => import('./CheerRuntime'));

type CheerRuntimeLoader = () => Promise<{
  default: ComponentType<CheerProps>;
}>;

export type CheerWrapperProps = CheerProps & {
  runtimeLoader?: CheerRuntimeLoader;
  runtimeOverride?: ReactNode;
};

export default function Cheer(props: CheerWrapperProps = {}) {
  const Runtime = import.meta.env.DEV && props.runtimeLoader ? lazy(props.runtimeLoader) : cheerRuntimeComponent;

    return (
    <Suspense
      fallback={(
        <div
          className="min-h-screen bg-white font-sans transition-colors duration-200 dark:bg-background"
          {...(import.meta.env.DEV ? { 'data-testid': 'cheer-route-loading' } : {})}
        >
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-body text-slate-500 font-bold leading-relaxed shadow-sm dark:border-border dark:bg-card dark:text-white dark:shadow-md">
              응원 게시판을 준비하고 있습니다.
            </div>
          </div>
        </div>
      )}
    >
      {import.meta.env.DEV && props.runtimeOverride !== undefined
        ? props.runtimeOverride
        : <Runtime {...props} />}
    </Suspense>
  );
}
