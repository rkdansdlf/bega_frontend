import type { ReactNode, SVGProps } from 'react';

type LandingIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function LandingSvgIcon({
  size = 24,
  children,
  ...props
}: LandingIconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function LandingArrowRightIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </LandingSvgIcon>
  );
}

export function LandingBellIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </LandingSvgIcon>
  );
}

export function LandingBookOpenIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H3Z" />
      <path d="M21 18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h5Z" />
    </LandingSvgIcon>
  );
}

export function LandingChevronDownIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </LandingSvgIcon>
  );
}

export function LandingChevronLeftIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </LandingSvgIcon>
  );
}

export function LandingChevronRightIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </LandingSvgIcon>
  );
}

export function LandingSearchIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </LandingSvgIcon>
  );
}

export function LandingClockIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </LandingSvgIcon>
  );
}

export function LandingRefreshIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </LandingSvgIcon>
  );
}

export function LandingEditIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </LandingSvgIcon>
  );
}

export function LandingPlusIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M5 12h14M12 5v14" />
    </LandingSvgIcon>
  );
}

export function LandingMessageSquareIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </LandingSvgIcon>
  );
}

export function LandingCalendarIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M8 2v4M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </LandingSvgIcon>
  );
}

export function LandingHeartIcon({ filled, ...props }: LandingIconProps & { filled?: boolean }) {
  return (
    <LandingSvgIcon fill={filled ? 'currentColor' : 'none'} {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </LandingSvgIcon>
  );
}

export function LandingMessageCircleIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </LandingSvgIcon>
  );
}

export function LandingHomeIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22V12h6v10" />
    </LandingSvgIcon>
  );
}

export function LandingLineChartIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </LandingSvgIcon>
  );
}

export function LandingMapPinIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </LandingSvgIcon>
  );
}

export function LandingMegaphoneIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="m3 11 18-5v12L3 14v-3Z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </LandingSvgIcon>
  );
}

export function LandingUsersIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </LandingSvgIcon>
  );
}

export function LandingXIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </LandingSvgIcon>
  );
}
