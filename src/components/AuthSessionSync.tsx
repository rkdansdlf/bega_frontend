import { useEffect } from 'react';
import { subscribeToAuthSessionChanges } from '../utils/authSessionEvents';
import { refreshSessionFromSharedCookie } from '../utils/authSessionSyncRuntime';

export default function AuthSessionSync() {
  useEffect(() => subscribeToAuthSessionChanges(() => {
    void refreshSessionFromSharedCookie().catch((error: unknown) => {
      console.warn('[auth] cross-tab session refresh failed', error);
    });
  }), [refreshSessionFromSharedCookie]);

  return null;
}
