import type * as React from "react";
import { cn } from "@/lib/utils";

export function Pane({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white",
        className,
      )}
      {...props}
    />
  );
}

export function PaneHeader({
  actions,
  children,
  className,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold leading-tight text-slate-950">
          {title}
        </div>
        {eyebrow ? (
          <div className="mt-0.5 truncate text-[11px] font-medium leading-tight text-slate-500">
            {eyebrow}
          </div>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}

export function Toolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-9 items-center gap-2 border-b border-slate-200 bg-white px-2 py-1",
        className,
      )}
      {...props}
    />
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full items-center rounded-full border px-2 text-[11px] font-semibold",
        tone === "neutral" && "border-slate-200 bg-slate-100 text-slate-600",
        tone === "ok" && "border-teal-200 bg-teal-50 text-teal-700",
        tone === "warn" && "border-rose-200 bg-rose-50 text-rose-700",
        tone === "accent" && "border-orange-200 bg-orange-50 text-orange-700",
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export function EmptyState({
  children,
  title,
}: {
  children?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <div className="m-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm">
      <div className="font-medium text-slate-900">{title}</div>
      {children ? <div className="mt-1 text-xs leading-5 text-slate-500">{children}</div> : null}
    </div>
  );
}

export function SidebarItem({
  active,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "grid w-full grid-cols-[2rem_minmax(0,1fr)] gap-x-2 rounded-md border px-2 py-2 text-left transition-colors",
        "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35",
        active && "border-teal-300 bg-teal-50 text-slate-950 shadow-[inset_2px_0_0_#0d9488]",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
