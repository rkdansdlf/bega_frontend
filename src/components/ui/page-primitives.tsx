"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

type Measure = "default" | "narrow";
type Align = "start" | "center";
type Gap = "sm" | "md" | "lg" | "xl";

const measureClasses: Record<Measure, string> = {
  default: "ds-measure",
  narrow: "ds-measure-narrow",
};

const alignClasses: Record<Align, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
};

const stackGapClasses: Record<Gap, string> = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
  xl: "gap-12",
};

function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="container"
      className={cn("ds-container min-w-0 max-w-full [overflow-wrap:anywhere]", className)}
      {...props}
    />
  );
}

function Section({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="section"
      className={cn("ds-section min-w-0 max-w-full [overflow-wrap:anywhere]", className)}
      {...props}
    />
  );
}

interface TextBlockProps extends React.ComponentProps<"div"> {
  measure?: Measure;
  align?: Align;
}

function TextBlock({
  className,
  measure = "default",
  align = "start",
  ...props
}: TextBlockProps) {
  return (
    <div
      data-slot="text-block"
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-4 [overflow-wrap:anywhere]",
        measureClasses[measure],
        alignClasses[align],
        className,
      )}
      {...props}
    />
  );
}

interface StackProps extends React.ComponentProps<"div"> {
  gap?: Gap;
}

function Stack({ className, gap = "md", ...props }: StackProps) {
  return (
    <div
      data-slot="stack"
      className={cn("flex min-w-0 max-w-full flex-col", stackGapClasses[gap], className)}
      {...props}
    />
  );
}

interface SectionHeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: Align;
  measure?: Measure;
}

function SectionHeader({
  className,
  title,
  description,
  align = "center",
  measure = "default",
  ...props
}: SectionHeaderProps) {
  return (
    <header
      data-slot="section-header"
      className={cn(
        "mx-auto mb-8 flex min-w-0 max-w-full flex-col sm:mb-12",
        alignClasses[align],
        className,
      )}
      {...props}
    >
      <Stack gap="sm" className={cn(align === "center" && "items-center", align === "start" && "items-start")}>
        <TextBlock measure={measure} align={align}>
          <h2 className="ds-section-title break-words [overflow-wrap:anywhere]">{title}</h2>
          {description ? (
            <p className="ds-section-copy break-words [overflow-wrap:anywhere]">{description}</p>
          ) : null}
        </TextBlock>
      </Stack>
    </header>
  );
}

interface CTAGroupProps extends React.ComponentProps<"div"> {
  align?: Align;
}

function CTAGroup({ className, align = "start", ...props }: CTAGroupProps) {
  return (
    <div
      data-slot="cta-group"
      className={cn(
        "flex min-w-0 w-full flex-col gap-3 sm:w-auto sm:max-w-full sm:flex-row sm:flex-wrap",
        align === "center" ? "justify-center" : "justify-start",
        className,
      )}
      {...props}
    />
  );
}

function MockupFrame({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="mockup-frame"
      className={cn(
        "landing-hero-panel min-w-0 max-w-full overflow-hidden [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

export {
  Container,
  Section,
  SectionHeader,
  TextBlock,
  Stack,
  CTAGroup,
  MockupFrame,
};
