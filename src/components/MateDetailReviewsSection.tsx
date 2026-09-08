import { type ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from './ui/plain-button';
import { Card } from './ui/card';
import { MateDetailStarIcon as MateStarIcon } from './icons/MateDetailIcons';
import { getApiErrorStatus } from '../api/errorStatus';
import {
  getMatePartyApplicationsQueryOptions,
  getMatePartyReviewsQueryOptions,
} from '../hooks/mateDetailRoute';
import { hasSameMateUserIdentity } from '../utils/mate';
import type { Application, PartyReview, PartyStatus } from '../types/mate';

interface MateDetailReviewTarget {
  handle: string;
  name: string;
}

export interface MateDetailReviewsSectionVisualQaStateOverride {
  reviews: PartyReview[];
  applications: Application[];
  reviewsIsLoading: boolean;
  applicationsIsLoading: boolean;
  reviewsIsError: boolean;
  applicationsIsError: boolean;
}

interface MateDetailReviewsSectionProps {
  partyId: number;
  partyStatus: PartyStatus;
  partyHostHandle?: string;
  partyHostName: string;
  currentUserId: number | null;
  currentUserHandle?: string;
  isHost: boolean;
  sectionCardClass: string;
  insetPanelClass: string;
  onRequestReview: (target: MateDetailReviewTarget) => void;
  visualQaStateOverride?: MateDetailReviewsSectionVisualQaStateOverride;
}

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

function InlineBadge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={joinClassNames(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-body font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

export default function MateDetailReviewsSection({
  partyId,
  partyStatus,
  partyHostHandle,
  partyHostName,
  currentUserId,
  currentUserHandle,
  isHost,
  sectionCardClass,
  insetPanelClass,
  onRequestReview,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MateDetailReviewsSectionProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const reviewsQuery = useQuery({
    ...(partyId != null
      ? getMatePartyReviewsQueryOptions(partyId)
      : getMatePartyReviewsQueryOptions('unknown')),
    enabled: Boolean(
      partyId
      && currentUserId
      && partyStatus === 'COMPLETED'
      && !visualQaStateOverride,
    ),
  });
  const applicationsQuery = useQuery({
    ...(partyId != null
      ? getMatePartyApplicationsQueryOptions(partyId)
      : getMatePartyApplicationsQueryOptions('unknown')),
    enabled: Boolean(
      partyId
      && isHost
      && partyStatus === 'COMPLETED'
      && !visualQaStateOverride,
    ),
  });

  useEffect(() => {
    if (reviewsQuery.error && getApiErrorStatus(reviewsQuery.error) !== 403) {
      toast.error('리뷰 정보를 불러오는데 실패했습니다.');
    }
  }, [reviewsQuery.error]);

  if (!currentUserId || partyStatus !== 'COMPLETED') {
    return null;
  }

  const reviews = visualQaStateOverride?.reviews
    ?? (Array.isArray(reviewsQuery.data) ? reviewsQuery.data : []);
  const applications = visualQaStateOverride?.applications
    ?? (Array.isArray(applicationsQuery.data) ? applicationsQuery.data : []);
  const reviewsIsLoading = visualQaStateOverride?.reviewsIsLoading ?? reviewsQuery.isLoading;
  const applicationsIsLoading = visualQaStateOverride?.applicationsIsLoading
    ?? applicationsQuery.isLoading;
  const reviewsIsError = visualQaStateOverride?.reviewsIsError ?? reviewsQuery.isError;
  const applicationsIsError = visualQaStateOverride?.applicationsIsError
    ?? applicationsQuery.isError;
  const isLoading = reviewsIsLoading || (isHost && applicationsIsLoading);
  const isError = reviewsIsError || (isHost && applicationsIsError);
  const approvedApplications = Array.isArray(applications)
    ? applications.filter((app) => app.isApproved)
    : [];
  const targets = isHost
    ? approvedApplications
      .filter((app): app is Application & { applicantHandle: string } => Boolean(app.applicantHandle))
      .map((app) => ({
        handle: app.applicantHandle,
        name: app.applicantName,
      }))
    : (partyHostHandle
      ? [{
        handle: partyHostHandle,
        name: partyHostName,
      }]
      : []);

  const retry = () => {
    void reviewsQuery.refetch();
    if (isHost) {
      void applicationsQuery.refetch();
    }
  };

  return (
    <Card
      className={`min-w-0 p-4 ${sectionCardClass}`}
      data-testid="mate-detail-reviews-section"
      aria-busy={isLoading}
    >
      <h3 className="mb-3 flex min-w-0 items-center gap-1.5 text-body font-semibold text-gray-900 [overflow-wrap:anywhere] dark:text-white">
        <MateStarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        리뷰
      </h3>
      {isLoading ? (
        <p
          data-testid="mate-detail-reviews-loading"
          role="status"
          className="m-0 min-w-0 py-5 text-center text-body text-gray-500 [overflow-wrap:anywhere] dark:text-white/65"
        >
          리뷰 정보를 불러오는 중…
        </p>
      ) : isError ? (
        <div
          data-testid="mate-detail-reviews-error"
          role="alert"
          className="min-w-0 rounded-xl border border-red-200 bg-red-50 p-3 text-body text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200"
        >
          <p className="m-0 [overflow-wrap:anywhere]">리뷰 정보를 불러오지 못했습니다.</p>
          <Button
            data-testid="mate-detail-reviews-retry"
            type="button"
            variant="outline"
            size="touch"
            className="mt-3 min-h-11 w-full sm:w-auto"
            onClick={retry}
          >
            다시 시도
          </Button>
        </div>
      ) : (
        <div
          data-testid="mate-detail-review-targets"
          className="max-h-[60dvh] min-w-0 space-y-2 overflow-y-auto overscroll-contain"
        >
          {targets.length === 0 ? (
            <p data-testid="mate-detail-reviews-empty" className="m-0 min-w-0 text-body text-gray-400 [overflow-wrap:anywhere]">
              리뷰 대상이 없습니다.
            </p>
        ) : targets.map((target, targetIndex) => {
          const myReview = reviews.find(
            (review) => hasSameMateUserIdentity(
              { handle: review.reviewerHandle },
              { handle: currentUserHandle },
            ) && hasSameMateUserIdentity(
              { handle: review.revieweeHandle },
              target,
            ),
          );

          return (
            <div
              key={target.handle}
              data-testid={`mate-detail-review-target-${targetIndex}`}
              className={`flex min-w-0 flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:justify-between ${insetPanelClass}`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 flex-1 text-body font-semibold text-gray-900 [overflow-wrap:anywhere] dark:text-white">
                    {target.name}
                  </span>
                  {myReview && (
                    <InlineBadge className="max-w-full shrink-0 whitespace-normal text-gray-500 [overflow-wrap:anywhere] dark:border-border dark:text-white">
                      작성 완료
                    </InlineBadge>
                  )}
                </div>
                {myReview && (
                  <div className="mt-1 flex min-w-0 flex-col items-start gap-1.5">
                    <span className="inline-flex shrink-0 items-center gap-1" aria-label={`별점 ${myReview.rating}점`}>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <MateStarIcon
                          key={num}
                          className={`w-3.5 h-3.5 ${num <= myReview.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                            }`}
                        />
                      ))}
                    </span>
                    {myReview.comment && (
                      <span
                        data-testid="mate-detail-review-comment"
                        className="w-full min-w-0 text-body leading-relaxed text-gray-500 [overflow-wrap:anywhere] dark:text-white/60"
                      >
                        "{myReview.comment}"
                      </span>
                    )}
                  </div>
                )}
              </div>
              {!myReview ? (
                <Button
                  data-testid={`mate-detail-review-write-${targetIndex}`}
                  variant="outline"
                  size="touch"
                  className="min-h-11 w-full shrink-0 whitespace-normal border-primary text-body text-primary [overflow-wrap:anywhere] hover:bg-primary/10 sm:w-auto"
                  onClick={() => onRequestReview(target)}
                >
                  리뷰 작성
                </Button>
              ) : null}
            </div>
          );
          })}
        </div>
      )}
    </Card>
  );
}
