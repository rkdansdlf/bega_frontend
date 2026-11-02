import { lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { BlockToggleResponse } from '../../api/blockApi';
import { getPublicFollowCounts, type FollowCountResponse, type FollowToggleResponse } from '../../api/followPublic';
import { fetchPublicUserProfileByHandle } from '../../api/profilePublic';
import type { PublicUserProfile } from '../../types/profile';
import { getTeamKoreanName } from '../../utils/teamNames';
import { useAuthStore } from '../../store/authStore';
import { useViewerQueryScope } from '../../hooks/useViewerQueryScope';
import { isViewerQueryScopeCurrent } from '../../utils/viewerQueryScope';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Button } from '../ui/plain-button';
import {
    UserProfileQuoteIcon as ProfileQuoteIcon,
    UserProfileSpinnerIcon as ProfileLoaderIcon,
    UserProfileTrophyIcon as ProfileTrophyIcon,
    UserProfileUsersIcon as ProfileUsersIcon,
    UserProfileXIcon as ProfileCloseIcon,
} from './UserProfileIcons';

const FollowButton = lazy(() => import('./FollowButton'));
const BlockButton = lazy(() => import('./BlockButton'));

export interface UserProfileModalProps {
    handle: string | null;
    isOpen: boolean;
    onClose: () => void;
    visualQaPhase?: 'fallback' | 'resolved';
    visualQaRuntimeOverride?: ReactNode;
}

const TECHNICAL_ERROR_PATTERNS = [
    /request failed with status code \d+/i,
    /^network error$/i,
    /^api error:/i,
    /timeout of \d+ms exceeded/i,
    /failed to fetch/i,
];

const resolveProfileModalErrorMessage = (error: unknown, fallback: string): string => {
    if (typeof error === 'object' && error !== null) {
        const response = 'response' in error
            ? (error as { response?: { data?: { message?: string; error?: string } | null } }).response
            : null;
        const serverMessage = typeof response?.data?.message === 'string'
            ? response.data.message.trim()
            : typeof response?.data?.error === 'string'
                ? response.data.error.trim()
                : '';

        if (serverMessage && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(serverMessage))) {
            return serverMessage;
        }
    }

    if (error instanceof Error) {
        const message = error.message.trim();
        if (message && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
            return message;
        }
    }

    return fallback;
};

export default function UserProfileModal({
    handle,
    isOpen,
    onClose,
    visualQaPhase: requestedVisualQaPhase,
    visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: UserProfileModalProps) {
    const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
    const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
    if (visualQaPhase === 'fallback') {
        return <div data-testid="user-profile-modal-fallback">사용자 프로필을 불러오는 중입니다.</div>;
    }
    if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
        return <>{visualQaRuntimeOverride}</>;
    }

    const currentUserHandle = useAuthStore((state) => state.user?.handle);
    const viewerScope = useViewerQueryScope();
    const [profile, setProfile] = useState<PublicUserProfile | null>(null);
    const [followCounts, setFollowCounts] = useState<FollowCountResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedViewerScope, setLoadedViewerScope] = useState(viewerScope);
    const profileRequestRevisionRef = useRef(0);
    const titleId = useId();

    useEffect(() => {
        const requestRevision = ++profileRequestRevisionRef.current;
        if (isOpen && handle) {
            setProfile(null);
            setFollowCounts(null);
            setError(null);
            setIsLoading(true);
            setLoadedViewerScope(viewerScope);
            void loadProfileByHandle(handle, viewerScope, requestRevision);
            void loadFollowCountsByHandle(handle, viewerScope, requestRevision);
            return () => {
                if (profileRequestRevisionRef.current === requestRevision) {
                    profileRequestRevisionRef.current += 1;
                }
            };
        }

        setProfile(null);
        setFollowCounts(null);
        setError(null);
        setIsLoading(false);
        setLoadedViewerScope(viewerScope);
    }, [handle, isOpen, viewerScope]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const isCurrentProfileRequest = (scope: typeof viewerScope, requestRevision: number) => (
        profileRequestRevisionRef.current === requestRevision
        && isViewerQueryScopeCurrent(scope)
    );

    const loadProfileByHandle = async (
        profileHandle: string,
        scope: typeof viewerScope,
        requestRevision: number,
    ) => {
        try {
            const data = await fetchPublicUserProfileByHandle(profileHandle);
            if (!isCurrentProfileRequest(scope, requestRevision)) return;
            setProfile(data);
        } catch (err: unknown) {
            if (!isCurrentProfileRequest(scope, requestRevision)) return;
            console.error('Failed to load public user profile:', err);
            setError(resolveProfileModalErrorMessage(err, '프로필을 불러오는데 실패했습니다.'));
        } finally {
            if (isCurrentProfileRequest(scope, requestRevision)) setIsLoading(false);
        }
    };

    const loadFollowCountsByHandle = async (
        profileHandle: string,
        scope: typeof viewerScope,
        requestRevision: number,
    ) => {
        try {
            const data = await getPublicFollowCounts(profileHandle);
            if (!isCurrentProfileRequest(scope, requestRevision)) return;
            setFollowCounts(data);
        } catch (err) {
            if (isCurrentProfileRequest(scope, requestRevision)) {
                console.error('Failed to load follow counts:', err);
            }
        }
    };

    const handleFollowChange = (response: FollowToggleResponse) => {
        if (!isViewerQueryScopeCurrent(viewerScope)) return;
        setFollowCounts((prev) => prev ? {
            ...prev,
            followerCount: response.followerCount,
            followingCount: response.followingCount,
            isFollowedByMe: response.following,
            notifyNewPosts: response.notifyNewPosts,
        } : null);
    };

    const currentProfileRequestRevision = profileRequestRevisionRef.current;
    const handleBlockChange = (profileHandle: string, response: BlockToggleResponse) => {
        if (!isCurrentProfileRequest(viewerScope, currentProfileRequestRevision)) return;
        setFollowCounts((prev) => prev ? {
            ...prev,
            blockedByMe: response.blocked,
            ...(response.blocked ? { isFollowedByMe: false, notifyNewPosts: false } : {}),
        } : null);
        void loadFollowCountsByHandle(profileHandle, viewerScope, currentProfileRequestRevision);
    };

    const isCurrentView = loadedViewerScope.viewerId === viewerScope.viewerId
        && loadedViewerScope.sessionEpoch === viewerScope.sessionEpoch;
    const visibleProfile = isCurrentView ? profile : null;
    const visibleFollowCounts = isCurrentView ? followCounts : null;
    const visibleError = isCurrentView ? error : null;
    const visibleIsLoading = !isCurrentView || isLoading;

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    onClick={(event) => event.stopPropagation()}
                    className="w-full rounded-xl border bg-white shadow-dialog ring-1 ring-black/5 dark:border-border dark:bg-card sm:max-w-md"
                >
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-border">
                        <h2 id={titleId} className="text-xl font-bold dark:text-white">
                            사용자 프로필
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 min-h-11 min-w-11 p-0 text-gray-400 hover:text-gray-500"
                            onClick={onClose}
                        >
                            <ProfileCloseIcon className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-6 p-4">
                        {visibleIsLoading ? (
                            <div className="flex flex-col items-center py-8">
                                <ProfileLoaderIcon className="h-8 w-8 animate-spin text-primary" />
                                <p className="mt-2 text-body text-gray-500">프로필 불러오는 중...</p>
                            </div>
                        ) : visibleError ? (
                            <div className="py-8 text-center text-red-600 dark:text-red-500">
                                <p>{visibleError}</p>
                            </div>
                        ) : visibleProfile ? (
                            <>
                                <div className="relative">
                                    <ProfileAvatar
                                        src={visibleProfile.profileImageUrl ?? undefined}
                                        alt={visibleProfile.name}
                                        fallbackName={visibleProfile.name}
                                        width={96}
                                        height={96}
                                        showRing
                                        ringClassName="bg-white/95 p-1 shadow-lg dark:bg-border"
                                    />
                                </div>

                                <div className="space-y-2 text-center">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{visibleProfile.name}</h3>
                                    {visibleProfile.favoriteTeam ? (
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-body text-gray-700 dark:bg-secondary dark:text-white">
                                            <ProfileTrophyIcon className="mr-1 h-3 w-3 text-primary" />
                                            {getTeamKoreanName(visibleProfile.favoriteTeam)}
                                        </span>
                                    ) : (
                                        <span className="text-body text-gray-500">응원팀 없음</span>
                                    )}
                                </div>

                                {visibleFollowCounts && (
                                    <div className="flex items-center justify-center gap-6 text-body">
                                        <div className="flex items-center gap-1">
                                            <ProfileUsersIcon className="h-4 w-4 text-gray-400" />
                                            <span className="font-semibold text-gray-900 dark:text-white">{visibleFollowCounts.followerCount}</span>
                                            <span className="text-gray-500">팔로워</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold text-gray-900 dark:text-white">{visibleFollowCounts.followingCount}</span>
                                            <span className="text-gray-500">팔로잉</span>
                                        </div>
                                    </div>
                                )}

                                {currentUserHandle && visibleProfile.handle && currentUserHandle !== visibleProfile.handle && (
                                    <Suspense
                                        fallback={
                                            <div className="flex items-center gap-2">
                                                <div className="h-9 w-24 rounded-md border border-gray-200 bg-gray-50 dark:border-border dark:bg-secondary/50" />
                                                <div className="h-9 w-20 rounded-md border border-gray-200 bg-gray-50 dark:border-border dark:bg-secondary/50" />
                                            </div>
                                        }
                                    >
                                        <div className="flex items-center gap-2">
                                            <FollowButton
                                                handle={visibleProfile.handle}
                                                initialFollowing={visibleFollowCounts?.isFollowedByMe ?? false}
                                                initialNotify={visibleFollowCounts?.notifyNewPosts ?? false}
                                                initialBlocked={visibleFollowCounts?.blockedByMe ?? false}
                                                initialBlocking={visibleFollowCounts?.blockingMe ?? false}
                                                onFollowChange={handleFollowChange}
                                            />
                                            <BlockButton
                                                handle={visibleProfile.handle}
                                                userName={visibleProfile.name}
                                                initialBlocked={visibleFollowCounts?.blockedByMe ?? false}
                                                onBlockChange={(response) => handleBlockChange(visibleProfile.handle, response)}
                                                size="sm"
                                            />
                                        </div>
                                    </Suspense>
                                )}

                                <div className="relative mt-4 w-full rounded-xl bg-gray-50 p-5 dark:bg-secondary/70">
                                    <ProfileQuoteIcon className="absolute left-4 top-4 h-4 w-4 text-gray-300 dark:text-white" />
                                    <div className="px-4 text-center">
                                        {visibleProfile.bio ? (
                                            <p className="whitespace-pre-wrap leading-relaxed text-gray-600 dark:text-white">
                                                {visibleProfile.bio}
                                            </p>
                                        ) : (
                                            <p className="text-body italic text-gray-400">
                                                아직 자기소개가 없습니다.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
