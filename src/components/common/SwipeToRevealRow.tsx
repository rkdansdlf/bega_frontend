import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = 56;
const DIRECTION_LOCK_PX = 8;

interface SwipeToRevealRowProps {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
  className?: string;
}

/**
 * 저장 목록처럼 되돌릴 수 있는 삭제에만 씁니다 — 스와이프는 항상
 * 이미 있는 버튼(카드 내부 북마크 토글)의 지름길이라 접근성은
 * 그 버튼이 계속 보장합니다.
 */
export default function SwipeToRevealRow({ children, onDelete, deleteLabel = '삭제', className }: SwipeToRevealRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; baseX: number; locked: 'x' | 'y' | null } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragState.current = { startX: event.clientX, startY: event.clientY, baseX: translateX, locked: null };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (state.locked === null) {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return;
      state.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (state.locked === 'x') {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }
    }

    if (state.locked !== 'x') return;

    event.preventDefault();
    const next = Math.min(0, Math.max(-ACTION_WIDTH, state.baseX + dx));
    setTranslateX(next);
  };

  const endDrag = () => {
    const state = dragState.current;
    dragState.current = null;
    setDragging(false);
    if (!state || state.locked !== 'x') return;
    setTranslateX((current) => (Math.abs(current) > OPEN_THRESHOLD ? -ACTION_WIDTH : 0));
  };

  return (
    <div className={`relative overflow-hidden rounded-16 ${className ?? ''}`}>
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600"
        style={{ width: ACTION_WIDTH }}
      >
        <button
          type="button"
          onClick={() => {
            setTranslateX(0);
            onDelete();
          }}
          aria-label={deleteLabel}
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-white"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
          </svg>
          <span className="text-11 font-bold">{deleteLabel}</span>
        </button>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 0.22s ease-out',
          touchAction: 'pan-y',
        }}
        className="relative select-none bg-[var(--cheer-card-bg)]"
      >
        {children}
      </div>
    </div>
  );
}
