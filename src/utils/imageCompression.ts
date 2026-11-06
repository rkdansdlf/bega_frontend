/**
 * 이미지 압축 옵션
 */
export interface CompressionOptions {
  /** 최대 파일 크기 (MB) - 기본값: 1MB */
  maxSizeMB?: number;
  /** 최대 너비/높이 (px) - 기본값: 1920px */
  maxWidthOrHeight?: number;
  /** 압축 품질 (0~1) - 기본값: 0.8 */
  initialQuality?: number;
  /** 하위 호환용 옵션이며 현재 로컬 압축기에서는 무시됩니다. */
  useWebWorker?: boolean;
  signal?: AbortSignal;
}

/** 기본 압축 설정 */
const DEFAULT_OPTIONS: Required<Omit<CompressionOptions, 'signal'>> = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  initialQuality: 0.8,
  useWebWorker: true,
};

const MIN_QUALITY = 0.45;
const QUALITY_STEP = 0.1;
const MAX_RESIZE_ATTEMPTS = 4;
const RESIZE_FACTOR = 0.85;
const MIN_DIMENSION = 480;

function clampQuality(quality: number): number {
  return Math.min(0.95, Math.max(MIN_QUALITY, quality));
}

function createOutputType(file: File): string {
  if (file.type === 'image/jpeg' || file.type === 'image/webp') {
    return file.type;
  }

  if (file.type === 'image/png') {
    return 'image/webp';
  }

  return file.type;
}

function renameFileForType(fileName: string, mimeType: string): string {
  const extensionByType: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };

  const extension = extensionByType[mimeType];
  if (!extension) {
    return fileName;
  }

  return fileName.replace(/\.[^.]+$/, '') + extension;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('이미지 압축이 취소되었습니다.', 'AbortError');
}

async function loadImageElement(file: File, signal?: AbortSignal): Promise<HTMLImageElement> {
  throwIfAborted(signal);
  const imageUrl = URL.createObjectURL(file);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    let image: HTMLImageElement | null = null;
    let settled = false;
    const finish = (complete: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', cancel);
      if (image) {
        image.onload = null;
        image.onerror = null;
      }
      URL.revokeObjectURL(imageUrl);
      complete();
    };
    const cancel = () => finish(() => reject(new DOMException('이미지 압축이 취소되었습니다.', 'AbortError')));
    try {
      image = new Image();
      const loadedImage = image;
      image.onload = () => finish(() => resolve(loadedImage));
      image.onerror = () => finish(() => reject(new Error('이미지 디코딩에 실패했습니다.')));
      signal?.addEventListener('abort', cancel, { once: true });
      image.src = imageUrl;
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
  signal?: AbortSignal,
): Promise<Blob | null> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const cancel = () => {
      signal?.removeEventListener('abort', cancel);
      reject(new DOMException('이미지 압축이 취소되었습니다.', 'AbortError'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      canvas.toBlob((blob) => {
        signal?.removeEventListener('abort', cancel);
        resolve(blob);
      }, mimeType, quality);
    } catch (error) {
      signal?.removeEventListener('abort', cancel);
      reject(error);
    }
  });
}

/**
 * 단일 이미지 압축
 * @param file 원본 이미지 파일
 * @param options 압축 옵션
 * @returns 압축된 이미지 파일
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  throwIfAborted(options.signal);
  // 이미 충분히 작은 파일은 압축 건너뛰기
  const maxSizeMB = options.maxSizeMB ?? DEFAULT_OPTIONS.maxSizeMB;
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (
    file.size <= maxBytes ||
    typeof document === 'undefined' ||
    !isImageFile(file) ||
    !isSupportedImageType(file) ||
    file.type === 'image/gif'
  ) {
    return file;
  }

  try {
    const image = await loadImageElement(file, options.signal);
    throwIfAborted(options.signal);
    const maxWidthOrHeight = options.maxWidthOrHeight ?? DEFAULT_OPTIONS.maxWidthOrHeight;
    const initialQuality = clampQuality(options.initialQuality ?? DEFAULT_OPTIONS.initialQuality);
    const outputType = createOutputType(file);

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const baseScale = longestSide > maxWidthOrHeight ? maxWidthOrHeight / longestSide : 1;
    let width = Math.max(1, Math.round(image.naturalWidth * baseScale));
    let height = Math.max(1, Math.round(image.naturalHeight * baseScale));

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: outputType !== 'image/jpeg' });

    if (!context) {
      throwIfAborted(options.signal);
      return file;
    }

    let bestBlob: Blob | null = null;

    for (let attempt = 0; attempt <= MAX_RESIZE_ATTEMPTS; attempt += 1) {
      throwIfAborted(options.signal);
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (let quality = initialQuality; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
        const blob = await canvasToBlob(canvas, outputType, clampQuality(quality), options.signal);
        throwIfAborted(options.signal);
        if (!blob) {
          continue;
        }

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }

        if (blob.size <= maxBytes) {
          return new File(
            [blob],
            renameFileForType(file.name, blob.type || outputType),
            {
              type: blob.type || outputType,
              lastModified: file.lastModified,
            },
          );
        }
      }

      if (Math.max(width, height) <= MIN_DIMENSION) {
        break;
      }

      width = Math.max(1, Math.round(width * RESIZE_FACTOR));
      height = Math.max(1, Math.round(height * RESIZE_FACTOR));
    }

    throwIfAborted(options.signal);
    if (bestBlob && bestBlob.size < file.size) {
      return new File(
        [bestBlob],
        renameFileForType(file.name, bestBlob.type || outputType),
        {
          type: bestBlob.type || outputType,
          lastModified: file.lastModified,
        },
      );
    }

    return file;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    console.error('[ImageCompression] 이미지 압축 실패');
    // 압축 실패 시 원본 반환
    return file;
  }
}

/**
 * 여러 이미지 일괄 압축 (병렬 처리)
 * @param files 원본 이미지 파일 배열
 * @param options 압축 옵션
 * @param onProgress 진행 상황 콜백 (선택)
 * @returns 압축된 이미지 파일 배열
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const total = files.length;
  let completed = 0;

  // 병렬 처리로 성능 개선 (최대 3개 동시 처리)
  const CONCURRENCY = 3;
  const results: File[] = new Array(files.length);

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (file, idx) => {
        const compressed = await compressImage(file, options);
        completed++;
        onProgress?.(completed, total);
        return { index: i + idx, file: compressed };
      })
    );
    batchResults.forEach(({ index, file }) => {
      results[index] = file;
    });
  }

  return results;
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * 이미지 파일인지 확인
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 지원되는 이미지 형식인지 확인
 */
export function isSupportedImageType(file: File): boolean {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return supportedTypes.includes(file.type);
}
