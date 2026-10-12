import type { ReactNode } from 'react';

interface FallbackDesignSystemThemeProviderProps {
  children?: ReactNode;
  theme?: string;
  defaultTheme?: string;
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export function ThemeProvider({
  children,
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: FallbackDesignSystemThemeProviderProps) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="module-federation-theme-provider-fallback">디자인 시스템 테마를 준비하고 있습니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  return <>{children}</>;
}

export default ThemeProvider;
