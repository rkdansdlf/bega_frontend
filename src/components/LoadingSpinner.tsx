import { useEffect, useState } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  message?: string;
  subMessage?: string;
  variant?: 'app' | 'auth' | 'inline';
  fullScreen?: boolean;
  minDurationMs?: number;
  showTagline?: boolean;
  className?: string;
}

type SpinnerSizeMap = Record<NonNullable<LoadingSpinnerProps['size']>, string>;

const sizeClasses: SpinnerSizeMap = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const sizeRingClasses: SpinnerSizeMap = {
  sm: 'h-14 w-14',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
};

export default function LoadingSpinner({
  size = 'lg',
  text,
  message,
  subMessage,
  variant,
  fullScreen = true,
  minDurationMs = 0,
  showTagline = true,
  className = '',
}: LoadingSpinnerProps) {
  const [readyToShow, setReadyToShow] = useState(minDurationMs <= 0);
  const resolvedMessage = message ?? text ?? '로딩 중...';
  const resolvedVariant = variant ?? 'inline';

  useEffect(() => {
    if (minDurationMs <= 0) {
      if (!readyToShow) {
        setReadyToShow(true);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setReadyToShow(true);
    }, minDurationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [minDurationMs]);

  if (!readyToShow) return null;

  if (resolvedVariant === 'inline') {
    return (
      <div
        className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen bg-background' : 'py-12'} ${className}`}
      >
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full border-b-2 border-primary motion-reduce:animate-none ${sizeClasses[size]}`} />
          {resolvedMessage && (
            <p className="mt-4 min-w-0 max-w-full text-muted-foreground font-semibold text-lg [overflow-wrap:anywhere]">
              {resolvedMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative min-h-screen w-full overflow-x-clip bg-background ${className} flex items-center justify-center px-3 py-12 sm:px-6`}
    >
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        {/* 상단 장식용 막대 */}
        <div className="mx-auto mb-5 h-2 w-12 rounded-full bg-muted/40" />

        {/* 스피너 영역 */}
        <div className={`mx-auto mb-6 relative flex items-center justify-center ${sizeRingClasses[size]}`}>
          {/* 1. 은은한 배경 트랙 링 */}
          <div className="absolute inset-0 rounded-full border-4 border-muted/20" />

          {/* 2. 회전하는 메인 스피너 (상단과 우측에만 색상을 주어 세련되게 회전) */}
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-r-primary/70 border-t-primary motion-reduce:animate-none" />

          {/* 3. 중앙에서 맥박 뛰는 포인트 (크기를 sizeClasses에 맞게 유동적으로 적용) */}
          <div className={`flex animate-pulse items-center justify-center rounded-full bg-primary/20 motion-reduce:animate-none ${sizeClasses[size]}`}>
            <div className="h-1/3 w-1/3 rounded-full bg-primary" />
          </div>
        </div>
        <p className="mb-2 min-w-0 max-w-full break-keep text-base font-semibold text-foreground [overflow-wrap:anywhere] sm:text-lg">
          {resolvedMessage}
        </p>
        {showTagline && subMessage && (
          <p className="min-w-0 max-w-full break-keep text-body text-muted-foreground [overflow-wrap:anywhere]">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
}
