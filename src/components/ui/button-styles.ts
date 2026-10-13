export const buttonBaseClass = "bf rounded-md text-15 font-semibold outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring aria-[invalid=true]:ring-destructive/20 dark:aria-[invalid=true]:ring-destructive/40 aria-[invalid=true]:border-destructive";

export const buttonVariantClasses = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
  outline: "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
  brand: "btn-brand",
  brandOutline: "btn-brand-outline",
} as const;

export const buttonSizeClasses = {
  default: "min-h-11 px-4 py-2 sm:min-h-9 has-[>svg]:px-3",
  sm: "min-h-11 gap-1.5 px-3 sm:min-h-8 has-[>svg]:px-2.5",
  lg: "min-h-11 px-6 sm:min-h-10 has-[>svg]:px-4",
  icon: "size-11 shrink-0 sm:size-9",
  iconTouch: "size-11 shrink-0 rounded-xl p-0",
  touch: "min-h-11 rounded-xl px-4 has-[>svg]:px-3",
  touchLg: "min-h-12 rounded-xl px-6 text-base has-[>svg]:px-4",
} as const;

export const buttonBaseClassFor = (
  variant: keyof typeof buttonVariantClasses,
  size: keyof typeof buttonSizeClasses,
) => {
  let base = buttonBaseClass;
  if (variant === 'destructive') base = base.replace('focus-visible:ring-ring/50 ', '');
  if (buttonSizeClasses[size].includes('rounded-xl')) base = base.replace('rounded-md ', '');
  if (size === 'touchLg') base = base.replace('text-15 ', '');
  return base;
};
