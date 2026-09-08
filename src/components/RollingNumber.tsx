import { useEffect, useRef, useState } from 'react';

interface RollingNumberTransitionPreview {
  from: number;
  progress: number;
}

interface RollingNumberProps {
  value: number;
  transitionPreview?: RollingNumberTransitionPreview;
}

type RollDirection = 'up' | 'down';

export default function RollingNumber({ value, transitionPreview }: RollingNumberProps) {
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [direction, setDirection] = useState<RollDirection>('up');
  const lastValueRef = useRef(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === lastValueRef.current) return;

    setDirection(value > lastValueRef.current ? 'up' : 'down');
    setPreviousValue(lastValueRef.current);
    lastValueRef.current = value;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setPreviousValue(null);
    }, 300);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const renderedPreviousValue = transitionPreview?.from ?? previousValue;
  const renderedDirection: RollDirection = transitionPreview
    ? (value >= transitionPreview.from ? 'up' : 'down')
    : direction;
  const isTransitioning = renderedPreviousValue !== null;
  const previewProgress = transitionPreview
    ? Math.min(1, Math.max(0, transitionPreview.progress))
    : null;
  const incomingClass = renderedDirection === 'up'
    ? 'animate-roll-in-up'
    : 'animate-roll-in-down';
  const outgoingClass = renderedDirection === 'up'
    ? 'animate-roll-out-up'
    : 'animate-roll-out-down';
  const widestValue = renderedPreviousValue !== null
    && String(renderedPreviousValue).length > String(value).length
    ? renderedPreviousValue
    : value;
  const outgoingStyle = previewProgress === null ? undefined : {
    transform: `translateY(${renderedDirection === 'up' ? -12 * previewProgress : 12 * previewProgress}px)`,
    opacity: 1 - previewProgress,
  };
  const incomingStyle = previewProgress === null ? undefined : {
    transform: `translateY(${renderedDirection === 'up' ? 12 * (1 - previewProgress) : -12 * (1 - previewProgress)}px)`,
    opacity: previewProgress,
  };

  return (
    <div
      className="relative inline-grid min-h-[1.5em] max-w-full min-w-[1.125em] break-all overflow-hidden text-center text-body font-semibold leading-[1.5em] tabular-nums"
      data-rolling-direction={isTransitioning ? renderedDirection : undefined}
      data-rolling-transitioning={String(isTransitioning)}
      data-testid="rolling-number"
    >
      {isTransitioning && (
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 block"
          data-testid="rolling-number-width-sizer"
        >
          {widestValue}
        </span>
      )}
      {renderedPreviousValue !== null && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 block motion-reduce:hidden ${outgoingClass}`}
          data-testid="rolling-number-previous"
          style={outgoingStyle}
        >
          {renderedPreviousValue}
        </span>
      )}
      <span
        className={`${isTransitioning ? `absolute inset-0 ${incomingClass}` : 'block'} motion-reduce:animate-none`}
        data-testid="rolling-number-current"
        style={incomingStyle}
      >
        {value}
      </span>
    </div>
  );
}
