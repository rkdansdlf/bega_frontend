import { AnimatedNumber } from './AnimatedNumber';

const adminFieldLabelClassName =
  'text-caption font-semibold text-slate-400';

export function StatCard({
  animate = true,
  icon: Icon,
  label,
  testId,
  value,
  color,
  visualQaDisplayValueOverride,
}: {
  animate?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testId?: string;
  value: number;
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
        p-6 shadow-lg
        transition-[border-color,box-shadow] duration-150 hover:shadow-xl
      `}
    >
      <div className="relative flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p data-testid="admin-stat-label" title={label} className={`mb-2 min-w-0 line-clamp-3 [overflow-wrap:anywhere] ${adminFieldLabelClassName}`}>
            {label}
          </p>
          <p className={`break-all text-lg font-black ${classes.text} tracking-tight sm:text-3xl`}>
            {animate
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
