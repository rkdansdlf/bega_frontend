import type { CSSProperties, ReactNode } from 'react';

import StateBlock from '../status/StateBlock';
import { ClockIcon } from '../icons/PublicFeatureIcons';

// 첫 카드 경로 밖(lazy)에서만 쓰는 경기 보드 복구 화면.
// 보드 헤더는 그대로 두고, 내용 자리에 짧은 블록 하나와 재시도 버튼만 둡니다.
const HOME_MATCH_ERROR_PANEL_CLASS = 'rounded-3xl border border-primary/20 bg-white p-4 shadow-home-board ring-1 ring-primary/10 dark:border-primary/25 dark:bg-card md:p-5';
const HOME_MATCH_ERROR_DESCRIPTION_CLASS = 'py-8';
const MATCH_PRIORITY_REGION_PROPS = {
  'aria-label': '오늘 경기 중심 영역',
  'data-priority': 'primary',
  'data-testid': 'home-match-priority-panel',
} as const;

interface HomeMatchPanelErrorStateProps {
  style?: CSSProperties;
  title: string;
  description: string;
  /** 재시도를 다른 곳(관리자 데이터 배너)에서 처리할 때만 true. */
  suppressRecoveryActions: boolean;
  compact?: boolean;
  /** error: 요청 실패 · delayed: 6초가 지나도 응답이 없지만 요청은 진행 중 */
  variant?: 'error' | 'delayed';
  header?: ReactNode;
  onRetry: () => void;
}

export default function HomeMatchPanelErrorState({
  style,
  title,
  description,
  suppressRecoveryActions,
  compact = false,
  variant = 'error',
  header,
  onRetry,
}: HomeMatchPanelErrorStateProps) {
  const isDelayed = variant === 'delayed';

  return (
    <div className={HOME_MATCH_ERROR_PANEL_CLASS} style={style} {...MATCH_PRIORITY_REGION_PROPS}>
      {header}
      <StateBlock
        kind={isDelayed ? 'filtered' : 'error'}
        icon={isDelayed ? <ClockIcon className="h-5 w-5" /> : undefined}
        title={title}
        description={description}
        onRetry={suppressRecoveryActions ? undefined : onRetry}
        retryLabel={isDelayed ? '다시 불러오기' : '다시 시도'}
        className={compact ? 'py-6' : HOME_MATCH_ERROR_DESCRIPTION_CLASS}
        testId={isDelayed ? 'home-match-delayed' : 'home-match-error'}
      />
    </div>
  );
}
