import { useState } from 'react';
import { CheerPost, EmbeddedPost as EmbeddedPostType } from '../api/cheerApi';
import { useCheerMutations } from '../hooks/useCheerQueries';
import { useAuthProfileSnapshot } from '../store/authStore';
import EmbeddedPost from './EmbeddedPost';
import {
    CheerModalLoaderIcon as LoaderIcon,
    CheerModalXIcon as XIcon,
} from './icons/CheerModalIcons';
import { toast } from 'sonner';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { ProfileAvatar } from './ui/ProfileAvatar';
import PlainDialog from './ui/plain-dialog';

export type QuoteRepostEditorVisualQaStateOverride = {
    content?: string;
    isSubmitting?: boolean;
    onConfirmClose?: () => boolean | Promise<boolean>;
    onSubmit?: () => void | Promise<void>;
};

interface QuoteRepostEditorProps {
    isOpen: boolean;
    onClose: () => void;
    post: CheerPost;
    visualQaStateOverride?: QuoteRepostEditorVisualQaStateOverride;
}

export default function QuoteRepostEditor({
    isOpen,
    onClose,
    post,
    visualQaStateOverride: requestedVisualQaStateOverride,
}: QuoteRepostEditorProps) {
    const visualQaStateOverride = import.meta.env?.PROD === true
        ? undefined
        : requestedVisualQaStateOverride;
    const [content, setContent] = useState(visualQaStateOverride?.content ?? '');
    const [isLocallySubmitting, setIsLocallySubmitting] = useState(false);
    const { confirm } = useConfirmDialog();
    const { quoteRepostMutation } = useCheerMutations();
    const {
        userName: authUserName,
        userHandle: authUserHandle,
        userProfileImageUrl,
    } = useAuthProfileSnapshot();
    const userName = authUserName || '프로필';
    const userHandle = authUserHandle || 'user';
    const resolveProfileImage = (imageUrl?: string | null) => {
        if (!imageUrl) return undefined;
        if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return undefined;
        return imageUrl;
    };

    const MAX_LENGTH = 500;
    const remainingChars = MAX_LENGTH - content.length;
    const isOverLimit = remainingChars < 0;
    const isSubmitting = quoteRepostMutation.isPending
        || isLocallySubmitting
        || visualQaStateOverride?.isSubmitting === true;
    const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;

    // 원본 게시글을 EmbeddedPost 형식으로 변환
    const embeddedOriginal: EmbeddedPostType = {
        id: post.id,
        teamId: post.teamId,
        teamColor: post.teamColor,
        postType: post.postType,
        content: post.content,
        author: post.author,
        authorHandle: post.authorHandle,
        authorProfileImageUrl: post.authorProfileImageUrl,
        createdAt: post.createdAt,
        imageUrls: post.imageUrls || [],
        deleted: false,
        linkedContent: post.linkedContent,
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        if (visualQaStateOverride?.onSubmit) {
            setIsLocallySubmitting(true);
            try {
                await visualQaStateOverride.onSubmit();
                setContent('');
                onClose();
            } finally {
                setIsLocallySubmitting(false);
            }
            return;
        }

        quoteRepostMutation.mutate(
            { postId: post.id, content: content.trim() },
            {
                onSuccess: () => {
                    toast.success('인용 리포스트가 게시되었습니다.');
                    setContent('');
                    onClose();
                },
            }
        );
    };

    const handleClose = async () => {
        if (content.trim() && !isSubmitting) {
            const confirmed = visualQaStateOverride?.onConfirmClose
                ? await visualQaStateOverride.onConfirmClose()
                : await confirm({ title: '작성 취소', description: '작성 중인 내용이 있습니다. 정말 닫으시겠습니까?', confirmLabel: '닫기' });
            if (!confirmed) return;
        }
        setContent('');
        onClose();
    };

    return (
        <PlainDialog
            open={isOpen}
            onClose={handleClose}
            hideCloseButton
            className="max-w-[500px] max-h-[90vh] overflow-hidden"
            bodyClassName="p-0"
            contentTestId="quote-repost-editor"
        >
            <div className="flex max-h-[90vh] flex-col">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-border flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => void handleClose()}
                            data-testid="quote-repost-cancel"
                            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:h-8 sm:w-8"
                            disabled={isSubmitting}
                        >
                            <XIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            인용 리포스트
                        </h2>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            data-testid="quote-repost-submit"
                            disabled={!canSubmit}
                            className={`inline-flex h-auto min-h-11 items-center justify-center rounded-full px-4 py-1.5 text-body font-semibold transition-colors sm:min-h-9 ${
                                canSubmit
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-gray-200 dark:bg-secondary text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isSubmitting ? (
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                '게시'
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 flex-shrink-0">
                            <ProfileAvatar
                                src={resolveProfileImage(userProfileImageUrl) || undefined}
                                alt={userName}
                                fallbackName={userName}
                                width={40}
                                height={40}
                                showRing
                                ringVariant="cheerFeed"
                            />
                        </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-body mb-2">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                    {userName}
                                    </span>
                                <span className="text-gray-500 dark:text-white">
                                    @{userHandle}
                                </span>
                            </div>

                            <textarea
                                data-testid="quote-repost-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="내 의견을 추가하세요..."
                                className="w-full min-h-[100px] resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 focus:outline-none text-base leading-relaxed"
                                disabled={isSubmitting}
                                autoFocus
                            />

                            <EmbeddedPost post={embeddedOriginal} />
                        </div>
                    </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-100 dark:border-border flex-shrink-0">
                    <div className="flex justify-end">
                        <span
                            data-testid="quote-repost-remaining"
                            className={`text-body ${
                                isOverLimit
                                    ? 'text-red-600 dark:text-red-500'
                                    : remainingChars <= 50
                                    ? 'text-yellow-500'
                                    : 'text-gray-400'
                            }`}
                        >
                            {remainingChars}
                        </span>
                    </div>
                </div>
            </div>
        </PlainDialog>
    );
}
