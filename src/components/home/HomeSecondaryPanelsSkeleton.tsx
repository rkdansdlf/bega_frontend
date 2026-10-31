// 보조 패널(팀 순위 · 인기 응원글 · 직관 메이트) 로딩 골격.
// 실제 HomeSecondaryPanels 의 그리드 · 카드 높이 · 행 구조를 그대로 따라가서
// 데이터가 들어와도 레이아웃이 튀지 않게 합니다.

const BLOCK = 'animate-pulse bg-zinc-200 dark:bg-zinc-800/60';
const HOME_DASHBOARD_TEAM_COUNT = 10;

function Bar({ className }: { className: string }) {
  return <span aria-hidden="true" className={`block ${BLOCK} ${/\brounded-/.test(className) ? '' : 'rounded-md'} ${className}`} />;
}

export function RankingRowsSkeleton({ rowClassName = 'lg:h-[65px] lg:min-h-[65px]' }: { rowClassName?: string }) {
  return (
    <div data-testid="home-ranking-skeleton">
      {Array.from({ length: HOME_DASHBOARD_TEAM_COUNT }, (_, index) => (
        <div
          key={`ranking-skeleton-${index}`}
          className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-200/80 px-3 py-2.5 last:border-b-0 dark:border-zinc-800/80 lg:px-4 ${rowClassName}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-6 shrink-0 text-center text-15 font-black text-zinc-300 dark:text-zinc-600">
              {index + 1}
            </span>
            <span aria-hidden="true" className={`h-8 w-8 shrink-0 rounded-full lg:h-10 lg:w-10 ${BLOCK}`} />
            <div className="min-w-0 space-y-1.5">
              <Bar className="h-4 w-20" />
              <Bar className="h-3 w-16" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Bar className="h-4 w-12" />
            <Bar className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HotCheerSkeleton() {
  return (
    <div data-testid="home-hot-cheer-skeleton">
      <div className="flex flex-col gap-2 lg:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={`hot-mobile-${index}`} className="flex gap-3 px-2.5 py-2.5">
            <span aria-hidden="true" className={`h-12 w-12 shrink-0 rounded-xl ${BLOCK}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="h-3 w-24" />
              <Bar className="h-4 w-full" />
              <Bar className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden flex-col gap-1 lg:flex">
        <span aria-hidden="true" className={`mb-2.5 h-[100px] w-full rounded-xl ${BLOCK}`} />
        <div className="space-y-2 px-1">
          <Bar className="h-4 w-4/5" />
          <Bar className="h-3 w-1/2" />
        </div>
        <div className="mt-3 space-y-1 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={`hot-desktop-${index}`} className="flex items-center gap-2.5 px-2 py-2">
              <span aria-hidden="true" className={`h-9 w-9 shrink-0 rounded-lg ${BLOCK}`} />
              <Bar className="h-4 flex-1" />
              <Bar className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeaturedMateSkeleton() {
  return (
    <div className="flex flex-col gap-2" data-testid="home-featured-mate-skeleton">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={`mate-skeleton-${index}`} className="px-2.5 py-2.5">
          <div className="mb-2 flex items-center gap-2">
            <Bar className="h-4 w-10" />
            <Bar className="h-3 flex-1" />
            <Bar className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-6 w-6 shrink-0 rounded-full ${BLOCK}`} />
            <span aria-hidden="true" className={`h-6 w-6 shrink-0 rounded-full ${BLOCK}`} />
            <div className="ml-1 min-w-0 flex-1 space-y-1.5">
              <Bar className="h-3.5 w-28" />
              <Bar className="h-3 w-20" />
            </div>
          </div>
          <Bar className="mt-3 h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

const CARD_CLASS = 'rounded-2xl border border-zinc-200/80 bg-white/88 shadow-sm dark:border-zinc-800 dark:bg-card/82';
const PANEL_TITLE_CLASS = 'flex min-h-11 items-center text-lg font-bold text-gray-900 dark:text-white';
// 두 보조 카드(인기 응원글 · 메이트)가 같은 자리를 씁니다.
const PANEL_SECTION_CLASS = 'w-[86vw] shrink-0 space-y-3 sm:w-[420px] lg:col-span-4 lg:w-auto';
const PANEL_CARD_CLASS = `${CARD_CLASS} min-h-[238px] p-3 lg:h-[650px] lg:p-4`;

/** 보조 패널 전체 골격 — 지연 마운트 전과 lazy chunk 로딩 중에 같은 자리를 지킵니다. */
export default function HomeSecondaryPanelsSkeleton() {
  return (
    <div
      aria-label="홈 보조 패널"
      aria-busy="true"
      className="space-y-4 rounded-3xl border border-zinc-200/70 bg-white/55 p-3 shadow-sm dark:border-zinc-800 dark:bg-card/35 sm:p-4"
      data-priority="secondary"
      data-testid="home-secondary-panels-skeleton"
    >
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <p className="text-12 font-black uppercase tracking-[0.14em] text-zinc-400 dark:text-white">
            Support Panels
          </p>
          <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
            순위 · 인기글 · 메이트
          </h2>
        </div>
      </div>
      <div className="space-y-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:space-y-0">
        <section className="w-full space-y-3 lg:order-3 lg:col-span-4">
          <h3 className={PANEL_TITLE_CLASS}>팀 순위</h3>
          <div className={`overflow-hidden ${CARD_CLASS} lg:h-[650px]`}>
            <RankingRowsSkeleton />
          </div>
        </section>
        <div className="-mx-4 overflow-hidden px-4 pb-2 lg:contents lg:mx-0 lg:px-0 lg:pb-0">
          <div className="flex gap-4 lg:contents">
            <section className={`${PANEL_SECTION_CLASS} lg:order-1`}>
              <h3 className={PANEL_TITLE_CLASS}>실시간 인기 응원글</h3>
              <div className={PANEL_CARD_CLASS}>
                <HotCheerSkeleton />
              </div>
            </section>
            <section className={`${PANEL_SECTION_CLASS} lg:order-2`}>
              <h3 className={PANEL_TITLE_CLASS}>직관 메이트 찾기</h3>
              <div className={PANEL_CARD_CLASS}>
                <FeaturedMateSkeleton />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
