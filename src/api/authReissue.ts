import {
  buildApiRequestHeaders,
  buildApiUrl,
  toJsonRequestBody,
} from './httpClientCore';
import { markAuthSessionEstablished } from './authSessionGeneration';

let reissueInFlight: Promise<boolean> | null = null;

export const requestAuthReissue = async (): Promise<boolean> => {
  if (!reissueInFlight) {
    reissueInFlight = (async () => {
      const requestBody = toJsonRequestBody({});
      const response = await fetch(buildApiUrl('/auth/reissue'), {
        credentials: 'include',
        method: 'POST',
        headers: buildApiRequestHeaders(requestBody),
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error(`Reissue failed with status ${response.status}`);
      }

      markAuthSessionEstablished();
      return true;
    })().finally(() => {
      reissueInFlight = null;
    });
  }

  return reissueInFlight;
};
