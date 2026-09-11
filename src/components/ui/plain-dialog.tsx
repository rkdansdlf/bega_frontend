import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './plain-button';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

interface PlainDialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  contentTestId?: string;
  placement?: 'center' | 'bottom' | 'right';
  initialFocus?: 'container' | 'first';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
  hideCloseButton?: boolean;
  hideHeader?: boolean;
}

export default function PlainDialog({
  open,
  onClose,
  title,
  description,
  ariaLabel,
  contentTestId,
  placement = 'center',
  initialFocus = 'first',
  children,
  footer,
  className,
  bodyClassName,
  bodyStyle,
  hideCloseButton = false,
  hideHeader = false,
}: PlainDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const resolvedAriaLabel = ariaLabel
    || (typeof title === 'string' && title.trim() ? title : '대화상자');

  useFocusTrap(dialogRef, { active: open, initialFocus });

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] h-dvh overflow-hidden">
      {placement === 'right' ? (
        <style>{'@keyframes plainDialogSlideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}'}</style>
      ) : null}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        className={
          placement === 'bottom'
            ? 'absolute inset-0 flex items-end justify-center'
            : placement === 'right'
              ? 'absolute inset-0 flex items-stretch justify-end'
              : 'absolute inset-0 flex items-center justify-center p-4'
        }
        style={placement === 'center' ? { padding: 16 } : undefined}
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby={title && !hideHeader ? titleId : undefined}
          aria-label={!title || hideHeader ? resolvedAriaLabel : undefined}
          aria-describedby={description && !hideHeader ? descriptionId : undefined}
          data-testid={contentTestId}
          onClick={(event) => event.stopPropagation()}
          className={joinClassNames(
            placement === 'right'
              ? 'flex h-dvh w-full min-w-0 max-w-[640px] flex-col overflow-hidden border-l bg-white shadow-dialog ring-1 ring-black/5 motion-safe:animate-[plainDialogSlideInRight_0.22s_ease-out] dark:border-border dark:bg-card'
              : placement === 'bottom'
                ? 'flex max-h-[calc(100dvh-1rem)] w-full min-w-0 flex-col overflow-hidden rounded-t-2xl border bg-white shadow-dialog ring-1 ring-black/5 dark:border-border dark:bg-card'
                : 'flex max-h-[calc(100dvh-2rem)] w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-white shadow-dialog ring-1 ring-black/5 dark:border-border dark:bg-card',
            className,
          )}
          style={placement === 'center' ? { maxHeight: 'calc(100dvh - 32px)' } : undefined}
        >
          {!hideHeader && (title || !hideCloseButton) && (
            <div
              className="relative flex max-h-[35dvh] shrink-0 items-start justify-between gap-3 overflow-hidden border-b border-gray-100 px-5 py-4 dark:border-border"
              style={{ gap: 12, paddingLeft: 20, paddingRight: 20, paddingTop: 16, paddingBottom: 16 }}
            >
              <div
                className="min-h-0 max-h-[calc(35dvh-2rem)] min-w-0 flex-1 overflow-y-auto overscroll-contain"
                style={{ maxHeight: 'calc(35dvh - 32px)', paddingRight: 44 }}
              >
                {title ? (
                  <h2 id={titleId} className="break-keep text-lg font-semibold text-gray-900 dark:text-white" style={{ overflowWrap: 'break-word' }}>
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p id={descriptionId} className="mt-1 break-keep text-15 text-gray-600 dark:text-white" style={{ overflowWrap: 'break-word' }}>
                    {description}
                  </p>
                ) : null}
              </div>
              {!hideCloseButton && (
                <Button
                  type="button"
                  aria-label="닫기"
                  variant="ghost"
                  size="iconTouch"
                  className="absolute right-5 top-4 shrink-0 p-0 text-gray-400 hover:text-gray-500"
                  onClick={onClose}
                >
                  <span className="text-xl font-semibold leading-none" aria-hidden="true">×</span>
                </Button>
              )}
            </div>
          )}
          <div
            className={joinClassNames(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain',
              placement === 'right' ? '' : 'p-5',
              bodyClassName,
            )}
            style={{ ...(placement === 'right' ? {} : { padding: 20 }), ...bodyStyle }}
          >
            {children}
          </div>
          {footer ? (
            <div className={joinClassNames(
              'flex max-h-[45dvh] shrink-0 flex-col-reverse gap-2 overflow-y-auto overscroll-contain border-t border-gray-100 px-5 dark:border-border sm:flex-row sm:justify-end',
              placement === 'bottom'
                ? 'pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'
                : 'py-4',
            )}
            style={placement === 'bottom'
              ? {
                gap: 8,
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 16,
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
              }
              : {
                gap: 8,
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 16,
                paddingBottom: 16,
              }}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
