import { requestAuthReissue } from './authReissue';
import {
  DEFAULT_API_TIMEOUT_MS,
  buildDevProxyUnavailableErrorData,
  buildApiRequestHeaders,
  buildApiUrl,
  createTimeoutController,
  isAbortError,
  parseResponseBody,
  toRequestBody,
} from './httpClientCore';
import type { ApiClientErrorData, ApiParamValue } from './httpClientCore';
import {
  claimAuthSessionExpiry,
  getAuthSessionGeneration,
} from './authSessionGeneration';

type PrivateApiParamValue = ApiParamValue;

type PrivateApiErrorData = ApiClientErrorData;

export class PrivateApiError extends Error {
  data: PrivateApiErrorData | null;
  status: number;

  constructor(status: number, message: string, data: PrivateApiErrorData | null = null) {
    super(message);
    this.name = 'PrivateApiError';
    this.status = status;
    this.data = data;
  }
}

interface PrivateRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, PrivateApiParamValue>;
  signal?: AbortSignal;
  skipAuthSessionHandling?: boolean;
  timeoutMs?: number;
}

const dispatchAuthSessionExpired = (
  detail: Record<string, unknown>,
  skipAuthSessionHandling?: boolean,
  sessionGeneration = getAuthSessionGeneration(),
) => {
  if (
    skipAuthSessionHandling
    || typeof window === 'undefined'
    || !claimAuthSessionExpiry(sessionGeneration)
  ) {
    return;
  }

  window.dispatchEvent(new CustomEvent('auth-session-expired', { detail }));
};

export const requestPrivateReissue = async (): Promise<boolean> => {
  return requestAuthReissue();
};

const privateRequest = async <T>(
  endpoint: string,
  options: PrivateRequestOptions = {},
  hasRetried = false,
  sessionGeneration = getAuthSessionGeneration(),
): Promise<T> => {
  const timeout = createTimeoutController(options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS, options.signal);
  const method = options.method ?? 'GET';
  const url = buildApiUrl(endpoint, options.params);
  const requestBody = toRequestBody(options.body);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      method,
      headers: buildApiRequestHeaders(requestBody, options.headers),
      body: requestBody,
      signal: timeout.signal,
    });
    const responseBody = await parseResponseBody(response);

    if (response.status === 401 && !hasRetried && !options.skipAuthSessionHandling) {
      try {
        await requestPrivateReissue();
        return privateRequest<T>(endpoint, options, true, getAuthSessionGeneration());
      } catch (reissueError) {
        dispatchAuthSessionExpired({
          cause: 'reissue_failed',
          requestUrl: endpoint,
          requestMethod: method,
          requestStatus: 401,
          requestCode: typeof (responseBody as { code?: unknown } | null)?.code === 'string'
            ? (responseBody as { code?: string }).code
            : undefined,
          reissueError: reissueError instanceof Error ? reissueError.message : String(reissueError),
        }, options.skipAuthSessionHandling, sessionGeneration);
      }
    } else if (response.status === 401 && !options.skipAuthSessionHandling) {
      dispatchAuthSessionExpired({
        cause: 'request_unauthorized',
        requestUrl: endpoint,
        requestMethod: method,
        requestStatus: 401,
        requestCode: typeof (responseBody as { code?: unknown } | null)?.code === 'string'
          ? (responseBody as { code?: string }).code
          : undefined,
      }, options.skipAuthSessionHandling, sessionGeneration);
    }

    if (!response.ok) {
      const parsedData = typeof responseBody === 'object' && responseBody !== null
        ? responseBody as PrivateApiErrorData
        : null;
      const data = buildDevProxyUnavailableErrorData(response, responseBody, url) ?? parsedData;
      const message = data?.message || data?.error || response.statusText || `Request failed with status ${response.status}`;
      throw new PrivateApiError(response.status, message, data);
    }

    return responseBody as T;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`Request timed out after ${timeout.timeoutMs}ms`);
    }

    throw error;
  } finally {
    timeout.cleanup();
  }
};

export const privateGet = async <T>(
  endpoint: string,
  options: Omit<PrivateRequestOptions, 'body' | 'method'> = {},
): Promise<T> => privateRequest<T>(endpoint, options);

export const privatePost = async <TResponse, TBody = unknown>(
  endpoint: string,
  body?: TBody,
  options: Omit<PrivateRequestOptions, 'body' | 'method'> = {},
): Promise<TResponse> => privateRequest<TResponse>(endpoint, {
  ...options,
  body,
  method: 'POST',
});

export const privatePut = async <TResponse, TBody = unknown>(
  endpoint: string,
  body?: TBody,
  options: Omit<PrivateRequestOptions, 'body' | 'method'> = {},
): Promise<TResponse> => privateRequest<TResponse>(endpoint, {
  ...options,
  body,
  method: 'PUT',
});

export const privateDelete = async <TResponse, TBody = unknown>(
  endpoint: string,
  options: Omit<PrivateRequestOptions, 'method'> & { body?: TBody } = {},
): Promise<TResponse> => privateRequest<TResponse>(endpoint, {
  ...options,
  method: 'DELETE',
});

export const privatePatch = async <TResponse, TBody = unknown>(
  endpoint: string,
  body?: TBody,
  options: Omit<PrivateRequestOptions, 'body' | 'method'> = {},
): Promise<TResponse> => privateRequest<TResponse>(endpoint, {
  ...options,
  body,
  method: 'PATCH',
});
