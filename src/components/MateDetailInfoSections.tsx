import { lazy, Suspense, useState } from 'react';

import ViewportDeferred from './ViewportDeferred';
import {
  MateDetailHostBlock,
  MateDetailIntroBlock,
  MateDetailReviewBlock,
  MateDetailSeatViewBlock,
} from './MateDetailReferenceBlocks';
import type { MateHostReviewsModalVisualQaStateOverride } from './MateHostReviewsModal';
import type { MateDetailReviewsSectionVisualQaStateOverride } from './MateDetailReviewsSection';
import type { Party } from '../types/mate';

const LazyMateDetailReviewsSection = lazy(() => import('./MateDetailReviewsSection'));
const LazyMateHostReviewsModal = lazy(() => import('./MateHostReviewsModal'));

export type MateDetailInfoSectionsVisualQaStateOverride = {
  hostReviews?: MateHostReviewsModalVisualQaStateOverride;
  reviews?: MateDetailReviewsSectionVisualQaStateOverride;
  reviewsPhase?: 'fallback' | 'runtime';
  seatPhotoCount?: number;
};

interface MateDetailInfoSectionsProps {
  party: Party;
  routePartyId?: string;
  isHost: boolean;
  isApproved: boolean;
  summaryPolicyText: string;
  currentUserId: number | null;
  currentUserHandle?: string;
  onOpenHostProfile: () => void;
  onOpenSeatViewGuide: () => void;
  onOpenChat: () => void;
  onRequestReview: (target: { handle: string; name: string }) => void;
  visualQaStateOverride?: MateDetailInfoSectionsVisualQaStateOverride;
}

export default function MateDetailInfoSections({
  party,
  isHost,
  isApproved,
  summaryPolicyText,
  currentUserId,
  currentUserHandle,
  onOpenHostProfile,
  onOpenSeatViewGuide,
  onOpenChat,
  onRequestReview,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MateDetailInfoSectionsProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const [showHostReviews, setShowHostReviews] = useState(false);
  const reviewsContent = (
    <Suspense fallback={null}>
      <LazyMateDetailReviewsSection
        partyId={party.id}
        partyStatus={party.status}
        partyHostHandle={party.hostHandle}
        partyHostName={party.hostName}
        currentUserId={currentUserId}
        currentUserHandle={currentUserHandle}
        isHost={isHost}
        sectionCardClass="border border-gray-200/90 bg-white dark:border-white/15 dark:bg-[#000000]"
        insetPanelClass="rounded-13 border border-gray-200/80 bg-gray-50 dark:border-border dark:bg-secondary/70"
        onRequestReview={onRequestReview}
        visualQaStateOverride={visualQaStateOverride?.reviews}
      />
    </Suspense>
  );

  return (
    <>
      <MateDetailSeatViewBlock
        party={party}
        onOpenSeatViewGuide={onOpenSeatViewGuide}
        visualQaPhotoCountOverride={visualQaStateOverride?.seatPhotoCount}
      />
      <MateDetailHostBlock party={party} onOpenHostProfile={onOpenHostProfile} onOpenChat={onOpenChat} />
      <MateDetailIntroBlock party={party} summaryPolicyText={summaryPolicyText} />
      <MateDetailReviewBlock
        party={party}
        onOpenHostReviews={party.hostHandle ? () => setShowHostReviews(true) : undefined}
      />

      {showHostReviews && party.hostHandle ? (
        <Suspense fallback={null}>
          <LazyMateHostReviewsModal
            hostHandle={party.hostHandle}
            hostName={party.hostName}
            onClose={() => setShowHostReviews(false)}
            visualQaStateOverride={visualQaStateOverride?.hostReviews}
          />
        </Suspense>
      ) : null}

      {party.status === 'COMPLETED' && currentUserId && (isHost || isApproved) && (
        visualQaStateOverride?.reviewsPhase === 'runtime'
          ? reviewsContent
          : (
            <ViewportDeferred
              rootMargin="0px 0px 240px 0px"
              fallback={<div className="min-h-[112px] rounded-xl border border-dashed border-gray-200 bg-gray-50/80 dark:border-border/70 dark:bg-secondary/60" />}
            >
              {reviewsContent}
            </ViewportDeferred>
          )
      )}
    </>
  );
}
