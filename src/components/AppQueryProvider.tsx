import { type ReactNode, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import { queryClient } from '../lib/queryClient';
import GlobalErrorDialog from './GlobalErrorDialog';
import PredictionQueryGuard from './PredictionQueryGuard';

export default function AppQueryProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import('../utils/clientErrorReporter').then(({ installGlobalErrorListeners }) => {
      if (cancelled) {
        return;
      }
      cleanup = installGlobalErrorListeners();
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmDialogProvider>
        <PredictionQueryGuard />
        {children ?? <Outlet />}
        <GlobalErrorDialog />
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}
