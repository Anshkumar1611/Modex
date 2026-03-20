import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clinicMuted">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-ink/55 max-w-xl text-lg leading-relaxed">{description}</p>
        )}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-sm font-medium text-clinicMuted hover:text-clinic transition-colors"
    >
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft border border-line group-hover:border-clinic/20 group-hover:shadow-lift transition-all"
        aria-hidden
      >
        <svg
          className="w-4 h-4 -translate-x-px"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </span>
      {children}
    </Link>
  );
}
