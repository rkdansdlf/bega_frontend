// components/cheer/CommentItem.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import type { Comment as CheerComment } from '../../api/cheerApi';
import {
  CommentCornerDownRightIcon,
  CommentHeartIcon,
  CommentSendIcon,
  CommentTrashIcon,
} from './CommentItemIcons';

interface CommentItemProps {
  comment: CheerComment & { isPending?: boolean };
  depth?: number;
  canInteract: boolean; // For replies
  canLike: boolean; // For likes
  repliesEnabled?: boolean;
  repliesComingSoon?: boolean; // Show 'Coming Soon' badge on reply button
  activeReplyId: number | null;
  replyDraft: string;
  isReplyPending: boolean;
  isCommentLikePending: boolean;
  commentLikeAnimating: Record<number, boolean>;
  onCommentLike: (commentId: number) => void;
  onReplyToggle: (commentId: number) => void;
  onReplyChange: (commentId: number, value: string) => void;
  onReplySubmit: (commentId: number) => void;
  onReplyCancel: () => void;
  onDelete?: (commentId: number) => void;
  userHandle?: string | null;
}

const normalizeHandle = (value?: string | null) => value?.trim().replace(/^@/, '').toLowerCase() || '';

function CommentItemComponent({
  comment,
  depth = 0,
  canInteract,
  canLike,
  repliesEnabled = true,
  repliesComingSoon = false,
  activeReplyId,
  replyDraft,
  isReplyPending,
  isCommentLikePending,
  commentLikeAnimating,
  onCommentLike,
  onReplyToggle,
  onReplyChange,
  onReplySubmit,
  onReplyCancel,
  onDelete,
  userHandle,
}: CommentItemProps) {
  const navigate = useNavigate();
  const isReply = depth > 0;
  const avatarSize = isReply ? 40 : 48;
  const likeCount = comment.likeCount ?? 0;
  const isReplyOpen = activeReplyId === comment.id;
  const isCommentLiked = Boolean(comment.likedByMe);
  const isCommentLikeAnimating = Boolean(commentLikeAnimating[comment.id]);
  const showReplyAction = canInteract && repliesEnabled && !repliesComingSoon;
  const canDeleteComment = Boolean(
    onDelete &&
    normalizeHandle(userHandle) &&
    normalizeHandle(comment.authorHandle) === normalizeHandle(userHandle),
  );

  return (
    <div
      className={`${depth === 0
        ? 'border-b border-gray-100 dark:border-border pb-6 last:border-b-0 last:pb-0'
        : 'pl-10 pt-4'
        }`}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          {isReply ? <CommentCornerDownRightIcon className="h-4 w-4 text-gray-300 dark:text-white" /> : null}
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              if (comment.authorHandle) navigate(`/profile/${comment.authorHandle}`);
            }}
          >
                            <ProfileAvatar
                              src={comment.authorProfileImageUrl}
                              alt={comment.author}
                              fallbackName={comment.author}
                              width={avatarSize}
                              height={avatarSize}
                              showRing
                                ringVariant="cheerFeed"
                              ringClassName="p-0 bg-transparent"
                            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 max-w-full">
              <p
                className="max-w-full break-words font-bold text-gray-900 dark:text-white cursor-pointer hover:underline [overflow-wrap:anywhere]"
                onClick={() => {
                  if (comment.authorHandle) navigate(`/profile/${comment.authorHandle}`);
                }}
              >
                {comment.author}
              </p>
              <p className="text-body font-bold text-gray-500 dark:text-white">
                {comment.isPending ? '전송 중...' : comment.timeAgo}
              </p>
            </div>
            {canDeleteComment && (
              <button
              type="button"
                onClick={() => onDelete?.(comment.id)}
                className="flex h-11 w-11 items-center justify-center text-gray-400 hover:text-red-500 transition-colors p-1 sm:h-8 sm:w-8"
                title="삭제"
              >
                <CommentTrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 max-w-full whitespace-pre-wrap break-words text-body font-bold text-gray-700 dark:text-white leading-relaxed [overflow-wrap:anywhere]">
            {comment.content}
          </p>
          <div className="mt-3 flex items-center gap-4 text-body text-gray-500 dark:text-white">
            <button
              type="button"
              onClick={() => onCommentLike(comment.id)}
              disabled={!canLike || isCommentLikePending}
              aria-label={`댓글 좋아요 ${likeCount}`}
              className={`flex min-h-11 min-w-11 items-center justify-center gap-1 transition-colors hover:text-red-500 ${isCommentLiked ? 'text-red-500' : ''
                } ${!canLike ? 'cursor-not-allowed text-gray-400 dark:text-white hover:text-gray-400 dark:hover:text-gray-600' : ''}`}
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors">
                {isCommentLikeAnimating && (
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-red-500/20 animate-like-ring" />
                )}
                <CommentHeartIcon
                  className={`h-4 w-4 ${isCommentLiked ? 'fill-red-500 text-red-500' : ''} ${isCommentLikeAnimating ? 'animate-like-pop' : ''}`}
                />
              </span>
              <span>{likeCount}</span>
            </button>
            {showReplyAction && (
              <button
              type="button"
                onClick={() => onReplyToggle(comment.id)}
                disabled={!canInteract}
                aria-label="답글 달기"
                className="flex min-h-11 items-center gap-1.5 transition-colors hover:text-gray-700 dark:hover:text-gray-300 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-600"
              >
                답글 달기
              </button>
            )}
          </div>

          {repliesEnabled && isReplyOpen && (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-card/50 p-4">
              <Textarea
                value={replyDraft}
                onChange={(e) => onReplyChange(comment.id, e.target.value)}
                placeholder="답글을 입력하세요"
                className="min-h-[80px] bg-white dark:bg-background border-gray-200 dark:border-border dark:text-white dark:placeholder:text-gray-500"
                disabled={!canInteract || isReplyPending}
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={onReplyCancel}
                  disabled={isReplyPending}
                >
                  취소
                </Button>
                <Button
                  onClick={() => onReplySubmit(comment.id)}
                  disabled={
                    !canInteract || isReplyPending || replyDraft.trim().length === 0
                  }
                  className="flex items-center gap-2 text-white bg-primary"
                >
                  <CommentSendIcon className="h-4 w-4" />
                  답글 작성
                </Button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentItemComponent
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  canInteract={canInteract}
                  canLike={canLike}
                  repliesEnabled={repliesEnabled}
                  activeReplyId={activeReplyId}
                  replyDraft={replyDraft}
                  isReplyPending={isReplyPending}
                  isCommentLikePending={isCommentLikePending}
                  commentLikeAnimating={commentLikeAnimating}
                  onCommentLike={onCommentLike}
                  onReplyToggle={onReplyToggle}
                  onReplyChange={onReplyChange}
                  onReplySubmit={onReplySubmit}
                  onReplyCancel={onReplyCancel}
                  onDelete={onDelete}
                  userHandle={userHandle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// React.memo to prevent unnecessary re-renders in comment lists
export const CommentItem = React.memo(CommentItemComponent);
