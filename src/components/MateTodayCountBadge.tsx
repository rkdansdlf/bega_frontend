import { useQuery } from '@tanstack/react-query';

import { getMatePartyListQueryOptions } from '../hooks/mateQueryOptions';

const todayDateString = () => {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * 헤더 "오늘 N건 모집 중" 배지. 오늘 PENDING 파티 수(totalElements)만 size=1로 조회.
 * 0건이면 렌더하지 않는다. (lazy 분리로 Mate runtime 슬림 유지.)
 */
type MateTodayCountBadgeProps = {
  countOverride?: number;
  stateOverride?: 'error' | 'loading';
};

export default function MateTodayCountBadge({
  countOverride,
  stateOverride,
}: MateTodayCountBadgeProps = {}) {
  const { data } = useQuery({
    ...getMatePartyListQueryOptions({
      status: 'PENDING',
      gameDate: todayDateString(),
      page: 0,
      size: 1,
    }),
    enabled: countOverride === undefined && stateOverride === undefined,
  });

  const rawCount = countOverride ?? data?.totalElements ?? 0;
  const count = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0;
  if (stateOverride !== undefined || count <= 0) {
    return (
      <span
        hidden
        aria-hidden="true"
        data-testid="mate-today-count-badge-empty"
      />
    );
  }
  const displayCount = count > 99 ? '99+' : count;

  return (
    <span
      className="inline-flex max-w-[9rem] shrink-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-primary/10 px-2.5 py-1 text-13 font-extrabold tabular-nums text-primary dark:bg-primary/15 dark:text-primary-light"
      data-testid="mate-today-count-badge"
      role="status"
      aria-label={`오늘 ${count}건 모집 중`}
    >
      오늘 {displayCount}건 모집 중
    </span>
  );
}
