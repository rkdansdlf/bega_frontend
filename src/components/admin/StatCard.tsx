import { AnimatedNumber } from './AnimatedNumber';

const adminFieldLabelClassName =
  'text-caption font-semibold text-slate-400';

export function StatCard({
  animate = true,
  icon: Icon,
  label,
  testId,
  value,
  unavailableState = 'loading',
  color,
  visualQaDisplayValueOverride,
}: {
  animate?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testId?: string;
  value: number | undefined;
  unavailableState?: 'loading' | 'error';
  color: 'amber' | 'emerald' | 'sky';
  visualQaDisplayValueOverride?: number;
}) {
  const colorClasses = {
    amber: {
      border: 'border-amber-500/30',
      surface: 'bg-amber-500/10',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    },
    emerald: {
      border: 'border-emerald-500/30',
      surface: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      text: 'text-emerald-300',
    },
    sky: {
      border: 'border-sky-500/30',
      surface: 'bg-sky-500/10',
      icon: 'text-sky-400',
      text: 'text-sky-300',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      data-testid={testId}
      className={`
        relative overflow-hidden rounded-xl border ${classes.border}
        ${classes.surface}
        p-3 shadow-lg sm:p-6
        transition-[border-color,box-shadow] duration-150 hover:shadow-xl
      `}
    >
      <div className="relative flex min-w-0 flex-col-reverse items-start justify-between gap-3 sm:flex-row">
        <div className="w-full min-w-0 flex-1 sm:w-auto">
          <p data-testid="admin-stat-label" title={label} className={`mb-2 min-w-0 line-clamp-3 [overflow-wrap:anywhere] ${adminFieldLabelClassName}`}>
            {label}
          </p>
          {value === undefined && (
            <p role="status" data-testid="admin-stat-state" className="min-w-0 break-keep text-caption text-slate-400 [overflow-wrap:anywhere]">
              {unavailableState === 'error' ? '통계 조회 실패' : '통계 로딩 중'}
            </p>
          )}
          <p data-testid="admin-stat-value" className={`break-all text-lg font-black ${classes.text} tracking-tight sm:text-3xl`}>
            {value === undefined ? '—' : animate
              ? <AnimatedNumber value={value} visualQaDisplayValueOverride={visualQaDisplayValueOverride} />
              : value.toLocaleString()}
          </p>
        </div>
        <div className={`shrink-0 rounded-xl bg-slate-800/50 p-3 ${classes.icon}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
}
