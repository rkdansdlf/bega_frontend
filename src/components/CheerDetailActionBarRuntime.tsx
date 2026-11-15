import { cn } from '../lib/utils';
import {
    CheerCardBookmarkIcon as BookmarkIcon,
    CheerCardHeartIcon as HeartIcon,
    CheerCardMessageSquareIcon as MessageSquareIcon,
    CheerCardPenSquareIcon as PenSquareIcon,
    CheerCardRepeatIcon as RepeatIcon,
    CheerCardRotateCcwIcon as RotateCcwIcon,
} from './icons/CheerCardIcons';
import PlainMenu from './ui/plain-menu';

interface CheerDetailActionBarRuntimeProps {
    canCancelRepost: boolean;
    canQuoteRepost: boolean;
    canSimpleRepost: boolean;
    commentCount: number;
    interactionBookmarked: boolean;
    interactionBookmarkCount: number;
    interactionLikeCount: number;
    interactionLikedByMe: boolean;
    interactionRepostedByMe: boolean;
    isLoggedIn: boolean;
    isRepostMenuOpen: boolean;
    repostButtonActive: boolean;
    repostCount: number;
    repostUnavailableMessage: string;
    onCancelRepost: () => void;
    onQuoteRepost: () => void;
    onRedirectToLogin: () => void;
    onRepostMenuOpenChange: (open: boolean) => void;
    onScrollToComments: () => void;
    onSimpleRepost: () => void;
    onToggleBookmark: () => void;
    onToggleLike: () => void;
}

export default function CheerDetailActionBarRuntime({
    canCancelRepost,
    canQuoteRepost,
    canSimpleRepost,
    commentCount,
    interactionBookmarked,
    interactionBookmarkCount,
    interactionLikeCount,
    interactionLikedByMe,
    interactionRepostedByMe,
    isLoggedIn,
    isRepostMenuOpen,
    repostButtonActive,
    repostCount,
    repostUnavailableMessage,
    onCancelRepost,
    onQuoteRepost,
    onRedirectToLogin,
    onRepostMenuOpenChange,
    onScrollToComments,
    onSimpleRepost,
    onToggleBookmark,
    onToggleLike,
}: CheerDetailActionBarRuntimeProps) {
    return (
        // 열 수는 뷰포트(px)가 아니라 이 막대가 놓인 영역의 폭(rem)으로 정한다(CheerDetailActionBar.css).
        // 칩 내용은 글자 크기(rem)에 따라 커지므로, 글자를 키우면 기준도 같이 커져 열이 자동으로 줄어든다.
        // 같은 클래스를 로딩 스켈레톤(CheerDetailArticleRuntime의 actionBarFallback)도 써서 레이아웃이 튀지 않게 한다.
        <div className="cheer-detail-chip-host mt-3 sm:mt-4">
        <div className="cheer-detail-chip-bar grid gap-1 sm:gap-1.5 lg:gap-2.5">
            <button
                type="button"
                onClick={onToggleLike}
                aria-label={`좋아요 ${interactionLikeCount.toLocaleString()}`}
                className={cn(
                    'flex min-h-11 flex-wrap w-full items-center justify-center gap-0.5 rounded-full border px-1.5 text-center whitespace-nowrap transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:gap-1',
                    interactionLikedByMe
                        ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300'
                        : 'border-[var(--cheer-line-10)] bg-[var(--cheer-card-bg)] text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-950'
                )}
            >
                <HeartIcon className={cn('h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8', interactionLikedByMe && 'fill-current')} />
                <span className="whitespace-nowrap text-body font-bold leading-none sm:text-body">
                    {interactionLikeCount.toLocaleString()}
                </span>
            </button>

            <button
                type="button"
                onClick={onScrollToComments}
                aria-label={`댓글 ${commentCount.toLocaleString()}`}
                className="flex min-h-11 flex-wrap w-full items-center justify-center gap-0.5 rounded-full border border-[var(--cheer-line-10)] bg-[var(--cheer-card-bg)] px-1.5 text-center text-slate-700 whitespace-nowrap transition-all duration-150 hover:-translate-y-px hover:border-sky-200 hover:bg-sky-50 active:scale-[0.98] dark:text-white dark:hover:border-sky-500/20 dark:hover:bg-sky-500/10 sm:gap-1"
            >
                <MessageSquareIcon className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8" />
                <span className="whitespace-nowrap text-body font-bold leading-none sm:text-body">
                    {commentCount.toLocaleString()}
                </span>
            </button>

            <PlainMenu
                open={isRepostMenuOpen}
                onOpenChange={(open) => {
                    if (open && !isLoggedIn) {
                        onRedirectToLogin();
                        return;
                    }
                    onRepostMenuOpenChange(open);
                }}
                align="start"
                panelClassName="w-52 overflow-hidden p-0 sm:w-56"
                trigger={(
                    <button
                        type="button"
                        onClick={() => {
                            if (!isRepostMenuOpen && !isLoggedIn) {
                                onRedirectToLogin();
                                return;
                            }
                            onRepostMenuOpenChange(!isRepostMenuOpen);
                        }}
                        className={cn(
                            'flex min-h-11 flex-wrap w-full items-center justify-center gap-0.5 whitespace-nowrap rounded-full border px-1.5 text-center transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:gap-1',
                            repostButtonActive
                                ? 'border-[var(--cheer-repost-on)]/30 bg-emerald-50 dark:bg-emerald-500/15'
                                : 'border-[var(--cheer-line-10)] bg-[var(--cheer-card-bg)] text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:text-white dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/10'
                        )}
                        style={repostButtonActive ? { color: 'var(--cheer-repost-on)' } : undefined}
                        aria-label={repostButtonActive ? `리포스트 취소 (현재 ${repostCount}회)` : `리포스트 (현재 ${repostCount}회)`}
                        aria-pressed={repostButtonActive}
                        aria-expanded={isRepostMenuOpen}
                        aria-haspopup="menu"
                    >
                        <RepeatIcon className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8" />
                        <span className="whitespace-nowrap text-body font-bold leading-none sm:text-body">
                            {repostCount.toLocaleString()}
                        </span>
                    </button>
                )}
            >
                <div className="flex flex-col py-1">
                    {canCancelRepost ? (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={onCancelRepost}
                            aria-label="리포스트 삭제"
                            className="flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <RotateCcwIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <div>
                                <span className="block text-body font-bold text-red-600 dark:text-red-400">
                                    리포스트 삭제
                                </span>
                                <span className="text-body font-bold text-red-500/80 dark:text-red-400/80">
                                    프로필에서 제외
                                </span>
                            </div>
                        </button>
                    ) : canSimpleRepost || canQuoteRepost ? (
                        <>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={onSimpleRepost}
                                aria-label="리포스트"
                                className="flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <div className="flex h-5 w-5 items-center justify-center">
                                    {interactionRepostedByMe ? (
                                        <RotateCcwIcon className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <RepeatIcon className="h-4 w-4 text-gray-500 dark:text-white" />
                                    )}
                                </div>
                                <div>
                                        <span className="block text-body font-bold text-gray-700 dark:text-white">
                                            {interactionRepostedByMe ? '리포스트 취소' : '리포스트'}
                                        </span>
                                </div>
                            </button>
                            {canQuoteRepost ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={onQuoteRepost}
                                    aria-label="인용하기"
                                    className="flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <div className="flex h-5 w-5 items-center justify-center">
                                        <PenSquareIcon className="h-4 w-4 text-gray-500 dark:text-white" />
                                    </div>
                                    <div>
                                        <span className="block text-body font-bold text-gray-700 dark:text-white">
                                            인용 응원
                                        </span>
                                    </div>
                                </button>
                            ) : null}
                        </>
                    ) : (
                        <div className="px-3.5 py-2.5 text-center text-body text-gray-400">
                            {repostUnavailableMessage}
                        </div>
                    )}
                </div>
            </PlainMenu>

            <button
                type="button"
                onClick={onToggleBookmark}
                aria-label={`북마크 ${interactionBookmarkCount.toLocaleString()}`}
                className={cn(
                    'flex min-h-11 flex-wrap w-full items-center justify-center gap-0.5 rounded-full border px-1.5 text-center transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:gap-1',
                    interactionBookmarked
                        ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
                        : 'border-[var(--cheer-line-10)] bg-[var(--cheer-card-bg)] text-slate-700 hover:border-amber-200 hover:bg-amber-50 dark:text-white dark:hover:border-amber-500/20 dark:hover:bg-amber-500/10'
                )}
            >
                <BookmarkIcon className={cn('h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8', interactionBookmarked && 'fill-current')} />
                <span className="whitespace-nowrap text-body font-bold leading-none sm:text-body">
                    {interactionBookmarkCount.toLocaleString()}
                </span>
            </button>
        </div>
        </div>
    );
}
