import { AuthOperationSupersededError, AuthRequestNotDispatchedError } from '../api/authSessionGeneration';
import type { GlobalApiErrorDetail } from '../types/error';

interface LogoutOperation {
  previous?: Promise<boolean>;
  isCurrent: () => boolean;
  drain: () => Promise<void>;
  dispatch: (isCurrent: () => boolean) => Promise<void>;
  clear: () => boolean;
  retry: () => Promise<boolean>;
  incomplete: () => void;
  status: (error: unknown) => number | undefined;
  code: (error: unknown) => string | undefined;
}

export const runLogoutOperation = async (operation: LogoutOperation): Promise<boolean> => {
  try {
    if (operation.previous) await operation.previous;
    if (!operation.isCurrent()) return false;
    await operation.drain();
    if (!operation.isCurrent()) return false;
    await operation.dispatch(operation.isCurrent);
    return operation.isCurrent() ? operation.clear() : false;
  } catch (error) {
    if (error instanceof AuthOperationSupersededError) return false;
    if (error instanceof AuthRequestNotDispatchedError) {
      if (operation.isCurrent() && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<GlobalApiErrorDetail>('global-api-error', {
        detail: {
          message: '로그아웃 요청을 보내지 못했습니다. 잠시 후 다시 시도해주세요.',
          statusCode: null, responseCode: 'AUTH_REQUEST_NOT_DISPATCHED',
          endpoint: '/auth/logout', source: 'api',
          onRetry: async () => { if (operation.isCurrent()) await operation.retry(); },
        },
      }));
      return false;
    }
    if (operation.status(error) === undefined) {
      operation.incomplete();
      // Unknown transport cannot prove the server stopped mutating cookies.
      return new Promise<boolean>(() => {});
    }
    if (!operation.isCurrent()) return false;
    if (operation.status(error) === 503 && operation.code(error) === 'LOGOUT_REVOCATION_UNAVAILABLE') {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<GlobalApiErrorDetail>('global-api-error', {
        detail: {
          message: '로그아웃을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.',
          statusCode: 503, responseCode: 'LOGOUT_REVOCATION_UNAVAILABLE',
          endpoint: '/auth/logout', source: 'api',
          onRetry: async () => { if (operation.isCurrent()) await operation.retry(); },
        },
      }));
      return false;
    }
    // Preserve the existing cleanup contract for known HTTP failures.
    return operation.clear();
  }
};
