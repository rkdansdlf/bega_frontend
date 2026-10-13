import { lazy, Suspense, type ReactNode } from 'react';

const DiaryformRuntime = lazy(() => import('./DiaryformRuntime'));

const diaryViewFallback = (
  <div className="rounded-2xl bg-primary p-6 text-center text-body text-primary-foreground md:rounded-3xl md:p-8">
    직관 기록을 불러오는 중입니다.
  </div>
);

export interface DiaryViewSectionProps {
  initialDate?: string;
  onBackToLog?: () => void;
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function DiaryViewSection({
  initialDate,
  onBackToLog,
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride,
}: DiaryViewSectionProps) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  if (visualQaPhase === 'fallback') {
    return diaryViewFallback;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  return (
    <Suspense fallback={diaryViewFallback}>
      <DiaryformRuntime initialDate={initialDate} onBackToLog={onBackToLog} />
    </Suspense>
  );
}
