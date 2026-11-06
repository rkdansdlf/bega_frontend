import {
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
  Suspense,
  useMemo,
  useState,
} from 'react';

import {
  StadiumSeatMapErrorBoundary,
  StadiumSeatMapErrorFallback,
  StadiumSeatMapLoadingSkeleton,
} from '../StadiumSeatMapStates';
import type { StadiumSeatMapShellTemplate } from '../stadiumSeatMapRegistry';

interface SeatMapRuntimeShellProps {
  template: StadiumSeatMapShellTemplate;
  usesCoordinateGeometry: boolean;
  badgeLabel: string;
  stadiumName: string | null | undefined;
  resetKey: string;
  createComponent?: () => LazyExoticComponent<ComponentType>;
  children?: ReactNode;
}

export function SeatMapRuntimeShell({
  template,
  badgeLabel,
  stadiumName,
  resetKey,
  createComponent,
  children,
}: SeatMapRuntimeShellProps) {
  const [retryVersion, setRetryVersion] = useState(0);
  const SeatMapComponent = useMemo(
    () => createComponent?.() ?? null,
    [createComponent, resetKey, retryVersion],
  );

  if (template === 'standard') {
    return (
      <StadiumSeatMapErrorBoundary
        resetKey={resetKey}
        fallback={(onRetry) => (
          <div data-testid="stadium-seat-map">
            <StadiumSeatMapErrorFallback
              stadiumName={stadiumName}
              onRetry={() => {
                if (createComponent) {
                  setRetryVersion((version) => version + 1);
                }
                onRetry();
              }}
            />
          </div>
        )}
      >
        <Suspense
          fallback={(
            <div data-testid="stadium-seat-map">
              <StadiumSeatMapLoadingSkeleton
                label={badgeLabel}
                stadiumName={stadiumName}
              />
            </div>
          )}
        >
          {SeatMapComponent ? <SeatMapComponent /> : children}
        </Suspense>
      </StadiumSeatMapErrorBoundary>
    );
  }

  throw new Error('등록되지 않은 seat map shell template');
}
