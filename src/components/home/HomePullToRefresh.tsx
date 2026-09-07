import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

const RESISTANCE = 0.55;
const THRESHOLD = 60;
const MAX_PULL = 84;
const DIRECTION_LOCK_PX = 8;

interface HomePullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  /** e.g. "오후 6:42" — shown at rest as the last successful refresh time. */
  lastRefreshedLabel?: string | null;
  contentClassName?: string;
  children: ReactNode;
}

/**
 * 실시간 스코어가 있는 홈 피드에서만 씁니다. scrollTop === 0 일 때만 시작하고,
 * 목록 중간에서는 세로 스크롤을 그대로 통과시킵니다.
 */
export default function HomePullToRefresh({
  onRefresh,
  lastRefreshedLabel,
  contentClassName,
  children,
}: HomePullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dragState = useRef<{ startY: number; startX: number; locked: 'x' | 'y' | null } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (refreshing) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (typeof window !== 'undefined' && window.scrollY > 0) return;
    dragState.current = { startY: event.clientY, startX: event.clientX, locked: null };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || refreshing) return;

    const dy = event.clientY - state.startY;
    const dx = event.clientX - state.startX;

    if (state.locked === null) {
      if (Math.abs(dy) < DIRECTION_LOCK_PX && Math.abs(dx) < DIRECTION_LOCK_PX) return;
      if (dy > 0 && dy > Math.abs(dx)) {
        state.locked = 'y';
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      } else {
        dragState.current = null;
        return;
      }
    }

    if (dy <= 0) {
      setPull(0);
      return;
    }

    event.preventDefault();
    setPull(Math.min(MAX_PULL, dy * RESISTANCE));
  };

  const endDrag = () => {
    const state = dragState.current;
    dragState.current = null;
    setDragging(false);
    if (!state || state.locked !== 'y') return;

    if (pull > THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      void Promise.resolve(onRefresh()).finally(() => {
        setRefreshing(false);
        setPull(0);
      });
    } else {
      setPull(0);
    }
  };

  const displayPull = refreshing ? THRESHOLD : pull;
  const pastThreshold = pull > THRESHOLD;
  const statusText = refreshing
    ? '새로고침 중'
    : pastThreshold
      ? '놓으면 새로고침'
      : lastRefreshedLabel
        ? `${lastRefreshedLabel} 업데이트`
        : '당겨서 새로고침';

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative"
    >
      {displayPull > 0 ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 overflow-hidden text-12 font-bold text-slate-500 dark:text-white/70"
          style={{ height: MAX_PULL }}
        >
          <span
            className={`h-4 w-4 rounded-full border-2 border-slate-300 border-t-primary dark:border-white/20 ${refreshing ? 'animate-spin' : ''}`}
            style={!refreshing ? { transform: `rotate(${pull * 3}deg)`, transition: dragging ? 'none' : 'transform 0.22s ease-out' } : undefined}
          />
          <span>{statusText}</span>
        </div>
      ) : null}
      <div
        className={`relative ${contentClassName ?? ''}`}
        style={{
          transform: `translateY(${displayPull}px)`,
          transition: dragging ? 'none' : 'transform 0.22s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
