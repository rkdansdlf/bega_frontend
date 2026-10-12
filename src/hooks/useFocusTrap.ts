import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        // 보이는 요소만 (display:none / 부모 hidden 제외). offsetParent 는 position:fixed 에서 null 일 수 있어 rects 도 함께 검사.
        .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
}

interface UseFocusTrapOptions {
    /** true 일 때만 트랩 활성화 (예: 다이얼로그 open) */
    active: boolean;
    /** 긴 스크롤 다이얼로그는 컨테이너를 먼저 포커스해 상단 위치를 보존합니다. */
    initialFocus?: 'container' | 'first';
    /** 지정하면 비활성화 시 이 요소로 포커스를 돌려보냅니다. */
    restoreFocusTo?: HTMLElement | null;
    /** 컨테이너 밖에서 시작된 Tab 입력도 가로챕니다. */
    listenOnDocument?: boolean;
}

/**
 * 컨테이너 내부로 키보드 포커스를 가두고, 비활성/언마운트 시 직전 포커스로 복귀시킨다.
 * - 활성화 시 컨테이너 내 첫 focusable(없으면 컨테이너 자체)에 포커스.
 * - Tab/Shift+Tab 으로 첫↔마지막 focusable 순환(wrap).
 * 공유 다이얼로그 프리미티브(PlainDialog)에서 사용. portal DOM 기준으로 동작.
 */
export function useFocusTrap(
    containerRef: RefObject<HTMLElement | null>,
    {
        active,
        initialFocus = 'first',
        restoreFocusTo,
        listenOnDocument = false,
    }: UseFocusTrapOptions,
): void {
    useEffect(() => {
        if (!active) return;
        const container = containerRef.current;
        if (!container || typeof document === 'undefined') return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        // 초기 포커스: 첫 focusable, 없으면 컨테이너 자체.
        const initial = getFocusable(container);
        if (initialFocus === 'container') {
            container.focus({ preventScroll: true });
        } else if (initial.length > 0) {
            initial[0].focus();
        } else {
            container.focus();
        }

        const handleKeyDown = (nativeEvent: Event) => {
            const event = nativeEvent as KeyboardEvent;
            if (event.key !== 'Tab') return;
            const focusable = getFocusable(container);
            if (focusable.length === 0) {
                // 포커스 가능한 게 없으면 컨테이너에 묶어둔다.
                event.preventDefault();
                container.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const activeEl = document.activeElement;

            if (event.shiftKey) {
                if (activeEl === first || activeEl === container || !container.contains(activeEl)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (activeEl === last || !container.contains(activeEl)) {
                event.preventDefault();
                first.focus();
            }
        };

        const keydownTarget = listenOnDocument ? document : container;
        keydownTarget.addEventListener('keydown', handleKeyDown);

        return () => {
            keydownTarget.removeEventListener('keydown', handleKeyDown);
            // 직전 포커스 요소가 여전히 문서에 연결돼 있으면 복귀.
            const focusTarget = restoreFocusTo ?? previouslyFocused;
            if (focusTarget && typeof focusTarget.focus === 'function' && document.contains(focusTarget)) {
                focusTarget.focus();
            }
        };
    }, [active, containerRef, initialFocus, listenOnDocument, restoreFocusTo]);
}
