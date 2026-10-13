import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  primeUserProfileQuery,
  runSessionScopedQueryCleanup,
} from '../lib/queryClientRegistry';
import {
  clearPersistedAuthBootstrapState,
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  markPersistedAuthBootstrapFailure,
  markPersistedAuthBootstrapSuccess,
  normalizeAuthBootstrapPathname,
  resolveAuthBootstrapMode,
  shouldInitializeAuthLoading,
} from '../utils/authBootstrap';
import {
  clearStoredLoginRedirect,
  getCurrentRelativeUrl,
  sanitizeLoginRedirect,
  setStoredLoginRedirect,
} from '../utils/loginRedirect';
import { clearLegacyOwnerlessDrafts } from '../utils/viewerScopedDraftStorage';
import {
  AuthOperationSupersededError, beginAuthLogout, finishAuthLogout,
  getAuthSessionEpoch, isAuthLogoutPending, markAuthSessionEstablished, trackAuthLogout,
} from '../api/authSessionGeneration';
import type { GlobalApiErrorDetail } from '../types/error';

const LEGACY_AUTH_TOKEN_KEY = 'authToken';
const PUBLIC_OPTIONAL_BOOTSTRAP_DEDUP_MS = 60_000;
let authApiModulePromise: Promise<typeof import('../api/auth')> | null = null;
let publicOptionalBootstrapAttemptByPath: Record<string, number> = {};

type AuthBootstrapRuntimeWindow = Window & {
  __begaPublicOptionalBootstrapAttemptByPath?: Record<string, number>;
};

const loadAuthApi = () => {
  if (!authApiModulePromise) {
    authApiModulePromise = import('../api/auth');
  }

  return authApiModulePromise;
};

const notifyOtherTabsOfAuthSessionChange = () => {
  void import('../utils/authSessionEvents')
    .then(({ publishAuthSessionChanged }) => publishAuthSessionChanged())
    .catch((error: unknown) => {
      console.warn('[auth] cross-tab session notification failed', error);
    });
};

const clearLegacyAuthTokenStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch {
    // 스토리지 접근 실패는 보안 정합성 검증에서 제외하고 진행합니다.
  }
};

const getPublicOptionalBootstrapAttemptStore = (): Record<string, number> => {
  if (typeof window === 'undefined') {
    return publicOptionalBootstrapAttemptByPath;
  }

  const typedWindow = window as AuthBootstrapRuntimeWindow;
  if (!typedWindow.__begaPublicOptionalBootstrapAttemptByPath) {
    typedWindow.__begaPublicOptionalBootstrapAttemptByPath = { ...publicOptionalBootstrapAttemptByPath };
  }

  publicOptionalBootstrapAttemptByPath = typedWindow.__begaPublicOptionalBootstrapAttemptByPath;
  return publicOptionalBootstrapAttemptByPath;
};

const resetPublicOptionalBootstrapAttemptStore = () => {
  publicOptionalBootstrapAttemptByPath = {};

  if (typeof window === 'undefined') {
    return;
  }

  const typedWindow = window as AuthBootstrapRuntimeWindow;
  delete typedWindow.__begaPublicOptionalBootstrapAttemptByPath;
};

clearLegacyAuthTokenStorage();

const extractHttpStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('status' in (error as Record<string, unknown>) && typeof (error as { status?: unknown }).status === 'number') {
    return (error as { status: number }).status;
  }

  if (!('response' in (error as Record<string, unknown>))) {
    return undefined;
  }

  const response = (error as { response?: { status?: number } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
};

const extractResponseCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('data' in (error as Record<string, unknown>)) {
    const data = (error as { data?: { code?: unknown } }).data;
    if (typeof data?.code === 'string') {
      return data.code;
    }
  }

  if (!('response' in (error as Record<string, unknown>))) {
    return undefined;
  }

  const response = (error as { response?: { data?: { code?: unknown } } }).response;
  return typeof response?.data?.code === 'string' ? response.data.code : undefined;
};

const shouldKeepBootstrapHintOnError = (error: unknown): boolean => {
  const status = extractHttpStatus(error);
  return status === undefined || status >= 500;
};

const shouldClearBootstrapSuccessOnError = (error: unknown): boolean => {
  const status = extractHttpStatus(error);
  const responseCode = extractResponseCode(error);
  return status === 401 || shouldLogBootstrapFailure(status, responseCode);
};

const shouldLogBootstrapFailure = (status?: number, responseCode?: string): boolean => (
  status === 401
  || responseCode === 'REFRESH_TOKEN_MISSING'
  || responseCode === 'REFRESH_TOKEN_EXPIRED'
  || responseCode === 'REFRESH_TOKEN_NOT_FOUND'
  || responseCode === 'INVALID_REFRESH_TOKEN'
  || responseCode === 'INVALID_REFRESH_TOKEN_TYPE'
);

const isAuthBootstrapTraceEnabled = (): boolean => {
  const isDev = Boolean(import.meta.env?.DEV);
  if (typeof window === 'undefined') return isDev;
  return isDev || new URLSearchParams(window.location?.search ?? '').get('traceAuth') === '1';
};

const logBootstrapFailure = (error: unknown, options: { mode?: 'default' | 'public-optional' } = {}) => {
  const status = extractHttpStatus(error);
  const responseCode = extractResponseCode(error);
  if (!shouldLogBootstrapFailure(status, responseCode)) return;
  if (options.mode === 'public-optional') {
    if (isAuthBootstrapTraceEnabled()) {
      console.debug('[auth-bootstrap] optional public bootstrap failed', {
        status, responseCode, hadPersistedHint: hasPersistedAuthBootstrapHint(),
      });
    }
    return;
  }
  console.warn('[auth-bootstrap] session bootstrap failed', {
    status, responseCode, hadPersistedHint: hasPersistedAuthBootstrapHint(),
  });
};

const normalizeProfileImageUrl = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (
    trimmedValue.startsWith('/assets/')
    || trimmedValue.startsWith('/src/assets/')
    || trimmedValue.startsWith('blob:')
    || trimmedValue.startsWith('data:')
  ) {
    return null;
  }

  return trimmedValue.length > 0 ? trimmedValue : null;
};

export const authStoreApi = {
  fetchCurrentUserProfile: async (options?: { retryOn401?: boolean; isCurrentRequest?: () => boolean }) => {
    const authApi = await loadAuthApi();
    return authApi.fetchCurrentUserProfile(options);
  },
  logoutUser: async (isCurrentRequest?: () => boolean) => {
    const authApi = await loadAuthApi();
    return authApi.logoutUser(isCurrentRequest);
  },
  waitForAuthReissue: async () => {
    const authApi = await loadAuthApi();
    return authApi.waitForAuthReissue();
  },
  normalizeProfileImageUrl,
};

const cacheAuthenticatedUserProfile = (profile: User) => {
  if (!profile.id) {
    return;
  }

  primeUserProfileQuery({
    ...profile,
    name: profile.name || '',
    favoriteTeam: profile.favoriteTeam || '없음',
    profileImageUrl: authStoreApi.normalizeProfileImageUrl(profile.profileImageUrl),
  });
};

interface User {
  id: number;
  email: string;
  name?: string;
  handle?: string;
  favoriteTeam?: string;
  favoriteTeamColor?: string;
  profileImageUrl?: string | null;
  role?: string;
  provider?: string;    // 'LOCAL', 'GOOGLE', 'KAKAO', 'NAVER'
  providerId?: string;
  bio?: string | null;
  cheerPoints?: number; // Added cheerPoints
  hasPassword?: boolean;
}

export const isAdminRole = (role?: string): boolean =>
  role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN';

export const isLoggedInUser = (user: User | null): boolean => Boolean(user);

export type PublicAuthBootstrapPhase = 'idle' | 'scheduled' | 'running';

interface AuthState {
  user: User | null;
  isAuthLoading: boolean;
  publicAuthBootstrapPhase: PublicAuthBootstrapPhase;
  showLoginRequiredDialog: boolean;
  pendingLoginRedirect: string | null;
}

interface AuthActions {
  fetchProfileAndAuthenticate: (options?: { mode?: 'default' | 'public-optional' }) => Promise<boolean>;
  setUserProfile: (profile: Partial<Omit<User, 'id'>> & { email: string; name: string }) => void;
  deductCheerPoints: (amount: number) => void; // Added action
  login: (email: string, name: string, profileImageUrl?: string | null, role?: string, favoriteTeam?: string, id?: number, cheerPoints?: number, handle?: string, provider?: string, hasPassword?: boolean) => void;
  logout: (skipServerLogout?: boolean) => Promise<boolean>;
  setFavoriteTeam: (team: string, color: string) => void;
  setShowLoginRequiredDialog: (show: boolean) => void;
  setPendingLoginRedirect: (redirectPath?: string | null) => void;
  clearPendingLoginRedirect: () => void;
  requireLogin: (redirectPath?: string | null) => boolean;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const getInitialAuthLoadingState = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  return shouldInitializeAuthLoading(window.location.pathname, {
    isLoggedIn: false,
    hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
    authBootstrapMeta: getPersistedAuthBootstrapMeta(),
    hasInjectedAuthProfile: Boolean(
      (window as Window & { __BEGA_TEST_AUTH_PROFILE__?: unknown }).__BEGA_TEST_AUTH_PROFILE__,
    ),
  });
};

const getInitialState = (isAuthLoading = getInitialAuthLoadingState()): AuthState => ({
  user: null,
  isAuthLoading,
  publicAuthBootstrapPhase: 'idle',
  showLoginRequiredDialog: false,
  pendingLoginRedirect: null,
});

let pendingAuthProfileRequest: Promise<boolean> | null = null;
let authProfileRevision = 0;
const invalidateAuthProfileRequest = () => {
  authProfileRevision += 1;
  pendingAuthProfileRequest = null;
};
let pendingLogoutRequest: {
  sessionEpoch: number;
  userId: number;
  result: Promise<boolean>;
  completion: Promise<boolean>;
} | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      fetchProfileAndAuthenticate: async (options) => {
        const isPublicOptional = options?.mode === 'public-optional';
        if (isAuthLogoutPending()) {
          return false;
        }
        if (pendingAuthProfileRequest) {
          return pendingAuthProfileRequest;
        }

        if (isPublicOptional) {
          const pathname = normalizeAuthBootstrapPathname(
            typeof window !== 'undefined' ? window.location.pathname : '/',
          );
          const hasInMemoryUser = isLoggedInUser(get().user);
          const authBootstrapMode = resolveAuthBootstrapMode(pathname, {
            isLoggedIn: hasInMemoryUser,
            hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
            authBootstrapMeta: getPersistedAuthBootstrapMeta(),
          });
          if (authBootstrapMode !== 'defer') {
            set({ publicAuthBootstrapPhase: 'idle' });
            return false;
          }

          const now = Date.now();
          const lastAttemptAt = getPublicOptionalBootstrapAttemptStore()[pathname] ?? 0;
          if (now - lastAttemptAt <= PUBLIC_OPTIONAL_BOOTSTRAP_DEDUP_MS) {
            return false;
          }
          getPublicOptionalBootstrapAttemptStore()[pathname] = now;
        }

        const revision = authProfileRevision;
        const isCurrentProfileRequest = () => revision === authProfileRevision;
        const request = (async (): Promise<boolean> => {
          if (isPublicOptional) {
            set({ publicAuthBootstrapPhase: 'running' });
          } else {
            set({
              isAuthLoading: true,
              publicAuthBootstrapPhase: 'idle',
            });
          }

          try {
            const profile = await authStoreApi.fetchCurrentUserProfile({
              retryOn401: !isPublicOptional,
              isCurrentRequest: isCurrentProfileRequest,
            });
            if (!isCurrentProfileRequest()) return false;
            markPersistedAuthBootstrapSuccess();
            if (get().user?.id !== profile.id) {
              clearLegacyOwnerlessDrafts();
              runSessionScopedQueryCleanup();
              markAuthSessionEstablished();
            }
            cacheAuthenticatedUserProfile(profile);
            set({
              user: profile,
              isAuthLoading: false,
            });
            return true;

          } catch (error) {
            if (!isCurrentProfileRequest()) return false;
            if (error instanceof AuthOperationSupersededError) {
              set({ isAuthLoading: false });
              return false;
            }
            // 401 errors are handled by interceptor (redirect to login)
            // For other errors during initial auth check, we just reset state silently to avoid modal on startup
            logBootstrapFailure(error, { mode: isPublicOptional ? 'public-optional' : 'default' });
            markPersistedAuthBootstrapFailure({
              clearHint: !shouldKeepBootstrapHintOnError(error),
              clearSuccess: shouldClearBootstrapSuccessOnError(error),
            });

            if (!isPublicOptional) {
              clearLegacyOwnerlessDrafts();
              runSessionScopedQueryCleanup();
              set({
                user: null,
                isAuthLoading: false,
                publicAuthBootstrapPhase: 'idle',
              });
            }
            return false;
          } finally {
            if (isPublicOptional && isCurrentProfileRequest()) {
              set({ publicAuthBootstrapPhase: 'idle' });
            }
          }
        })();

        pendingAuthProfileRequest = request;
        try {
          return await request;
        } finally {
          if (pendingAuthProfileRequest === request) pendingAuthProfileRequest = null;
        }
      },

      setUserProfile: (profile: Partial<Omit<User, 'id'>> & { email: string; name: string }) => {
        set((state) => {
          const mergedProfile = state.user
            ? {
              ...state.user,
              ...profile,
            }
            : null;

          if (!mergedProfile || !('profileImageUrl' in profile)) {
            return { user: mergedProfile };
          }

          return {
            user: {
              ...mergedProfile,
              profileImageUrl: authStoreApi.normalizeProfileImageUrl(profile.profileImageUrl),
            },
          };
        });
      },

      deductCheerPoints: (amount: number) => {
        set((state) => {
          if (!state.user) return {};
          const currentPoints = state.user.cheerPoints || 0;
          return {
            user: {
              ...state.user,
              cheerPoints: Math.max(0, currentPoints - amount)
            }
          };
        });
      },

      login: (email: string, name: string, profileImageUrl?: string | null, role?: string, favoriteTeam?: string, id?: number, cheerPoints?: number, handle?: string, provider?: string, hasPassword?: boolean) => {
        const normalizedId = Number(id) || 0;
        invalidateAuthProfileRequest();
        resetPublicOptionalBootstrapAttemptStore();
        clearLegacyOwnerlessDrafts();
        runSessionScopedQueryCleanup();
        markPersistedAuthBootstrapSuccess();
        markAuthSessionEstablished();

        set({
          ...getInitialState(false),
          user: {
            id: normalizedId,
            email: email,
            name: name,
            // ... (keep existing)
            profileImageUrl: authStoreApi.normalizeProfileImageUrl(profileImageUrl),
            role: role,
            favoriteTeam: favoriteTeam || '없음',
            cheerPoints: cheerPoints || 0,
            handle: handle,
            provider: provider,
            hasPassword,
          },
        });
        notifyOtherTabsOfAuthSessionChange();
      },

      logout: (skipServerLogout = false) => {
        const clearLocalSession = () => {
          try {
            invalidateAuthProfileRequest();
            resetPublicOptionalBootstrapAttemptStore();
            clearStoredLoginRedirect();
            clearPersistedAuthBootstrapState();
            clearLegacyOwnerlessDrafts();
            runSessionScopedQueryCleanup();
            markAuthSessionEstablished();
            set(getInitialState(false));
            return true;
          } catch {
            return false;
          }
        };

        const user = get().user;
        if (!user) {
          return Promise.resolve(clearLocalSession());
        }
        if (skipServerLogout) {
          const cleared = clearLocalSession();
          if (cleared) notifyOtherTabsOfAuthSessionChange();
          return Promise.resolve(cleared);
        }

        const sessionEpoch = getAuthSessionEpoch();
        const userId = user.id;
        if (pendingLogoutRequest?.sessionEpoch === sessionEpoch
          && pendingLogoutRequest.userId === userId) {
          return pendingLogoutRequest.result;
        }
        // Logout intent takes precedence over an in-flight profile refresh.
        invalidateAuthProfileRequest();
        const intent = beginAuthLogout();
        resetPublicOptionalBootstrapAttemptStore();
        set({ isAuthLoading: false, publicAuthBootstrapPhase: 'idle' });
        const isCurrentSession = () => (
          getAuthSessionEpoch() === sessionEpoch && get().user?.id === userId
        );

        let resolveResult!: (value: boolean) => void;
        const result = new Promise<boolean>((resolve) => { resolveResult = resolve; });
        let noticeShown = false;
        const showPendingNotice = () => {
          if (!isCurrentSession() || noticeShown) return;
          noticeShown = true;
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<GlobalApiErrorDetail>('global-api-error', {
            detail: {
              message: '인증 요청의 완료 여부를 확인하고 있습니다. 로그아웃은 아직 완료되지 않았습니다.',
              statusCode: null, responseCode: 'AUTH_OPERATION_PENDING', endpoint: '/auth/logout', source: 'api',
            },
          }));
        };
        const timer = setTimeout(() => { showPendingNotice(); resolveResult(false); }, 10_000);
        const previousRequest = pendingLogoutRequest?.completion;
        const completion = import('./authLogoutRuntime')
          .then(({ runLogoutOperation }) => runLogoutOperation({
            previous: previousRequest, isCurrent: isCurrentSession,
            drain: authStoreApi.waitForAuthReissue, dispatch: authStoreApi.logoutUser,
            clear: () => {
              const cleared = clearLocalSession();
              if (cleared) notifyOtherTabsOfAuthSessionChange();
              return cleared;
            },
            retry: () => get().logout(),
            status: extractHttpStatus, code: extractResponseCode,
            incomplete: () => { clearTimeout(timer); showPendingNotice(); resolveResult(false); },
          }))
          .catch(() => { showPendingNotice(); return false; })
          .finally(() => {
            clearTimeout(timer);
            finishAuthLogout(intent);
            if (pendingLogoutRequest?.completion === completion) pendingLogoutRequest = null;
          })
          .then((value) => { resolveResult(value); return value; });
        pendingLogoutRequest = { sessionEpoch, userId, result, completion };
        trackAuthLogout(completion);
        return result;
      },
      reset: () =>
        {
          invalidateAuthProfileRequest();
          markAuthSessionEstablished();
          resetPublicOptionalBootstrapAttemptStore();
          clearPersistedAuthBootstrapState();
          clearLegacyOwnerlessDrafts();
          return set({
            ...getInitialState(),
          });
        },

      setFavoriteTeam: (team: string, color: string) =>
        set((state) => ({
          user: state.user ? { ...state.user, favoriteTeam: team, favoriteTeamColor: color } : null,
        })),

      setShowLoginRequiredDialog: (show: boolean) => {
        set({ showLoginRequiredDialog: show });
      },

      setPendingLoginRedirect: (redirectPath?: string | null) => {
        const sanitized = setStoredLoginRedirect(redirectPath);
        set({ pendingLoginRedirect: sanitized });
      },

      clearPendingLoginRedirect: () => {
        clearStoredLoginRedirect();
        set({ pendingLoginRedirect: null });
      },

      requireLogin: (redirectPath?: string | null) => {
        const currentUser = get().user;
        if (!currentUser) {
          const nextRedirect = sanitizeLoginRedirect(redirectPath) || getCurrentRelativeUrl();
          get().setPendingLoginRedirect(nextRedirect);
          get().setShowLoginRequiredDialog(true);
          return false;
        }
        return true;
      },

    }),
    {
      name: 'auth-storage',
      partialize: () => ({}),
    }
  )
);

export const useAuthSession = () =>
  useAuthStore(
    useShallow((state) => ({
      isLoggedIn: isLoggedInUser(state.user),
      isAuthLoading: state.isAuthLoading,
      userId: state.user?.id ?? null,
      sessionEpoch: getAuthSessionEpoch(),
    })),
  );

export const useAuthProfileSnapshot = () =>
  useAuthStore(
    useShallow((state) => ({
      userId: state.user?.id ?? null,
      userEmail: state.user?.email,
      userName: state.user?.name,
      userHandle: state.user?.handle,
      userFavoriteTeam: state.user?.favoriteTeam,
      userFavoriteTeamColor: state.user?.favoriteTeamColor,
      userProfileImageUrl: state.user?.profileImageUrl,
      userRole: state.user?.role,
      userProvider: state.user?.provider,
      userBio: state.user?.bio,
      userCheerPoints: state.user?.cheerPoints,
      userHasPassword: state.user?.hasPassword,
    })),
  );

export const useAuthProfileActions = () =>
  useAuthStore(
    useShallow((state) => ({
      setUserProfile: state.setUserProfile,
      fetchProfileAndAuthenticate: state.fetchProfileAndAuthenticate,
      reset: state.reset,
    })),
  );

export const useAuthAccessActions = () =>
  useAuthStore(
    useShallow((state) => ({
      logout: state.logout,
      requireLogin: state.requireLogin,
    })),
  );

export const useAuthAuthenticationActions = () =>
  useAuthStore(
    useShallow((state) => ({
      login: state.login,
      fetchProfileAndAuthenticate: state.fetchProfileAndAuthenticate,
    })),
  );

export const useAuthRedirectState = () =>
  useAuthStore(
    useShallow((state) => ({
      pendingLoginRedirect: state.pendingLoginRedirect,
      setPendingLoginRedirect: state.setPendingLoginRedirect,
      clearPendingLoginRedirect: state.clearPendingLoginRedirect,
    })),
  );

export const useAuthCheerActions = () =>
  useAuthStore(
    useShallow((state) => ({
      deductCheerPoints: state.deductCheerPoints,
    })),
  );

export const useAuthDialogState = () =>
  useAuthStore(
    useShallow((state) => ({
      showLoginRequiredDialog: state.showLoginRequiredDialog,
      setShowLoginRequiredDialog: state.setShowLoginRequiredDialog,
    })),
  );
