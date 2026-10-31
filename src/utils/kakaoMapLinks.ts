// 카카오맵 SDK 없이 쓰는 부분 — 실패 사유와 카카오맵 웹 링크.
// SDK 로더(kakaoMap.ts)는 설정 · 에셋을 끌고 오므로, 대체 화면은 이 파일만 가져다 씁니다.

/**
 * 지도 SDK 를 못 쓰는 이유. 화면 문구는 이 값으로만 고르고, 아래 진단 메시지는 콘솔에만 남깁니다.
 *   offline      기기가 오프라인 — 연결되면 다시 시도할 만함
 *   unavailable  스크립트 차단(CSP · 광고 차단 등) 또는 초기화 실패 — 일시적 로드/초기화 실패는 다시 시도하면 성공할 수 있으나 CSP/광고 차단은 계속 실패함
 *   missing-key  배포 설정에 키가 없음 — 다시 시도해도 같은 결과
 */
export type KakaoMapLoadFailureReason = 'offline' | 'unavailable' | 'missing-key';

const isValidLinkCoordinate = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** 카카오맵 웹에서 해당 위치를 핀으로 보여주는 링크 (좌표가 없으면 이름 검색). */
export const buildKakaoMapPlaceUrl = (name: string, lat?: number | null, lng?: number | null): string => (
  isValidLinkCoordinate(lat) && isValidLinkCoordinate(lng)
    ? `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`
    : buildKakaoMapSearchUrl(name)
);

/** 카카오맵 웹 검색 링크 — 예: "창원NC파크 편의점". */
export const buildKakaoMapSearchUrl = (query: string): string => (
  `https://map.kakao.com/?q=${encodeURIComponent(query)}`
);
