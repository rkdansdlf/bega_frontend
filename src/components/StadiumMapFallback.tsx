import { cn } from '../lib/utils';
import { buildKakaoMapPlaceUrl, type KakaoMapLoadFailureReason } from '../utils/kakaoMapLinks';
import { ArrowSquareOutIcon, MapPinIcon, RefreshIcon } from './icons/StadiumGuideIcons';

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
// 모바일: 빈 상자처럼 길어지지 않게 적당한 최소 높이만(280px).
const FOOTPRINT_CLASS = 'min-h-70 lg:min-h-132';
// 반경·테두리 굵기는 라이브 지도 카드와 같고, 면은 옅은 slate 로 지도 자리임을 보여줍니다.
const FRAME_CLASS =
  'stadium-guide-panel-strong flex flex-col items-center justify-center rounded-28 border-2 border-slate-200 bg-slate-50 px-6 py-10 text-center sm:rounded-40';
const SYMBOL_CLASS =
  'flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 lg:h-14 lg:w-14 dark:bg-white/8 dark:text-slate-300 dark:ring-white/10';
// 위치 카드의 '카카오맵 길찾기'(Button size="touch")와 같은 높이·반경.
const ACTION_BASE_CLASS =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors lg:text-15';
const PRIMARY_ACTION_CLASS = 'bg-primary text-white hover:bg-primary-hover';
const SECONDARY_ACTION_CLASS =
  'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-transparent dark:text-white dark:hover:bg-white/8';

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
      className={cn(FRAME_CLASS, FOOTPRINT_CLASS)}
    >
      <span className={SYMBOL_CLASS} aria-hidden="true">
        <MapPinIcon className="h-6 w-6 lg:h-7 lg:w-7" />
      </span>
      <p className="mt-4 break-keep text-base font-bold text-slate-900 lg:mt-5 lg:text-lg dark:text-white">
        {copy.title}
      </p>
      <p className="mt-1.5 max-w-80 break-keep text-13 font-medium leading-relaxed text-slate-600 lg:mt-2 lg:text-sm dark:text-slate-400">
        {copy.description}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:mt-6 lg:gap-2.5">
        <a
          href={placeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${stadiumName} 카카오맵에서 보기`}
          className={cn(ACTION_BASE_CLASS, PRIMARY_ACTION_CLASS)}
          data-testid="stadium-map-fallback-place"
        >
          카카오맵에서 보기
          <ArrowSquareOutIcon className="h-4 w-4" />
        </a>
        {copy.canRetry ? (
          <button
            type="button"
            // disabled 를 쓰면 포커스가 body 로 빠지므로, 재시도 중에는 aria-disabled 로 막고 클릭을 무시합니다.
            onClick={() => {
              if (!isRetrying) onRetry();
            }}
            aria-disabled={isRetrying || undefined}
            aria-busy={isRetrying || undefined}
            className={cn(ACTION_BASE_CLASS, SECONDARY_ACTION_CLASS, 'aria-disabled:cursor-wait aria-disabled:opacity-70')}
            data-testid="stadium-map-fallback-retry"
          >
            <RefreshIcon className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
            다시 시도
          </button>
        ) : null}
      </div>
    </div>
  );
}
