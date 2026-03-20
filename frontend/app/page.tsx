"use client";

import Link from "next/link";
import { useBooking } from "@/contexts/BookingContext";

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

export default function HomePage() {
  const { slots, slotsLoading, slotsError, refreshSlots } = useBooking();

  if (slotsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink">
            Available visits
          </h1>
          <p className="text-ink/60 mt-2">
            Loading appointment slots…
          </p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white/50 animate-pulse border border-black/5"
            />
          ))}
        </div>
      </div>
    );
  }

  if (slotsError) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-8 text-center">
        <p className="text-danger font-medium">{slotsError}</p>
        <button
          type="button"
          onClick={() => refreshSlots()}
          className="mt-4 px-5 py-2.5 rounded-xl bg-clinic text-white text-sm font-semibold hover:bg-clinic/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="font-display text-3xl font-bold text-ink">
          No slots yet
        </h1>
        <p className="text-ink/55 mt-3 max-w-md mx-auto">
          An administrator can create visit slots from the admin page. Check
          back soon.
        </p>
        <Link
          href="/admin"
          className="inline-block mt-8 px-6 py-3 rounded-xl bg-clinic text-white font-semibold hover:bg-clinic/90"
        >
          Go to admin
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink">
            Available visits
          </h1>
          <p className="text-ink/60 mt-2">
            Pick a time. Seats update in real time while you browse.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshSlots()}
          className="text-sm font-semibold text-clinic hover:underline self-start sm:self-auto"
        >
          Refresh list
        </button>
      </div>

      <ul className="grid gap-4">
        {slots.map((s) => (
          <li key={s.id}>
            <Link
              href={`/booking/${s.id}`}
              className="group block rounded-2xl border border-black/8 bg-white p-6 shadow-sm hover:shadow-md hover:border-clinic/25 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-bold text-ink group-hover:text-clinic transition-colors">
                    {s.doctorName}
                  </p>
                  <p className="text-ink/55 mt-1">{formatSlotTime(s.startTime)}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-ink/40">
                      Available
                    </p>
                    <p className="text-2xl font-bold text-clinic">
                      {s.availableCount}
                      <span className="text-base font-normal text-ink/40">
                        {" "}
                        / {s.totalSeats}
                      </span>
                    </p>
                  </div>
                  <span className="hidden sm:inline text-clinic font-semibold group-hover:translate-x-1 transition-transform">
                    Book →
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
