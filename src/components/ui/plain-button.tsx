import * as React from 'react';
import { buttonBaseClassFor, buttonVariantClasses, buttonSizeClasses } from './button-styles';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
type ButtonSize = 'default' | 'sm' | 'icon' | 'iconTouch' | 'touch';

interface PlainButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const mergeRefs = <T,>(...refs: Array<React.Ref<T> | undefined>) => {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) {
        return;
      }

      if (typeof ref === 'function') {
        ref(node);
        return;
      }

      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
};

const Button = React.forwardRef<HTMLButtonElement, PlainButtonProps>(({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  asChild = false,
  children,
  ...props
}, ref) => {
  const resolvedClassName = joinClassNames(
    buttonBaseClassFor(variant, size),
    buttonVariantClasses[variant],
    buttonSizeClasses[size],
    className,
  );

  if (asChild) {
    const child = React.Children.only(children);

    if (!React.isValidElement<{ className?: string }>(child)) {
      return null;
    }

    const childElement = child as React.ReactElement<any>;
    const childRef = (childElement as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref;

    return React.cloneElement(childElement, {
      ...props,
      className: joinClassNames(resolvedClassName, childElement.props.className),
      ref: mergeRefs(childRef, ref as React.Ref<HTMLElement>),
    });
  }

  return (
    <button
      data-slot="plain-button"
      className={resolvedClassName}
      ref={ref}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
