import type { HTMLAttributes } from 'react';

import { getSectionColor } from './offseasonListUtils';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export function OffseasonPill({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={joinClassNames(
        'inline-flex min-w-0 max-w-full items-center justify-center whitespace-normal break-words rounded-full text-center [overflow-wrap:anywhere]',
        className,
      )}
      {...props}
    />
  );
}

export function OffseasonSectionPill({
  section,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { section: string }) {
  return (
    <OffseasonPill
      className={joinClassNames(
        'px-3 py-1 text-caption font-black uppercase tracking-wide',
        getSectionColor(section),
        className,
      )}
      {...props}
    >
      {section}
    </OffseasonPill>
  );
}
