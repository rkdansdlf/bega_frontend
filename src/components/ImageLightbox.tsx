import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  ImageGridChevronLeftIcon,
  ImageGridChevronRightIcon,
  ImageGridCloseIcon,
  ImageGridImageOffIcon,
} from './icons/ImageGridIcons';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const currentImage = images[currentIndex];

  useFocusTrap(dialogRef, { active: true });

  useEffect(() => {
    setImageFailed(false);
  }, [currentImage, currentIndex]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 보기"
      tabIndex={-1}
      data-testid="image-lightbox"
      data-skip-cheer-card-nav
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        data-testid="image-lightbox-close"
        data-skip-cheer-card-nav
        className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full p-0 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="이미지 보기 닫기"
      >
        <ImageGridCloseIcon className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          data-testid="image-lightbox-prev"
          data-skip-cheer-card-nav
          className="absolute left-2 z-10 flex size-11 items-center justify-center rounded-full p-0 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none"
          onClick={(event) => {
            event.stopPropagation();
            onPrev();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="이전 이미지"
        >
          <ImageGridChevronLeftIcon className="h-6 w-6" />
        </button>
      )}

      <div
        data-testid="image-lightbox-content"
        data-skip-cheer-card-nav
        className="flex max-h-[90vh] max-w-[90vw] flex-col items-center justify-center"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {imageFailed ? (
          <div
            role="img"
            aria-label={`이미지 ${currentIndex + 1}을 불러올 수 없습니다`}
            data-testid="image-lightbox-error"
            className="flex max-w-[90vw] flex-col items-center justify-center gap-3 rounded-2xl bg-white/10 p-6 text-center text-white"
            style={{ minHeight: '12rem', width: 'min(90vw, 24rem)' }}
          >
            <ImageGridImageOffIcon className="h-6 w-6" />
            <span>이미지를 불러올 수 없습니다</span>
          </div>
        ) : (
          <img
            src={currentImage}
            alt={`이미지 ${currentIndex + 1}`}
            data-testid="image-lightbox-image"
            className="max-h-[90vh] max-w-[90vw] select-none object-contain"
            draggable={false}
            onError={() => setImageFailed(true)}
          />
        )}
        <p
          data-testid="image-lightbox-counter"
          className="mt-4 text-center text-body font-semibold text-white/60"
        >
          {currentIndex + 1} / {images.length}
        </p>
      </div>

      {images.length > 1 && (
        <button
          type="button"
          data-testid="image-lightbox-next"
          data-skip-cheer-card-nav
          className="absolute right-2 z-10 flex size-11 items-center justify-center rounded-full p-0 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none"
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="다음 이미지"
        >
          <ImageGridChevronRightIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
