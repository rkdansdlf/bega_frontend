import type { KakaoMapLoadFailureReason } from '../utils/kakaoMapLinks';
import type { AsyncStatus } from '../utils/stadiumGuideUtils';

export type StadiumMapStatus = AsyncStatus;

export interface ResolveMapFallbackReasonParams {
  hasSelectedStadium: boolean;
  canRenderMap: boolean;
  mapFailureReason?: KakaoMapLoadFailureReason | null;
  hasApiKey: boolean;
  mapStatus: AsyncStatus;
}

/**
 * 카카오맵 SDK 를 못 쓸 때 지도 자리에 표시할 안내 사유를 결정합니다.
 * - 구장이 선택되지 않았거나 지도를 정상 렌더링할 수 있다면 null
 * - 명시적 실패 사유(offline 등)가 있다면 최우선 적용
 * - API 키가 없으면 'missing-key'
 * - mapStatus 가 'error' 이면 'unavailable'
 * - 그 외(예: API 키가 있고 mapStatus 는 success 이나 구장 좌표가 없어 canRenderMap 이 false 인 경우)는 null
 */
export function resolveMapFallbackReason({
  hasSelectedStadium,
  canRenderMap,
  mapFailureReason,
  hasApiKey,
  mapStatus,
}: ResolveMapFallbackReasonParams): KakaoMapLoadFailureReason | null {
  if (!hasSelectedStadium || canRenderMap) {
    return null;
  }

  return (
    mapFailureReason
    ?? (!hasApiKey ? 'missing-key' : mapStatus === 'error' ? 'unavailable' : null)
  );
}
