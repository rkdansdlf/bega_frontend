import { useEffect } from 'react';
import { subscribeToAuthSessionChanges } from '../utils/authSessionEvents';

// Mounted on every page, so it must not pull the auth store (and zustand) into the first load of
// an anonymous visitor. The runtime that owns the refresh is loaded only when another tab actually
// signals a session change; a tab with no auth hint still reacts to a login made elsewhere.
export default function AuthSessionSync() {
  useEffect(() => subscribeToAuthSessionChanges(() => {
    void import('../utils/authSessionSyncRuntime')
      .then(({ refreshSessionFromSharedCookie }) => refreshSessionFromSharedCookie())
      .catch((error: unknown) => {
        console.warn('[auth] cross-tab session refresh failed', error);
      });
  }), []);

  return null;
}
