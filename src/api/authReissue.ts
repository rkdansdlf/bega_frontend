import {
  buildApiRequestHeaders,
  buildApiUrl,
  toJsonRequestBody,
} from './httpClientCore';
import {
  assertAuthOperationCurrent, AuthOperationSupersededError,
  getAuthLogoutCompletion, getAuthOperationRevision, markAuthSessionRefreshed,
} from './authSessionGeneration';

let reissueInFlight: { revision: number; result: Promise<boolean> } | null = null;
let uncertainTransport = false;
const unresolvedTransport = new Promise<void>(() => {});

export const waitForAuthReissue = async (): Promise<void> => {
  if (reissueInFlight) await reissueInFlight.result.catch(() => {});
  // A rejected transport cannot prove that the server stopped mutating cookies.
  if (uncertainTransport) await unresolvedTransport;
};

export const requestAuthReissue = async (revision = getAuthOperationRevision()): Promise<boolean> => {
  assertAuthOperationCurrent(revision);
  const logout = getAuthLogoutCompletion();
  if (logout) {
    await logout;
    assertAuthOperationCurrent(revision);
  }
  if (uncertainTransport) throw new AuthOperationSupersededError();
  if (reissueInFlight && reissueInFlight.revision !== revision) {
    await waitForAuthReissue();
    assertAuthOperationCurrent(revision);
  }
  if (!reissueInFlight) {
    const result = (async () => {
      const requestBody = toJsonRequestBody({});
      let response: Response;
      try {
        response = await fetch(buildApiUrl('/auth/reissue'), {
          credentials: 'include',
          method: 'POST',
          headers: buildApiRequestHeaders(requestBody),
          body: requestBody,
        });
      } catch {
        uncertainTransport = true;
        throw new AuthOperationSupersededError();
      }

      assertAuthOperationCurrent(revision);
      if (!response.ok) {
        throw new Error(`Reissue failed with status ${response.status}`);
      }

      markAuthSessionRefreshed();
      return true;
    })().finally(() => {
      if (reissueInFlight?.result === result) reissueInFlight = null;
    });
    reissueInFlight = { revision, result };
  }

  const result = await reissueInFlight.result;
  assertAuthOperationCurrent(revision);
  return result;
};
