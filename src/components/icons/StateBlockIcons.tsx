import type { SVGProps } from 'react';

// StateBlock 전용 — 공지 · 홈 · 예측처럼 PublicFeatureIcons 를 끌어오면 안 되는 청크에서도 쓰입니다.
type StateBlockIconProps = SVGProps<SVGSVGElement>;

function StateBlockSvgIcon({ children, ...props }: StateBlockIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function StateAlertCircleIcon(props: StateBlockIconProps) {
  return (
    <StateBlockSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </StateBlockSvgIcon>
  );
}

export function StateRefreshIcon(props: StateBlockIconProps) {
  return (
    <StateBlockSvgIcon {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </StateBlockSvgIcon>
  );
}
