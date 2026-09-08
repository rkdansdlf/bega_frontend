import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '../hooks/useTheme';
import AppShellRuntime from './AppShellRuntime';

type AppBrowserShellProps = {
  routerOverride?: (children: ReactNode) => ReactNode;
  runtimeOverride?: ReactNode;
};

export default function AppBrowserShell(props: AppBrowserShellProps = {}) {
  if (import.meta.env.DEV) {
    const { routerOverride, runtimeOverride } = props;

    if (routerOverride || runtimeOverride !== undefined) {
      const runtime = runtimeOverride ?? <AppShellRuntime />;
      const content = <HelmetProvider>{runtime}</HelmetProvider>;

      return (
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="kbo-theme"
          disableTransitionOnChange
        >
          {routerOverride ? routerOverride(content) : <BrowserRouter>{content}</BrowserRouter>}
        </ThemeProvider>
      );
    }
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="kbo-theme"
      disableTransitionOnChange
    >
      <BrowserRouter>
        <HelmetProvider>
          <AppShellRuntime />
        </HelmetProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
