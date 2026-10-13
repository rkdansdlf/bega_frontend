import * as React from "react";

import { cn } from "../../lib/utils";
import { buttonBaseClass, buttonVariantClasses, buttonSizeClasses } from "./button-styles";

export type ButtonVariant = keyof typeof buttonVariantClasses;
export type ButtonSize = keyof typeof buttonSizeClasses;

interface ButtonVariantsOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const buttonVariants = ({ variant = "default", size = "default", className }: ButtonVariantsOptions = {}) => {
  return cn(
    buttonBaseClass,
    buttonVariantClasses[variant],
    buttonSizeClasses[size],
    className,
  );
};

const mergeRefs = <T,>(...refs: Array<React.Ref<T> | undefined>) => {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) {
        return;
      }

      if (typeof ref === "function") {
        ref(node);
        return;
      }

      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
};

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    asChild?: boolean;
  }
>(({ className, variant, size, type = "button", asChild = false, children, ...props }, ref) => {
  const resolvedClassName = buttonVariants({ variant, size, className });

  if (asChild) {
    const child = React.Children.only(children);

    if (!React.isValidElement<{ className?: string }>(child)) {
      return null;
    }

    const childElement = child as React.ReactElement<any>;
    const childRef = (childElement as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref;

    return React.cloneElement(childElement, {
      ...props,
      "data-slot": "button",
      className: cn(resolvedClassName, childElement.props.className),
      ref: mergeRefs(childRef, ref as React.Ref<HTMLElement>),
    });
  }

  return (
    <button
      data-slot="button"
      className={resolvedClassName}
      ref={ref}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
