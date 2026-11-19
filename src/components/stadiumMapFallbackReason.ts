import type { KakaoMapLoadFailureReason } from '../utils/kakaoMapLinks';
import type { AsyncStatus } from '../utils/stadiumGuideUtils';

export type StadiumMapStatus = AsyncStatus;

export interface ResolveMapFallbackReasonParams {
  hasSelectedStadium: boolean;
  canRenderMap: boolean;
  mapFailureReason?: KakaoMapLoadFailureReason | null;
  hasApiKey: boolean;
  mapStatus: AsyncStatus;
  hasStadiumCoordinates: boolean;
}

/**
 * 카카오맵 SDK 를 못 쓸 때 지도 자리에 표시할 안내 사유를 결정합니다.
 * - 구장이 선택되지 않았거나 지도를 정상 렌더링할 수 있다면 null
 * - 구장 좌표가 없으면 'no-coordinates' (다시 시도해도 지도를 그릴 수 없으므로 최우선)
 * - 명시적 실패 사유(offline 등)가 있다면 그다음 적용
 * - API 키가 없으면 'missing-key'
 * - mapStatus 가 'error' 이면 'unavailable'
 * - 그 외(예: 로딩 중 등)는 null
 */
export function resolveMapFallbackReason({
  hasSelectedStadium,
  canRenderMap,
  mapFailureReason,
  hasApiKey,
  mapStatus,
  hasStadiumCoordinates,
}: ResolveMapFallbackReasonParams): KakaoMapLoadFailureReason | null {
  if (!hasSelectedStadium || canRenderMap) {
    return null;
  }

  // 좌표가 없으면 SDK 가 떠도 지도를 그릴 수 없으므로, 재시도를 권하는 SDK 실패 사유보다 먼저 봅니다.
  if (!hasStadiumCoordinates) {
    return 'no-coordinates';
  }

  return (
    mapFailureReason
    ?? (!hasApiKey ? 'missing-key' : mapStatus === 'error' ? 'unavailable' : null)
  );
}
