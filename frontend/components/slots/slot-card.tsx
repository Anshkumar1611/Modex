"use client";

import Link from "next/link";
import type { SlotSummary } from "@/lib/types";

function formatSlotTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clinic/40 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-clinic" />
    </span>
  );
}

type SlotCardProps = {
  slot: SlotSummary;
  index: number;
};

export function SlotCard({ slot: s, index }: SlotCardProps) {
  const pct =
    s.totalSeats > 0 ? Math.round((s.availableCount / s.totalSeats) * 100) : 0;

  return (
    <li
      className="animate-fade-up opacity-0 [animation-fill-mode:forwards]"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <Link
        href={`/booking/${s.id}`}
        className="group relative flex flex-col sm:flex-row sm:items-stretch gap-5 rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-soft hover:shadow-lift hover:border-clinic/20 transition-all duration-300 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-clinicLight/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="flex-1 min-w-0 relative">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-clinicLight text-clinic font-display font-bold text-sm">
              {s.doctorName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div>
              <p className="font-display text-xl font-bold text-ink group-hover:text-clinic transition-colors">
                {s.doctorName}
              </p>
              <p className="text-ink/50 mt-1 flex items-center gap-2 text-sm">
                <svg
                  className="w-4 h-4 text-clinicMuted shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {formatSlotTime(s.startTime)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-4 sm:min-w-[200px] relative border-t sm:border-t-0 sm:border-l border-line pt-4 sm:pt-0 sm:pl-6 sm:justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-clinicMuted uppercase tracking-wider">
            <PulseDot />
            Live
          </div>
          <div className="text-right w-full sm:w-auto">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/35">
              Seats open
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-clinic tabular-nums">
              {s.availableCount}
              <span className="text-lg font-semibold text-ink/30">/{s.totalSeats}</span>
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-ink/8 overflow-hidden max-w-[140px] sm:ml-auto">
              <div
                className="h-full rounded-full bg-gradient-to-r from-clinic to-clinicMuted transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-clinic group-hover:gap-2 transition-all">
            Select seat
            <span aria-hidden>→</span>
          </span>
        </div>
      </Link>
    </li>
  );
}
