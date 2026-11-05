import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AccountSettingsSecurityRuntime from '../../src/components/mypage/AccountSettingsSecurityRuntime';

export function mountAccountReadOverrideHarness(container: Element) {
    const root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root.render(createElement(QueryClientProvider, { client },
        createElement(MemoryRouter, null, createElement(AccountSettingsSecurityRuntime, {
            visualQaStateOverride: {
                deviceSessions: [], isSessionLoading: false, isSessionError: true,
                sessionErrorMessage: 'Synthetic read failure', securityEvents: [], isSecurityEventsLoading: false,
            },
        })),
    ));
    return () => { root.unmount(); client.clear(); };
}
