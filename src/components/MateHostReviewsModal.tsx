import { useQuery } from '@tanstack/react-query';

import { fetchHostReviews } from '../api/mate';
import { Button } from './ui/plain-button';
import PlainDialog from './ui/plain-dialog';
import { MateDetailStarIcon as MateStarIcon } from './icons/MateDetailIcons';
import type { PartyReview } from '../types/mate';

export type MateHostReviewsModalVisualQaStateOverride = {
  isError: boolean;
  isLoading: boolean;
  reviews: PartyReview[];
};

interface MateHostReviewsModalProps {
  hostHandle: string;
  hostName?: string;
  onClose: () => void;
  visualQaStateOverride?: MateHostReviewsModalVisualQaStateOverride;
}

const formatReviewDate = (createdAt?: string | null) => {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function MateHostReviewsModal({
  hostHandle,
  hostName,
  onClose,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MateHostReviewsModalProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const reviewsQuery = useQuery({
    queryKey: ['host-reviews', hostHandle],
    queryFn: () => fetchHostReviews(hostHandle),
    staleTime: 60_000,
    enabled: Boolean(hostHandle) && !visualQaStateOverride,
  });
  const reviews = visualQaStateOverride?.reviews
    ?? (Array.isArray(reviewsQuery.data) ? reviewsQuery.data : []);
  const isLoading = visualQaStateOverride?.isLoading ?? reviewsQuery.isLoading;
  const isError = visualQaStateOverride?.isError ?? reviewsQuery.isError;

  return (
    <PlainDialog
      open
      onClose={onClose}
      title={`${hostName ? `${hostName} 호스트 ` : '호스트 '}후기`}
      contentTestId="mate-host-reviews-dialog"
      className="max-w-[calc(100vw-2rem)] sm:max-w-lg"
      bodyClassName="[overflow-wrap:anywhere]"
      footer={(
        <Button
          data-testid="mate-host-reviews-close"
          variant="outline"
          size="touch"
          className="min-h-11 w-full sm:w-auto"
          onClick={onClose}
        >
          닫기
        </Button>
      )}
    >
      <div
        className="max-h-[60dvh] space-y-2.5 overflow-y-auto overscroll-contain py-1"
        data-testid="mate-host-reviews"
        data-review-count={reviews.length}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <p data-testid="mate-host-reviews-loading" role="status" className="py-6 text-center text-13 text-gray-500 dark:text-white/60">
            후기를 불러오는 중…
          </p>
        ) : isError ? (
          <p data-testid="mate-host-reviews-error" role="alert" className="py-6 text-center text-13 text-gray-500 dark:text-white/60">
            후기를 불러오지 못했습니다.
          </p>
        ) : reviews.length === 0 ? (
          <p data-testid="mate-host-reviews-empty" role="status" className="py-6 text-center text-13 text-gray-500 dark:text-white/60">
            아직 등록된 후기가 없어요.
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              data-testid={`mate-host-review-${review.id}`}
              className="min-w-0 rounded-13 border border-gray-200/80 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
            >
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 max-w-full text-caption font-bold text-gray-900 [overflow-wrap:anywhere] dark:text-white">
                  {review.reviewerHandle ? `@${review.reviewerHandle}` : '익명 메이트'}
                </span>
                <span
                  className="inline-flex shrink-0 items-center gap-0.5 text-yellow-500"
                  aria-label={`별점 ${Math.max(1, Math.min(5, review.rating || 0))}점`}
                >
                  {Array.from({ length: Math.max(1, Math.min(5, review.rating || 0)) }).map((_, starIndex) => (
                    <MateStarIcon key={starIndex} className="h-3 w-3 fill-yellow-500" />
                  ))}
                </span>
                <span className="w-full text-12 text-gray-400 dark:text-white/55 sm:ml-auto sm:w-auto">
                  {formatReviewDate(review.createdAt)}
                </span>
              </div>
              {review.comment ? (
                <p className="m-0 text-caption leading-[1.6] text-gray-600 [overflow-wrap:anywhere] dark:text-white/70">
                  {review.comment}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </PlainDialog>
  );
}
