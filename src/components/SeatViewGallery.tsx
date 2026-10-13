import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type SeatViewPhoto } from '../api/diary';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { CameraIcon, XIcon } from './icons/StadiumGuideIcons';
import { Button } from './ui/plain-button';
import {
  useSeatViewPhotos,
  type SeatViewPhotosVisualQaStateOverride,
} from '../hooks/useSeatViewPhotos';

export { buildSeatViewSectionQueries, dedupeSeatViewPhotos } from '../hooks/useSeatViewPhotos';

interface SeatViewGalleryProps {
  stadium: string;
  section: string;
  sectionAliases?: string[];
  compact?: boolean;
  visualQaStateOverride?: SeatViewPhotosVisualQaStateOverride & {
    lightboxPhoto?: SeatViewPhoto | null;
  };
}

export default function SeatViewGallery({
  stadium,
  section,
  sectionAliases = [],
  compact = false,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: SeatViewGalleryProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const [lightboxPhoto, setLightboxPhoto] = useState<SeatViewPhoto | null>(
    visualQaStateOverride?.lightboxPhoto ?? null,
  );
  const { photos, isLoading } = useSeatViewPhotos(
    stadium,
    section,
    sectionAliases,
    9,
    visualQaStateOverride,
  );

  if (isLoading) {
    return (
      <div
        className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-3'}`}
        data-testid="seat-view-gallery"
      >
        {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-xl bg-gray-200 dark:bg-secondary animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-border bg-gray-50 dark:bg-secondary/50 py-6 px-4 text-center"
          data-testid="seat-view-gallery"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-border">
          <CameraIcon className="h-5 w-5 text-gray-400 dark:text-white" />
        </div>
        <div>
          <p className="text-body font-semibold text-gray-800 dark:text-white">
            아직 등록된 시야가 없어요
          </p>
          <p className="mt-0.5 text-body text-gray-500 dark:text-white">
            직관 후 다이어리에 사진을 올리면{' '}
            <span className="font-bold text-primary">+50 포인트</span>를 받아요!
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-full text-body min-h-11 sm:min-h-9">
          <Link to="/mypage" data-testid="seat-view-share-link">다이어리에서 공유하기</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-3'}`}
        data-testid="seat-view-gallery"
      >
        {photos.map((photo, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => setLightboxPhoto(photo)}
            data-testid={`seat-view-photo-${idx}`}
            className="group overflow-hidden rounded-xl bg-gray-100 dark:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img
              src={photo.photoUrl}
              alt={`${formatStadiumDisplayName(photo.stadium)} ${photo.section ?? ''} 시야 ${idx + 1}`}
              width={640}
              height={480}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          data-testid="seat-view-lightbox"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            type="button"
            data-testid="seat-view-lightbox-close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 p-2 text-white hover:bg-white/30 sm:h-9 sm:w-8"
            onClick={() => setLightboxPhoto(null)}
            aria-label="닫기"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <img
            src={lightboxPhoto.photoUrl}
            alt="시야 사진 원본"
            width={1280}
            height={960}
            loading="eager"
            decoding="async"
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {(lightboxPhoto.section || lightboxPhoto.diaryDate) && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-body text-white backdrop-blur-sm">
              {lightboxPhoto.section && <span>{lightboxPhoto.section} </span>}
              {lightboxPhoto.diaryDate && <span>· {lightboxPhoto.diaryDate}</span>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
