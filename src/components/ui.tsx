"use client";

import { AlertTriangle, ImageOff, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type Variant = "primary" | "outline" | "ghost" | "danger";
export function Button({
  variant = "primary", loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: "bg-signal text-ink-950 hover:bg-[#ff8d3a] font-semibold",
    outline: "border border-ink-500 text-steel-100 hover:bg-ink-700",
    ghost: "text-steel-200 hover:bg-ink-700",
    danger: "border border-red-500/50 text-red-300 hover:bg-red-500/10",
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50", styles[variant], className)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={cx("rounded-card border border-ink-600 bg-ink-800 p-5", className)}>{children}</Tag>;
}

export function Badge({ children, color = "#9aa8bf", className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", className)}
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      {children}
    </span>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cx("skeleton", className)} aria-hidden />;

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-signal">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-steel-300">{subtitle}</p>}
        <div className="sleepers mt-4 h-1.5 w-40 rounded" aria-hidden />
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-ink-500 bg-ink-800/50 px-6 py-14 text-center">
      <div className="mb-4 rounded-full bg-ink-700 p-4 text-steel-300">{icon ?? <ImageOff className="h-7 w-7" aria-hidden />}</div>
      <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
      {children && <div className="mt-2 max-w-xl text-sm text-steel-300">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-4 rounded-card border border-red-500/40 bg-red-500/10 p-5">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold text-red-200">Something went wrong</p>
        <p className="mt-1 text-sm text-red-100/90">{error.message}</p>
        {onRetry && (
          <Button variant="outline" className="mt-3 !py-1.5" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export const DISCLAIMER =
  "AI predictions are decision-support only and are not a substitute for inspection by qualified railway safety personnel.";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cx("flex items-start gap-2 rounded-lg border border-signal/30 bg-signal-soft p-3 text-sm text-steel-100", className)}>
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
      <span>{DISCLAIMER}</span>
    </p>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-900/60 p-4">
      <p className="text-xs uppercase tracking-wider text-steel-400">{label}</p>
      <p className="tabular mt-1 font-display text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-steel-400">{hint}</p>}
    </div>
  );
}

export function SmokeBanner() {
  return (
    <div role="alert" className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-100">
      These artifacts come from a <strong>smoke test</strong> (random weights / synthetic data). The numbers are not real results.
      Re-run training with pretrained weights on your dataset.
    </div>
  );
}

export const chartTooltip = {
  contentStyle: { background: "#0b1324", border: "1px solid #2c4166", borderRadius: 10, color: "#e6ebf3", fontSize: 13 },
  labelStyle: { color: "#9aa8bf" },
  itemStyle: { color: "#e6ebf3" },
  cursor: { fill: "rgba(255,255,255,0.05)" },
};
export const axisProps = { stroke: "#7686a2", fontSize: 12, tickLine: false } as const;
