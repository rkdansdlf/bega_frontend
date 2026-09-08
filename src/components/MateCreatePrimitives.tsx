import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../lib/utils';

export function FieldLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<'label'>) {
  return (
    <label
      className={cn('block max-w-full min-w-0 break-words text-body font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere] dark:text-white', className)}
      {...props}
    />
  );
}
