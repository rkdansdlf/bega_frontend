import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { StateAlertCircleIcon, StateRefreshIcon } from '../icons/StateBlockIcons';
import {
  EMPTY_BODY_CLASS,
  EMPTY_FRAME_CLASS,
  EMPTY_LAYOUT_CLASS,
  EMPTY_SYMBOL_CLASS,
  EMPTY_TITLE_CLASS,
  ERROR_RETRY_BUTTON_CLASS,
  type EmptyKind,
} from './statusTokens';

// 빈 상태 · 에러 블록 하나로 통일 (statusTokens.ts 의 카피 규칙을 따릅니다).
//   kind="error"  못 가져온 것 → 실선 프레임 + 재시도
//   그 외         담을 자리가 비어 있음 → 점선 프레임
//   layout="row"  카드 안에 들어가는 한 줄짜리 (아이콘 · 문구 · 재시도)

type StateBlockKind = Exclude<EmptyKind, 'first-run'>;

interface StateBlockProps {
  kind: StateBlockKind;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  retryTestId?: string;
  isRetrying?: boolean;
  /** 재시도 외의 다음 행동 (링크 · 버튼). */
  action?: ReactNode;
  layout?: 'block' | 'row';
  /** 프레임 없이 내용만 (이미 카드 안에 있을 때). */
  bare?: boolean;
  className?: string;
  testId?: string;
}

export default function StateBlock({
  kind,
  title,
  description,
  icon,
  onRetry,
  retryLabel = '다시 시도',
  retryTestId,
  isRetrying = false,
  action,
  layout = 'block',
  bare = false,
  className,
  testId = 'state-block',
}: StateBlockProps) {
  const symbol = icon ?? (kind === 'error' ? <StateAlertCircleIcon className="h-5 w-5" /> : null);
  const retryButton = onRetry ? (
    <button
      type="button"
      // disabled 를 쓰면 포커스가 body 로 빠지므로, 재시도 중에는 aria-disabled 로 막고 클릭을 무시합니다.
      onClick={() => {
        if (!isRetrying) onRetry();
      }}
      aria-disabled={isRetrying || undefined}
      aria-busy={isRetrying || undefined}
      className={cn(ERROR_RETRY_BUTTON_CLASS, 'h-auto min-h-11 shrink-0 sm:min-h-8 aria-disabled:cursor-wait aria-disabled:opacity-70')}
      data-testid={retryTestId ?? `${testId}-retry`}
    >
      <StateRefreshIcon className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')} />
      {retryLabel}
    </button>
  ) : null;

  if (layout === 'row') {
    return (
      <div
        role={kind === 'error' ? 'alert' : 'status'}
        data-testid={testId}
        data-state-kind={kind}
        className={cn(
          'flex flex-wrap items-center gap-3',
          !bare && (kind === 'error'
            ? 'rounded-2xl border border-slate-200 bg-white px-4 py-3.5 dark:border-border dark:bg-card'
            : 'rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3.5 dark:border-border dark:bg-card'),
          className,
        )}
      >
        {symbol ? (
          <span className={cn(EMPTY_SYMBOL_CLASS[kind], 'h-9 w-9 shrink-0')} aria-hidden="true">
            {symbol}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="break-keep text-13 font-bold leading-snug text-slate-900 dark:text-white [overflow-wrap:anywhere]">{title}</p>
          {description ? (
            <p className="mt-0.5 break-keep text-12 font-medium leading-relaxed text-slate-600 dark:text-slate-400 [overflow-wrap:anywhere]">
              {description}
            </p>
          ) : null}
        </div>
        {retryButton || action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {action}
            {retryButton}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      data-testid={testId}
      data-state-kind={kind}
      className={cn(!bare && EMPTY_FRAME_CLASS[kind], bare && 'px-5 py-8', EMPTY_LAYOUT_CLASS, className)}
    >
      {symbol ? (
        <span className={EMPTY_SYMBOL_CLASS[kind]} aria-hidden="true">
          {symbol}
        </span>
      ) : null}
      <p className={cn(EMPTY_TITLE_CLASS, 'break-keep [overflow-wrap:anywhere]')}>{title}</p>
      {description ? <p className={cn(EMPTY_BODY_CLASS, 'max-w-md break-keep [overflow-wrap:anywhere]')}>{description}</p> : null}
      {retryButton || action ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
          {retryButton}
          {action}
        </div>
      ) : null}
    </div>
  );
}
