import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

function SeatViewImage({ src, alt, lightbox = false, onFailure }: { src: string; alt: string; lightbox?: boolean; onFailure?: () => void }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label="시야 사진을 불러오지 못했습니다."
        data-testid="seat-view-image-fallback"
        className={lightbox
          ? 'flex max-w-full shrink-0 flex-col items-center justify-center gap-3 rounded-xl bg-gray-100 p-6 text-center text-body text-gray-600 dark:bg-secondary dark:text-white'
          : 'flex aspect-[4/3] h-full w-full items-center justify-center bg-gray-100 text-gray-500 dark:bg-secondary dark:text-white'}
        onClick={lightbox ? (event) => event.stopPropagation() : undefined}
      >
        <CameraIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
        {lightbox && <span className="break-keep">사진을 불러오지 못했어요</span>}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={lightbox ? 1280 : 640}
      height={lightbox ? 960 : 480}
      loading={lightbox ? 'eager' : 'lazy'}
      decoding="async"
      className={lightbox
        ? 'max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl'
        : 'aspect-[4/3] h-full w-full object-cover transition-transform duration-200 group-hover:scale-105'}
      onClick={lightbox ? (event) => event.stopPropagation() : undefined}
      onError={() => { setFailed(true); onFailure?.(); }}
    />
  );
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
  const [lightboxFailed, setLightboxFailed] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxOpenerRef = useRef<HTMLElement | null>(null);
  const { photos, isLoading, isError } = useSeatViewPhotos(
    stadium,
    section,
    sectionAliases,
    9,
    visualQaStateOverride,
  );
  const lightboxVisible = Boolean(lightboxPhoto && !isLoading && (photos.length > 0 || isError));
  useEffect(() => {
    if (!lightboxVisible) return;
    const opener = lightboxOpenerRef.current ?? (document.activeElement as HTMLElement | null);
    const parentDialog = opener?.closest<HTMLElement>('[role="dialog"]');
    lightboxCloseRef.current?.focus({ preventScroll: true });
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      else if (parentDialog?.isConnected) parentDialog.focus({ preventScroll: true });
      lightboxOpenerRef.current = null;
    };
  }, [lightboxVisible]);
  useEffect(() => {
    if (lightboxPhoto && !lightboxVisible) setLightboxPhoto(null);
  }, [lightboxPhoto, lightboxVisible]);

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

  if (photos.length === 0 && !isError) {
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
        {isError && (
          <div
            role="alert"
            data-testid="seat-view-query-error"
            className="col-span-full min-w-0 rounded-xl border border-gray-300 bg-gray-50 px-2 py-6 text-center text-body text-gray-800 dark:border-border dark:bg-secondary/50 dark:text-white break-keep [overflow-wrap:anywhere] sm:px-4"
          >
            <p className="font-semibold">사진 조회 실패</p>
            <p className="mt-1">잠시 후 다시 확인해 주세요.</p>
          </div>
        )}
        {photos.map((photo, idx) => (
          <button
            type="button"
            key={photo.photoUrl || `${photo.stadium}:${photo.section ?? ''}:${photo.block ?? ''}:${photo.diaryDate}`}
            onClick={(event) => { lightboxOpenerRef.current = event.currentTarget; setLightboxFailed(false); setLightboxPhoto(photo); }}
            data-testid={`seat-view-photo-${idx}`}
            aria-label={`${formatStadiumDisplayName(photo.stadium)} ${photo.section ?? ''} 시야 ${idx + 1} 확대 보기`}
            className="group aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 dark:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <SeatViewImage
              key={photo.photoUrl}
              src={photo.photoUrl}
              alt={`${formatStadiumDisplayName(photo.stadium)} ${photo.section ?? ''} 시야 ${idx + 1}`}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && typeof document !== 'undefined' && createPortal(
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label="시야 사진 확대 보기"
          tabIndex={lightboxFailed ? 0 : -1}
          className={lightboxFailed
            ? 'fixed inset-0 flex flex-col items-center gap-4 overflow-y-auto bg-black/80 px-4 pb-6 pt-20'
            : 'fixed inset-0 flex items-center justify-center bg-black/80 p-4'}
          style={{ zIndex: 80 }}
          data-testid="seat-view-lightbox"
          onClick={() => setLightboxPhoto(null)}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            event.preventDefault();
            event.stopPropagation();
            if (lightboxFailed && document.activeElement === lightboxCloseRef.current) {
              lightboxRef.current?.focus({ preventScroll: true });
            } else {
              lightboxCloseRef.current?.focus({ preventScroll: true });
            }
          }}
        >
          <button
            ref={lightboxCloseRef}
            type="button"
            data-testid="seat-view-lightbox-close"
            className={`${lightboxFailed ? 'fixed z-10' : 'absolute'} right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 p-2 text-white hover:bg-white/30`}
            onClick={() => setLightboxPhoto(null)}
            aria-label="닫기"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <SeatViewImage
            key={lightboxPhoto.photoUrl}
            src={lightboxPhoto.photoUrl}
            alt="시야 사진 원본"
            lightbox
            onFailure={() => setLightboxFailed(true)}
          />
          {(lightboxPhoto.section || lightboxPhoto.diaryDate) && (
            <div data-testid="seat-view-lightbox-caption" className={`${lightboxFailed ? 'shrink-0' : 'absolute bottom-6 left-1/2 -translate-x-1/2'} rounded-full bg-black/60 px-4 py-1.5 text-body text-white backdrop-blur-sm`}>
              {lightboxPhoto.section && <span>{lightboxPhoto.section} </span>}
              {lightboxPhoto.diaryDate && <span>· {lightboxPhoto.diaryDate}</span>}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
