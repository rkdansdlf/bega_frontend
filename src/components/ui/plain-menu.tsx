import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PlainMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  role?: 'menu' | 'dialog';
}

export default function PlainMenu({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'end',
  ariaLabel,
  className,
  panelClassName,
  role = 'menu',
}: PlainMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={containerRef} className={cn('relative min-w-0 max-w-full', className)}>
      {trigger}
      {open ? (
        <div
          role={role}
          aria-label={ariaLabel}
          className={cn(
            'absolute top-full z-[95] mt-2 max-h-[min(70dvh,32rem)] max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 [overflow-wrap:anywhere] dark:border-border dark:bg-card',
            align === 'start' ? 'left-0' : 'right-0',
            panelClassName,
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
