import { type UIEvent } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getBlockedUsers, type BlockToggleResponse } from '../../api/blockApi';
import type { PageResponse, UserFollowSummary } from '../../api/followShared';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import BlockButton from '../profile/BlockButton';
import {
  MyPageBanIcon,
  MyPageLoaderIcon,
} from './MyPageFlowIcons';
import MyPageSeasonEmptyState from './MyPageSeasonEmptyState';
import { PRIVATE_QUERY_KEYS } from '../../utils/privateQueryKeys';
import { useViewerQueryScope } from '../../hooks/useViewerQueryScope';

export interface BlockedUsersSectionVisualQaStateOverride {
    users?: UserFollowSummary[];
    isLoading?: boolean;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    blockToggleResponse?: BlockToggleResponse;
    onNextPage?: () => void;
    onBlockChange?: (response: BlockToggleResponse) => void;
}

export interface BlockedUsersSectionProps {
    visualQaStateOverride?: BlockedUsersSectionVisualQaStateOverride;
}

export default function BlockedUsersSection({
    visualQaStateOverride: requestedVisualQaStateOverride,
}: BlockedUsersSectionProps = {}) {
    const viewerScope = useViewerQueryScope();
    const visualQaStateOverride = import.meta.env.PROD === true
        ? undefined
        : requestedVisualQaStateOverride;
    const queryClient = useQueryClient();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery<PageResponse<UserFollowSummary>>({
        queryKey: PRIVATE_QUERY_KEYS.blockedUsers(viewerScope),
        queryFn: ({ pageParam = 0 }) => {
            const page = typeof pageParam === 'number' ? pageParam : Number(pageParam);
            return getBlockedUsers(Number.isFinite(page) ? page : 0);
        },
        getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
        initialPageParam: 0,
        enabled: visualQaStateOverride === undefined,
    });

    const users = visualQaStateOverride?.users ?? data?.pages.flatMap((page) => page.content) ?? [];
    const effectiveHasNextPage = visualQaStateOverride?.hasNextPage ?? hasNextPage;
    const effectiveIsFetchingNextPage = visualQaStateOverride?.isFetchingNextPage ?? isFetchingNextPage;
    const effectiveIsLoading = visualQaStateOverride?.isLoading ?? isLoading;

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && effectiveHasNextPage && !effectiveIsFetchingNextPage) {
            if (visualQaStateOverride?.onNextPage) {
                visualQaStateOverride.onNextPage();
            } else {
                void fetchNextPage({ cancelRefetch: false });
            }
        }
    };

    const handleBlockChange = (response: BlockToggleResponse) => {
        visualQaStateOverride?.onBlockChange?.(response);
        if (visualQaStateOverride === undefined) {
            void queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
        }
    };

    return (
        <div
            className="bg-card rounded-2xl shadow-lg border-2 border-border p-4 sm:p-6 md:p-8 mb-6"
            data-screen-label="차단 관리"
            data-testid="mypage-blocked-users-section"
        >
            <div className="flex items-center gap-3 mb-6">
                <MyPageBanIcon className="w-6 h-6 text-destructive" />
                <h2 className="text-xl font-bold text-destructive">차단 관리</h2>
            </div>

            <div className="mb-4">
                <p className="text-body text-muted-foreground">
                    차단한 사용자는 내 게시글을 볼 수 없으며, 나에게 메시지를 보낼 수 없습니다.
                </p>
                <p className="text-body text-muted-foreground mt-2">
                    상대방 프로필에서 <span className="font-semibold text-primary">차단</span> 버튼으로 원하는 사용자를 차단할 수 있습니다.
                </p>
            </div>

            <div
                className="max-h-[400px] overflow-y-auto custom-scrollbar border border-border rounded-lg"
                onScroll={handleScroll}
            >
                {effectiveIsLoading ? (
                    <div className="flex justify-center p-8">
                        <MyPageLoaderIcon className="h-8 w-8 animate-spin text-destructive" />
                    </div>
                ) : users.length > 0 ? (
                    <div className="divide-y divide-border">
                        {users.map((user) => (
                            <div key={user.handle} className="flex items-center justify-between p-4 hover:bg-muted/60 transition-colors">
                                <div
                                    className="flex items-center gap-3 flex-1 min-w-0 mr-4"
                                >
                                    <ProfileAvatar
                                        src={user.profileImageUrl ?? undefined}
                                        alt={user.name}
                                        fallbackName={user.name}
                                        width={40}
                                        height={40}
                                        showRing
                                        ringClassName="p-0.5 bg-muted"
                                    />
                                    <div className="flex flex-col truncate">
                                        <span className="text-body font-bold text-foreground truncate">
                                            {user.name}
                                        </span>
                                        <span className="text-body text-muted-foreground truncate">
                                            {user.handle}
                                        </span>
                                    </div>
                                </div>

                                <BlockButton
                                    handle={user.handle}
                                    userName={user.name}
                                    initialBlocked={true}
                                    size="sm"
                                    variant="destructive"
                                    onBlockChange={handleBlockChange}
                                    visualQaToggleBlock={visualQaStateOverride?.blockToggleResponse
                                        ? async () => visualQaStateOverride.blockToggleResponse as BlockToggleResponse
                                        : undefined}
                                />
                            </div>
                        ))}

                        {effectiveIsFetchingNextPage && (
                            <div className="flex justify-center p-4">
                                <MyPageLoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                ) : (
                    <MyPageSeasonEmptyState
                        className="mypage-season-empty--flush"
                        tone="danger"
                        icon={<MyPageBanIcon />}
                        title="차단한 사용자가 없습니다."
                        description="차단한 사용자가 여기에 표시됩니다."
                    />
                )}
            </div>
        </div>
    );
}
