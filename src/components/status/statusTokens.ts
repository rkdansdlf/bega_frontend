// 빈 상태 · 에러 표면 토큰 — 여러 화면에 흩어져 있던 스타일을 한 곳으로.
// 색·타입·반경은 tailwind.config.js 가 SSOT (fontSize/borderRadius 확장 토큰 사용).
//
// 아직 기존 화면(PredictionMatchTabEmptyState.tsx, CheerFeedStates.tsx 등)에는
// 연결하지 않았습니다 — 새로 만드는 화면부터 이 토큰을 쓰고, 기존 화면은
// 필요할 때 개별적으로 옮깁니다.

// ─────────────────────────────────────────────────────────────
// 빈 상태
//
// 원인이 다르면 다른 화면입니다. 한 종류로 다루지 않습니다.
// ─────────────────────────────────────────────────────────────

export type EmptyKind = 'first-run' | 'filtered' | 'error' | 'gated';

export const EMPTY_FRAME_CLASS: Record<EmptyKind, string> = {
  // 담을 자리가 비어 있음 → 점선
  'first-run': 'rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 dark:border-border dark:bg-card',
  'filtered':  'rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 dark:border-border dark:bg-card',
  'gated':     'rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 dark:border-border dark:bg-card',
  // 못 가져온 것 → 실선
  'error':     'rounded-2xl border border-slate-200 bg-white px-5 py-10 dark:border-border dark:bg-card',
};

export const EMPTY_LAYOUT_CLASS = 'flex flex-col items-center gap-2.5 text-center';
export const EMPTY_TITLE_CLASS = 'text-15 font-bold text-slate-900 dark:text-white';
export const EMPTY_BODY_CLASS = 'max-w-80 text-13 font-medium leading-relaxed text-slate-600 dark:text-slate-400';

/** 심볼 — 마스코트는 first-run 에만. */
export const EMPTY_SYMBOL_CLASS: Record<EmptyKind, string> = {
  'first-run': '', // 마스코트 이미지 56px
  'filtered':  'flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/8',
  'gated':     'flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20',
  'error':     'flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/18 dark:text-red-300',
};

export const EMPTY_MASCOT_SIZE = 56;   // first-run 전용
export const EMPTY_USES_MASCOT: Record<EmptyKind, boolean> = {
  'first-run': true,
  'filtered': false,   // 되돌리기만 하면 되는 상태. 캐릭터는 과잉
  'gated': false,
  'error': false,      // 실패를 귀엽게 포장하는 것으로 읽힙니다
};

// ─────────────────────────────────────────────────────────────
// 에러 표면
//
// 심각도가 아니라 "사용자가 지금 무엇을 할 수 있는지"로 표면이 갈립니다.
//   toast   손댈 게 없음        → 3초 자동 소멸, 재시도 버튼 없음
//   inline  고칠 필드가 화면에  → 그 요소 바로 아래
//   block   영역이 성립 안 함   → 스켈레톤 자리를 대체, 재시도 버튼
// ─────────────────────────────────────────────────────────────

export type ErrorSurface = 'toast' | 'inline' | 'block';

/** 화면 위에 뜨는 층이라 페이지 테마를 따르지 않습니다. */
export const ERROR_TOAST_CLASS =
  'inline-flex items-center gap-2.5 rounded-full bg-slate-900 px-4.5 py-3 text-13 font-semibold text-white shadow-lg';

export const ERROR_INLINE_FIELD_CLASS = 'border-red-600';
export const ERROR_INLINE_TEXT_CLASS =
  'mt-1.5 inline-flex items-center gap-1.5 text-12 font-semibold text-red-600 dark:text-red-300';

export const ERROR_BLOCK_CLASS = EMPTY_FRAME_CLASS.error;
export const ERROR_RETRY_BUTTON_CLASS =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-10 bg-primary px-3 text-13 font-bold text-white hover:bg-primary-hover';

/**
 * 카피 규칙:
 *   제목 = 무엇이 안 됐는지         "기록을 불러오지 못했어요"
 *   설명 = 사용자가 안심할 근거      "작성한 직관일기는 안전하게 저장되어 있습니다"
 *
 *   쓰지 않는 말: 오류가 발생했습니다 · 알 수 없는 오류 · 상태 코드 ·
 *                 죄송합니다 · "잘못 입력하셨습니다"(사용자를 주체로 두는 표현)
 */
export const ERROR_SURFACE_FOR: Record<string, ErrorSurface> = {
  LIKE_SAVE_FAILED:     'toast',
  PARTY_ALREADY_FULL:   'toast',   // + 대안 제시("비슷한 파티를 볼까요?")
  FORM_VALIDATION:      'inline',
  LIST_FETCH_FAILED:    'block',
  DETAIL_FETCH_FAILED:  'block',
};
