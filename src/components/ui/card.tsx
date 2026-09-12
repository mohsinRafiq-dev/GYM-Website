import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  glow,
  ...props
}: ComponentProps<"div"> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "card relative overflow-hidden",
        glow && "border-volt/40 shadow-[0_0_40px_-18px_var(--c-volt)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 p-4 pb-3", className)}>
      {/* The title keeps at least 12rem; a wide action wraps below instead of crushing it. */}
      <div className="flex min-w-0 flex-[1_1_12rem] items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel3 text-volt">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-4 pb-4", className)} {...props} />;
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}
