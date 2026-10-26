import { cn } from '../lib/utils';
import { buildKakaoMapPlaceUrl, type KakaoMapLoadFailureReason } from '../utils/kakaoMapLinks';
import { ArrowSquareOutIcon, MapPinIcon, RefreshIcon } from './icons/StadiumGuideIcons';
import {
  EMPTY_BODY_CLASS,
  EMPTY_FRAME_CLASS,
  EMPTY_LAYOUT_CLASS,
  EMPTY_SYMBOL_CLASS,
  EMPTY_TITLE_CLASS,
  ERROR_RETRY_BUTTON_CLASS,
} from './status/statusTokens';

// 카카오맵 SDK 를 못 쓸 때 지도 자리에 들어가는 블록.
// 사유별 문구만 다르고, 위치는 카카오맵 웹 링크로 넘깁니다.
// 길찾기는 바로 위 위치 카드의 '카카오맵 길찾기' 하나만 둡니다.
// 진단 메시지는 화면에 내지 않습니다 — kakaoMap.ts 가 콘솔에 남깁니다.

type StadiumMapFallbackCopy = {
  title: string;
  description: string;
  canRetry: boolean;
};

export const STADIUM_MAP_FALLBACK_COPY: Record<KakaoMapLoadFailureReason, StadiumMapFallbackCopy> = {
  offline: {
    title: '인터넷 연결이 끊겨 지도를 못 불러왔어요',
    description: '연결되면 지도를 다시 불러올게요.',
    canRetry: true,
  },
  unavailable: {
    title: '지도를 불러오지 못했어요',
    description: '구장 위치는 카카오맵에서 볼 수 있어요.',
    canRetry: true,
  },
  'missing-key': {
    title: '지금은 지도를 보여드릴 수 없어요',
    description: '구장 위치는 카카오맵에서 볼 수 있어요.',
    canRetry: false,
  },
};

// 라이브 지도 카드와 같은 자리를 차지합니다.
// lg+: 지도(500px) + 안쪽 여백(sm:p-3 × 2) + 테두리(border-2 × 2) = 528px — 오른쪽 열과 아래선이 맞습니다.
// 모바일: 빈 상자처럼 길어지지 않게 적당한 최소 높이만.
const FOOTPRINT_CLASS = 'min-h-[280px] justify-center lg:min-h-[528px]';
// 모바일에서는 44px 터치 영역.
const ACTION_SIZE_CLASS = 'min-h-11 sm:min-h-8';
const SECONDARY_ACTION_CLASS =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-10 border border-slate-200 bg-white px-3 text-13 font-bold text-slate-700 hover:bg-slate-50 dark:border-border dark:bg-transparent dark:text-white dark:hover:bg-white/8';

interface StadiumMapFallbackProps {
  reason: KakaoMapLoadFailureReason;
  stadiumName: string;
  lat?: number | null;
  lng?: number | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

export default function StadiumMapFallback({
  reason,
  stadiumName,
  lat,
  lng,
  onRetry,
  isRetrying = false,
}: StadiumMapFallbackProps) {
  const copy = STADIUM_MAP_FALLBACK_COPY[reason];
  const placeUrl = buildKakaoMapPlaceUrl(stadiumName, lat, lng);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="stadium-map-fallback"
      data-map-failure-reason={reason}
      className={cn(EMPTY_FRAME_CLASS.error, EMPTY_LAYOUT_CLASS, FOOTPRINT_CLASS)}
    >
      <span className={EMPTY_SYMBOL_CLASS.filtered} aria-hidden="true">
        <MapPinIcon className="h-5 w-5" />
      </span>
      <p className="text-12 font-semibold text-slate-500 dark:text-slate-400">{stadiumName}</p>
      <p className={cn(EMPTY_TITLE_CLASS, 'break-keep')}>{copy.title}</p>
      <p className={cn(EMPTY_BODY_CLASS, 'break-keep')}>{copy.description}</p>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
        <a
          href={placeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(ERROR_RETRY_BUTTON_CLASS, ACTION_SIZE_CLASS)}
          data-testid="stadium-map-fallback-place"
        >
          카카오맵에서 보기
          <ArrowSquareOutIcon className="h-3.5 w-3.5" />
        </a>
        {copy.canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            aria-busy={isRetrying || undefined}
            className={cn(SECONDARY_ACTION_CLASS, ACTION_SIZE_CLASS, 'disabled:cursor-wait disabled:opacity-70')}
            data-testid="stadium-map-fallback-retry"
          >
            <RefreshIcon className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')} />
            다시 시도
          </button>
        ) : null}
      </div>
    </div>
  );
}
