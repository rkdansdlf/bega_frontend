import { useState, useEffect } from 'react';

const normalizeAnimatedNumberValue = (value: number) => (
  Number.isFinite(value) ? Math.floor(value) : 0
);

export function AnimatedNumber({
  value,
  duration = 1000,
  testId,
  visualQaDisplayValueOverride: requestedVisualQaDisplayValueOverride,
}: {
  value: number;
  duration?: number;
  testId?: string;
  visualQaDisplayValueOverride?: number;
}) {
  const normalizedValue = normalizeAnimatedNumberValue(value);
  const normalizedDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const visualQaDisplayValueOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaDisplayValueOverride;
  const hasVisualQaDisplayValue = Number.isFinite(visualQaDisplayValueOverride);
  const resolvedVisualQaDisplayValue = normalizeAnimatedNumberValue(visualQaDisplayValueOverride ?? 0);
  const [displayValue, setDisplayValue] = useState(
    hasVisualQaDisplayValue
      ? resolvedVisualQaDisplayValue
      : normalizedDuration === 0
        ? normalizedValue
        : 0,
  );

  useEffect(() => {
    if (hasVisualQaDisplayValue) {
      setDisplayValue(resolvedVisualQaDisplayValue);
      return undefined;
    }

    if (normalizedDuration === 0) {
      setDisplayValue(normalizedValue);
      return undefined;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / normalizedDuration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * normalizedValue));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasVisualQaDisplayValue, normalizedDuration, normalizedValue, resolvedVisualQaDisplayValue]);

  return (
    <span
      data-testid={testId}
      className="inline-block min-w-0 max-w-full [overflow-wrap:anywhere]"
    >
      {displayValue.toLocaleString('ko-KR')}
    </span>
  );
}
