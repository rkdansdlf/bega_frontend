import type { ButtonHTMLAttributes } from 'react';

import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from '../../ui/button';

interface FallbackDesignSystemButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string;
  size?: string;
}

const toLocalVariant = (variant?: string): ButtonVariant | undefined => {
  switch (variant) {
    case 'destructive':
    case 'outline':
    case 'secondary':
    case 'ghost':
    case 'link':
    case 'brand':
    case 'brandOutline':
      return variant;
    case 'primary':
      return 'brand';
    default:
      return undefined;
  }
};

const toLocalSize = (size?: string): ButtonSize | undefined => {
  switch (size) {
    case 'default':
    case 'sm':
    case 'lg':
    case 'icon':
    case 'iconTouch':
    case 'touch':
    case 'touchLg':
      return size;
    case 'large':
      return 'lg';
    default:
      return undefined;
  }
};

export default function FallbackDesignSystemButton({
  className,
  variant,
  size,
  ...props
}: FallbackDesignSystemButtonProps) {
  return (
    <Button
      {...props}
      data-testid="mf-fallback-button"
      variant={toLocalVariant(variant)}
      size={toLocalSize(size)}
      className={`max-w-full [overflow-wrap:anywhere] active:scale-[0.98] motion-reduce:transform-none ${className ?? ''}`}
    />
  );
}
