"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/shell";
import { SlotCard } from "@/components/slots/slot-card";
import { useBooking } from "@/contexts/BookingContext";

export default function HomePage() {
  const { slots, slotsLoading, slotsError, refreshSlots } = useBooking();

  if (slotsLoading) {
    return (
      <div className="space-y-10">
        <div className="space-y-3 animate-fade-up">
          <div className="h-4 w-24 rounded-full bg-ink/10 animate-shimmer" />
          <div className="h-12 w-2/3 max-w-md rounded-2xl bg-ink/8 animate-shimmer" />
          <div className="h-5 w-1/2 max-w-sm rounded-lg bg-ink/6 animate-shimmer" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-3xl bg-white/60 border border-line shadow-soft animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (slotsError) {
    return (
      <div className="max-w-lg mx-auto rounded-3xl border border-danger/20 bg-white p-10 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-danger text-2xl">
          !
        </div>
        <p className="text-danger font-semibold">{slotsError}</p>
        <button
          type="button"
          onClick={() => refreshSlots()}
          className="mt-6 px-6 py-3 rounded-full bg-clinic text-white text-sm font-semibold shadow-soft hover:shadow-lift hover:bg-clinic/95 transition-all"
        >
          Try again
        </button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 sm:py-24 animate-fade-up">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-clinicLight text-clinic text-4xl shadow-soft">
          ◎
        </div>
        <h1 className="font-display text-3xl font-bold text-ink">No visits yet</h1>
        <p className="text-ink/50 mt-4 leading-relaxed">
          Create a slot from the admin panel to open this schedule to patients.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center mt-10 px-8 py-3.5 rounded-full bg-ink text-white font-semibold text-sm shadow-lift hover:bg-ink/90 transition-colors"
        >
          Open admin
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <PageHeader
        eyebrow="Schedule"
        title="Book a visit"
        description="Choose a doctor and time. Availability updates live—no double booking."
        action={
          <button
            type="button"
            onClick={() => refreshSlots()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-clinic bg-clinicLight/80 border border-clinic/15 hover:bg-clinicLight transition-colors shadow-soft"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        }
      />

      <ul className="grid gap-4 sm:gap-5">
        {slots.map((s, i) => (
          <SlotCard key={s.id} slot={s} index={i} />
        ))}
      </ul>
    </div>
  );
}
