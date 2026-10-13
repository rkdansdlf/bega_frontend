export const buttonBaseClass = "bf font-semibold outline-none focus-visible:border-ring focus-visible:ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";

export const buttonVariantClasses = {
  default: "focus-visible:ring-ring/50 bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
  outline: "focus-visible:ring-ring/50 border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
  secondary: "focus-visible:ring-ring/50 bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "focus-visible:ring-ring/50 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "focus-visible:ring-ring/50 text-primary underline-offset-4 hover:underline",
  brand: "focus-visible:ring-ring/50 btn-brand",
  brandOutline: "focus-visible:ring-ring/50 btn-brand-outline",
} as const;

export const buttonSizeClasses = {
  default: "rounded-md text-15 min-h-11 px-4 py-2 sm:min-h-9 has-[>svg]:px-3",
  sm: "rounded-md text-15 min-h-11 gap-1.5 px-3 sm:min-h-8 has-[>svg]:px-2.5",
  lg: "rounded-md text-15 min-h-11 px-6 sm:min-h-10 has-[>svg]:px-4",
  icon: "rounded-md text-15 size-11 shrink-0 sm:size-9",
  iconTouch: "text-15 size-11 shrink-0 rounded-xl p-0",
  touch: "text-15 min-h-11 rounded-xl px-4 has-[>svg]:px-3",
  touchLg: "min-h-12 rounded-xl px-6 text-base has-[>svg]:px-4",
} as const;
