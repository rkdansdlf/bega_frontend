import * as React from "react";

import { cn } from "../../lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col min-w-0 gap-4 overflow-hidden rounded-xl border sm:gap-6",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid min-w-0 auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-4 pt-4 sm:px-6 sm:pt-6 has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] [.border-b]:pb-4 sm:[.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn(
        "min-w-0 break-words [overflow-wrap:anywhere] leading-tight sm:leading-none",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-muted-foreground min-w-0 break-words [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-1 row-start-3 min-w-0 max-w-full break-words [overflow-wrap:anywhere] self-start justify-self-stretch sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "min-w-0 break-words [overflow-wrap:anywhere] px-4 sm:px-6 [&:last-child]:pb-4 sm:[&:last-child]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex flex-wrap items-center gap-2 min-w-0 break-words [overflow-wrap:anywhere] px-4 pb-4 sm:px-6 sm:pb-6 [.border-t]:pt-4 sm:[.border-t]:pt-6",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
