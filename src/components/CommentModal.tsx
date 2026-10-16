import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from './ui/button';
import AutosizeTextarea from './ui/autosize-textarea';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { CheerPost, createComment } from '../api/cheerApi';
import TeamLogo from './TeamLogo';
import { CheerModalSmileIcon as SmileIcon } from './icons/CheerModalIcons';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { TEAM_DATA } from '../constants/teams';
import { useTheme } from '../hooks/useTheme';
import { useRef, useEffect } from 'react';
import LazyEmojiPicker from './LazyEmojiPicker';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { getDuplicateCommentErrorMessage } from '../utils/errorUtils';
import PlainDialog from './ui/plain-dialog';

export interface CommentModalVisualQaStateOverride {
    content?: string;
    isSubmitting?: boolean;
    showEmojiPicker?: boolean;
    onSubmit?: () => void;
}

export interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: CheerPost;
    targetPostId?: number;
    visualQaStateOverride?: CommentModalVisualQaStateOverride;
}

export default function CommentModal({
    isOpen,
    onClose,
    post,
    targetPostId,
    visualQaStateOverride: requestedVisualQaStateOverride,
}: CommentModalProps) {
    const visualQaStateOverride = import.meta.env?.PROD === true
        ? undefined
        : requestedVisualQaStateOverride;
    const {
        userName,
        userProfileImageUrl,
        userFavoriteTeam,
    } = useAuthProfileSnapshot();
    const { isLoggedIn } = useAuthSession();
    const navigate = useNavigate();
    const { theme, resolvedTheme } = useTheme();
    const isDarkMode = resolvedTheme === 'dark' || theme === 'dark';
    const queryClient = useQueryClient();
    const [content, setContent] = useState(visualQaStateOverride?.content ?? '');
    const [showEmojiPicker, setShowEmojiPicker] = useState(visualQaStateOverride?.showEmojiPicker ?? false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const resolvedPostId = targetPostId ?? post.id;
    const postProfileImageUrl = post.authorProfileImageUrl
        ? post.authorProfileImageUrl.includes('/assets/') || post.authorProfileImageUrl.includes('/src/assets/')
            ? null
            : post.authorProfileImageUrl
        : null;
    const resolvedUserProfileImageUrl = userProfileImageUrl &&
        !(userProfileImageUrl.includes('/assets/') || userProfileImageUrl.includes('/src/assets/'))
        ? userProfileImageUrl
        : null;

    const commentMutation = useMutation({
        mutationFn: () => createComment(resolvedPostId, content.trim()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
            queryClient.invalidateQueries({ queryKey: ['cheer-comments', resolvedPostId] });
            setContent('');
            onClose();
        },
        onError: (error) => {
            toast.error(getDuplicateCommentErrorMessage(error, '댓글 작성에 실패했습니다.'));
        },
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    const handleEmojiSelect = (emoji: string) => {
        setContent(prev => prev + emoji);
    };

    const handleSubmit = () => {
        if (!isLoggedIn) {
            navigate(buildLoginPath(getCurrentRelativeUrl()));
            return;
        }
        if (!content.trim() || (visualQaStateOverride?.isSubmitting ?? commentMutation.isPending)) return;
        if (visualQaStateOverride) {
            visualQaStateOverride.onSubmit?.();
            return;
        }
        commentMutation.mutate();
    };

    const teamLabel = post.team;

    return (
        <PlainDialog
            open={isOpen}
            onClose={onClose}
            title="댓글 남기기"
            contentTestId="comment-modal"
            className="max-w-[600px] overflow-hidden border-none bg-white dark:bg-card"
            bodyClassName="p-4"
        >
            <div className="flex gap-3 mb-6 relative">
                <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-100 dark:bg-secondary" />
                {postProfileImageUrl ? (
                        <ProfileAvatar
                            src={postProfileImageUrl}
                            alt={post.author || '프로필'}
                            fallbackName={post.author || '프로필'}
                            width={40}
                            height={40}
                            showRing
                        ringVariant="cheerFeed"
                        />
                ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/90 p-0.5 dark:bg-slate-700/80">
                        <span className="h-full w-full rounded-full bg-slate-100 dark:bg-secondary flex items-center justify-center overflow-hidden">
                            <TeamLogo team={teamLabel} size={40} />
                        </span>
                    </span>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-bold text-body dark:text-white">{post.author}</span>
                        <span className="text-body text-[#536471] dark:text-white">@{post.authorHandle || post.author}</span>
                        <span className="text-[#536471]">·</span>
                        <span className="text-body text-[#536471] dark:text-white">{post.timeAgo}</span>
                    </div>
                    <p className="text-body text-[#0f1419] dark:text-white line-clamp-3 mb-2">{post.content}</p>
                    <div className="text-body text-[#536471]">
                        <span className="text-indigo-500 font-semibold">@{post.authorHandle || post.author}</span> 님에게 댓글 남기는 중
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mt-4">
                <div className="h-10 w-10 flex-shrink-0">
                    {resolvedUserProfileImageUrl ? (
                        <ProfileAvatar
                            src={resolvedUserProfileImageUrl}
                            alt={userName || '사용자'}
                            fallbackName={userName}
                            width={40}
                            height={40}
                            showRing
                            ringVariant="cheerFeed"
                        />
                    ) : (
                        userFavoriteTeam && userFavoriteTeam !== '없음' ? (
                            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-200/90 p-0.5 dark:bg-slate-700/80">
                                <span className="h-full w-full rounded-full bg-slate-100 dark:bg-secondary flex items-center justify-center overflow-hidden">
                                    <TeamLogo team={TEAM_DATA[userFavoriteTeam]?.name || userFavoriteTeam} size={40} />
                                </span>
                            </span>
                        ) : (
                            <ProfileAvatar
                                alt={userName || '사용자'}
                                fallbackName={userName}
                                width={40}
                                height={40}
                                showRing
                                ringVariant="cheerFeed"
                            />
                        )
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <AutosizeTextarea
                        autoFocus
                        data-testid="comment-modal-content"
                        placeholder="내 댓글을 게시하세요"
                        className="w-full resize-none border-none bg-transparent text-19 leading-relaxed text-[#0f1419] dark:text-white placeholder:text-[#536471] dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 min-h-[120px]"
                        minRows={3}
                        maxRows={10}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />

                    <div className="mt-4 flex items-center justify-between border-t border-[#EFF3F4] dark:border-border pt-3">
                        <div className="flex items-center gap-1">
                            <div className="relative" ref={emojiPickerRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    data-testid="comment-modal-emoji"
                                    aria-label="이모지 선택"
                                    aria-expanded={showEmojiPicker}
                                    className="flex h-11 w-11 items-center justify-center rounded-full text-indigo-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-input/50"
                                >
                                    <SmileIcon className="w-5 h-5" />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute top-full left-0 z-50 mt-2">
                                        <LazyEmojiPicker
                                            isDarkMode={isDarkMode}
                                            onEmojiSelect={handleEmojiSelect}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            data-testid="comment-modal-submit"
                            disabled={!content.trim() || (visualQaStateOverride?.isSubmitting ?? commentMutation.isPending)}
                            className="rounded-full px-6 font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-md transition-all"
                        >
                            {(visualQaStateOverride?.isSubmitting ?? commentMutation.isPending) ? '댓글 중...' : '댓글'}
                        </Button>
                    </div>
                </div>
            </div>
        </PlainDialog>
    );
}
