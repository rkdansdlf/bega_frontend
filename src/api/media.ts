import { getApiErrorMessage } from '../utils/errorUtils';
import { compressImage } from '../utils/imageCompression';
import type {
  FinalizeMediaUploadResponse,
  InitMediaUploadRequest,
  InitMediaUploadResponse,
  MediaDomain,
} from '../types/media';
import { privateDelete, privatePost } from './privateClient';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

const STORAGE_UPLOAD_TIMEOUT_MS = 60_000;
const MEDIA_PREPARATION_TIMEOUT_MS = 60_000;

interface MediaUploadOptions {
  signal?: AbortSignal;
}

function throwIfUploadCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('업로드가 취소되었습니다.');
}

function waitForPreparation<T>(work: Promise<T>, signal?: AbortSignal, onTimeout?: () => void): Promise<T> {
  throwIfUploadCancelled(signal);
  return new Promise<T>((resolve, reject) => {
    const cancel = () => finish(() => reject(new Error('업로드가 취소되었습니다.')));
    const timer = setTimeout(() => {
      onTimeout?.();
      finish(() => reject(new Error('이미지 준비 시간이 초과되었습니다.')));
    }, MEDIA_PREPARATION_TIMEOUT_MS);
    const finish = (complete: () => void) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      complete();
    };
    signal?.addEventListener('abort', cancel, { once: true });
    work.then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
  });
}

async function getImageDimensions(file: File, signal?: AbortSignal): Promise<{ width: number; height: number }> {
  if (typeof document === 'undefined') {
    throw new Error('이미지 업로드는 브라우저 환경에서만 지원됩니다.');
  }

  const objectUrl = URL.createObjectURL(file);
  let nextImage: HTMLImageElement | null = null;
  try {
    nextImage = new Image();
    const imageElement = nextImage;
    const image = await waitForPreparation(new Promise<HTMLImageElement>((resolve, reject) => {
      imageElement.onload = () => resolve(imageElement);
      imageElement.onerror = () => reject(new Error('이미지 크기를 확인할 수 없습니다.'));
      imageElement.src = objectUrl;
    }), signal);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    if (nextImage) {
      nextImage.onload = null;
      nextImage.onerror = null;
    }
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadToPresignedUrl(
  uploadUrl: string,
  requiredHeaders: Record<string, string>,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  throwIfUploadCancelled(signal);
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => {
    if (!controller.signal.aborted) {
      timedOut = true;
      controller.abort();
    }
  }, STORAGE_UPLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: requiredHeaders,
      body: file,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`스토리지 업로드 실패 (${response.status})`);
    }
  } catch (error) {
    if (timedOut) throw new Error('스토리지 업로드 시간이 초과되었습니다.');
    throwIfUploadCancelled(signal);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

async function uploadMediaFileInternal(
  domain: MediaDomain,
  file: File,
  options: MediaUploadOptions,
  onFailure?: (error: Error) => void,
): Promise<FinalizeMediaUploadResponse> {
  let assetId: number | null = null;
  try {
    throwIfUploadCancelled(options.signal);
    const compressionController = new AbortController();
    const cancelCompression = () => compressionController.abort();
    options.signal?.addEventListener('abort', cancelCompression, { once: true });
    let fileToUpload: File;
    try {
      fileToUpload = await waitForPreparation(compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        initialQuality: 0.82,
        useWebWorker: true,
        signal: compressionController.signal,
      }), options.signal, cancelCompression);
    } finally {
      options.signal?.removeEventListener('abort', cancelCompression);
    }
    throwIfUploadCancelled(options.signal);
    const dimensions = await getImageDimensions(fileToUpload, options.signal);
    throwIfUploadCancelled(options.signal);

    const initPayload: InitMediaUploadRequest = {
      domain,
      fileName: fileToUpload.name,
      contentType: fileToUpload.type || 'application/octet-stream',
      contentLength: fileToUpload.size,
      width: dimensions.width,
      height: dimensions.height,
    };

    const initResponse = await privatePost<ApiEnvelope<InitMediaUploadResponse>, InitMediaUploadRequest>(
      '/media/uploads/init',
      initPayload,
    );

    if (!initResponse.success || !initResponse.data) {
      throw new Error(initResponse.message || '미디어 업로드 준비에 실패했습니다.');
    }

    assetId = initResponse.data.assetId;
    await uploadToPresignedUrl(
      initResponse.data.uploadUrl,
      initResponse.data.requiredHeaders || {},
      fileToUpload,
      options.signal,
    );

    throwIfUploadCancelled(options.signal);

    const finalizeResponse = await privatePost<ApiEnvelope<FinalizeMediaUploadResponse>>(
      `/media/uploads/${assetId}/finalize`,
    );

    if (!finalizeResponse.success || !finalizeResponse.data) {
      throw new Error(finalizeResponse.message || '미디어 업로드 완료 처리에 실패했습니다.');
    }

    throwIfUploadCancelled(options.signal);
    return finalizeResponse.data;
  } catch (error: unknown) {
    const uploadError = new Error(getApiErrorMessage(error, '미디어 업로드에 실패했습니다.'));
    onFailure?.(uploadError);
    if (assetId != null) {
      try {
        await privateDelete(`/media/uploads/${assetId}`);
      } catch {
        // Best effort cleanup only.
      }
    }
    throw uploadError;
  }
}

export async function uploadMediaFile(
  domain: MediaDomain,
  file: File,
  options: MediaUploadOptions = {},
): Promise<FinalizeMediaUploadResponse> {
  return uploadMediaFileInternal(domain, file, options);
}

export async function uploadMediaFiles(
  domain: MediaDomain,
  files: File[],
  options: MediaUploadOptions = {},
): Promise<FinalizeMediaUploadResponse[]> {
  throwIfUploadCancelled(options.signal);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  let firstError: unknown;
  try {
    const results = await Promise.allSettled(files.map(async (file) => {
      try {
        return await uploadMediaFileInternal(domain, file, { signal: controller.signal }, (error) => {
          if (firstError === undefined) firstError = error;
          controller.abort();
        });
      } catch (error) {
        if (firstError === undefined) firstError = error;
        controller.abort();
        throw error;
      }
    }));
    if (firstError !== undefined || controller.signal.aborted) {
      await Promise.all(results.flatMap((result) => result.status === 'fulfilled'
        ? [privateDelete(`/media/uploads/${result.value.assetId}`).catch(() => {})]
        : []));
      throw firstError ?? new Error('업로드가 취소되었습니다.');
    }
    return results.map((result) => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    });
  } finally {
    options.signal?.removeEventListener('abort', cancel);
  }
}
