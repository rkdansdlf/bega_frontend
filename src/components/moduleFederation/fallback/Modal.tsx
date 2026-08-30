import type { ReactNode } from 'react';

import PlainDialog from '../../ui/plain-dialog';

interface FallbackDesignSystemModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
}

export default function FallbackDesignSystemModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  children,
}: FallbackDesignSystemModalProps) {
  const isVisible = Boolean(open ?? isOpen);
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
      return;
    }
    onClose?.();
  };

  return (
    <PlainDialog
      open={isVisible}
      onClose={handleClose}
      title={title}
      contentTestId="mf-fallback-modal"
      bodyClassName="[overflow-wrap:anywhere]"
    >
      {children}
    </PlainDialog>
  );
}
