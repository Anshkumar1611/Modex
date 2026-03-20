"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackLink, PageHeader } from "@/components/layout/shell";
import { SeatButton } from "@/components/booking/seat-button";
import { useBooking } from "@/contexts/BookingContext";
import { api } from "@/lib/api";
import { SEAT_GRID_COLUMNS, SLOT_POLL_INTERVAL_MS } from "@/lib/constants";
import type { SeatAvailability } from "@/lib/types";

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const {
    slotDetail,
    slotDetailLoading,
    slotDetailError,
    loadSlot,
    pollSlot,
    stopPollingSlot,
    selectedSeat,
    setSelectedSeat,
    pendingBooking,
    setPendingBooking,
    confirmError,
    setConfirmError,
    reserveError,
    setReserveError,
    actionLoading,
    setActionLoading,
  } = useBooking();

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    seatNumber: number;
  } | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    loadSlot(id);
    pollSlot(id);
    return () => stopPollingSlot();
  }, [id, loadSlot, pollSlot, stopPollingSlot]);

  useEffect(() => {
    setSelectedSeat(null);
    setPendingBooking(null);
    setConfirmError(null);
    setReserveError(null);
    setConfirmedBooking(null);
  }, [id, setSelectedSeat, setPendingBooking, setConfirmError, setReserveError]);

  useEffect(() => {
    if (!pendingBooking?.expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const end = new Date(pendingBooking.expiresAt!).getTime();
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s === 0) {
        setPendingBooking(null);
        setConfirmError("Hold expired. Choose a seat again.");
        if (Number.isFinite(id)) loadSlot(id);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [pendingBooking, setPendingBooking, setConfirmError, id, loadSlot]);

  const grid = useMemo(() => {
    if (!slotDetail?.seats.length) return [];
    const rows: SeatAvailability[][] = [];
    for (let i = 0; i < slotDetail.seats.length; i += SEAT_GRID_COLUMNS) {
      rows.push(slotDetail.seats.slice(i, i + SEAT_GRID_COLUMNS));
    }
    return rows;
  }, [slotDetail]);

  const handleReserve = useCallback(async () => {
    if (!slotDetail || selectedSeat == null) return;
    setReserveError(null);
    setConfirmError(null);
    setActionLoading(true);
    try {
      const b = await api.reserveSeat(slotDetail.id, selectedSeat);
      setPendingBooking(b);
      await loadSlot(slotDetail.id);
    } catch (e) {
      setReserveError(e instanceof Error ? e.message : "Could not reserve");
      await loadSlot(slotDetail.id);
    } finally {
      setActionLoading(false);
    }
  }, [
    slotDetail,
    selectedSeat,
    setPendingBooking,
    setReserveError,
    setConfirmError,
    setActionLoading,
    loadSlot,
  ]);

  const handleConfirm = useCallback(async () => {
    if (!pendingBooking) return;
    setConfirmError(null);
    setActionLoading(true);
    try {
      await api.confirmBooking(pendingBooking.id);
      setConfirmedBooking({ seatNumber: pendingBooking.seatNumber });
      setPendingBooking(null);
      setSelectedSeat(null);
      if (slotDetail) await loadSlot(slotDetail.id);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Confirm failed");
      setPendingBooking(null);
      if (slotDetail) await loadSlot(slotDetail.id);
    } finally {
      setActionLoading(false);
    }
  }, [
    pendingBooking,
    slotDetail,
    setPendingBooking,
    setSelectedSeat,
    setConfirmError,
    setActionLoading,
    loadSlot,
  ]);

  if (!Number.isFinite(id)) {
    return (
      <p className="text-danger font-medium">
        Invalid slot.{" "}
        <Link href="/" className="text-clinic underline underline-offset-2">
          Home
        </Link>
      </p>
    );
  }

  if (slotDetailLoading && !slotDetail) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-56 rounded-2xl bg-white/80 border border-line animate-pulse" />
        <div className="rounded-3xl border border-line bg-white p-8 shadow-soft max-w-xl">
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: `repeat(${SEAT_GRID_COLUMNS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl bg-ink/[0.04] animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (slotDetailError || !slotDetail) {
    return (
      <div className="max-w-lg rounded-3xl border border-danger/20 bg-white p-8 shadow-soft">
        <p className="text-danger font-semibold">
          {slotDetailError || "Slot not found"}
        </p>
        <BackLink href="/">Back to all visits</BackLink>
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="max-w-md mx-auto text-center py-12 sm:py-16 animate-fade-up">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-clinicLight text-clinic shadow-soft ring-4 ring-white">
          <svg
            className="w-10 h-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">
          You&apos;re booked
        </h1>
        <p className="text-ink/55 mt-4 text-lg leading-relaxed">
          Seat <strong className="text-ink">{confirmedBooking.seatNumber}</strong> with{" "}
          <strong className="text-ink">{slotDetail.doctorName}</strong>
        </p>
        <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-clinicLight text-sm font-semibold text-clinic border border-clinic/15">
          Status: CONFIRMED
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-10 px-10 py-3.5 rounded-full bg-clinic text-white font-semibold shadow-lift hover:bg-clinic/95 transition-colors"
        >
          Back to visits
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="space-y-6">
        <BackLink href="/">All visits</BackLink>
        <PageHeader
          eyebrow="Choose your seat"
          title={slotDetail.doctorName}
          description={new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(slotDetail.startTime))}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-line text-sm font-medium text-ink/70 shadow-soft">
          <span className="text-clinic font-bold tabular-nums">{slotDetail.availableCount}</span>
          seats free
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-clinicLight/80 border border-clinic/15 text-sm font-medium text-clinic">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clinic/50 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-clinic" />
          </span>
          Live sync ~{SLOT_POLL_INTERVAL_MS / 1000}s
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-soft overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-lg font-bold text-ink">Waiting room</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/35">
            Front
          </span>
        </div>
        <div className="mx-auto max-w-2xl mb-3 h-2 rounded-full bg-gradient-to-r from-transparent via-ink/10 to-transparent" />
        <div
          className="inline-grid gap-2.5 p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-clinicLight/30 to-transparent border border-clinic/10"
          style={{
            gridTemplateColumns: `repeat(${SEAT_GRID_COLUMNS}, minmax(2.75rem, 1fr))`,
          }}
        >
          {grid.flatMap((row) =>
            row.map((seat) => {
              const isMinePending =
                pendingBooking != null &&
                seat.bookingId === pendingBooking.id &&
                seat.status === "pending";
              return (
                <SeatButton
                  key={seat.seatNumber}
                  seat={seat}
                  selected={
                    selectedSeat === seat.seatNumber &&
                    !isMinePending &&
                    seat.status === "available"
                  }
                  isMinePending={isMinePending}
                  disabled={actionLoading || !!pendingBooking}
                  onPick={() => {
                    if (pendingBooking) return;
                    setSelectedSeat(
                      selectedSeat === seat.seatNumber ? null : seat.seatNumber
                    );
                    setReserveError(null);
                  }}
                />
              );
            })
          )}
        </div>
        <p className="text-center text-xs font-medium text-ink/40 mt-4 uppercase tracking-widest">
          Screen
        </p>

        <div className="flex flex-wrap gap-3 mt-8 justify-center">
          {[
            { label: "Free", cls: "bg-white border-2 border-line" },
            { label: "Selected", cls: "bg-gradient-to-br from-clinic to-clinic/90" },
            { label: "Your hold", cls: "bg-warnLight border-2 border-warn/30" },
            { label: "Taken", cls: "bg-ink/[0.06]" },
          ].map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 text-xs font-medium text-ink/50"
            >
              <span className={`w-4 h-4 rounded-lg shrink-0 ${item.cls}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {reserveError && (
        <div
          role="alert"
          className="rounded-2xl border border-danger/25 bg-red-50/80 px-5 py-4 text-sm text-danger font-medium flex items-start gap-3"
        >
          <span className="text-lg leading-none">⚠</span>
          {reserveError}
        </div>
      )}

      {!pendingBooking ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-soft">
          <button
            type="button"
            disabled={selectedSeat == null || actionLoading}
            onClick={handleReserve}
            className="px-10 py-4 rounded-full bg-clinic text-white font-semibold shadow-lift disabled:opacity-35 disabled:cursor-not-allowed hover:bg-clinic/95 transition-all min-w-[200px]"
          >
            {actionLoading ? "Holding…" : "Hold seat · 2 min"}
          </button>
          <p className="text-sm text-ink/50 leading-relaxed max-w-md">
            We reserve the seat for you so no one else can take it. Confirm your
            appointment before the timer ends.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-warn/25 bg-gradient-to-br from-warnLight to-white p-6 sm:p-8 shadow-lift space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-warn">
                Pending — confirm now
              </p>
              <p className="font-display text-2xl font-bold text-ink mt-2">
                Seat {pendingBooking.seatNumber}
              </p>
            </div>
            <div className="text-right rounded-2xl bg-white/80 border border-warn/20 px-5 py-3 shadow-soft">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
                Time left
              </p>
              <p className="text-4xl font-display font-bold text-warn tabular-nums leading-tight mt-1">
                {secondsLeft != null
                  ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : "—"}
              </p>
            </div>
          </div>
          {confirmError && (
            <p className="text-sm text-danger font-semibold">{confirmError}</p>
          )}
          <button
            type="button"
            disabled={actionLoading || (secondsLeft ?? 0) <= 0}
            onClick={handleConfirm}
            className="w-full sm:w-auto px-10 py-4 rounded-full bg-ink text-white font-semibold shadow-soft hover:bg-ink/90 disabled:opacity-35 transition-colors"
          >
            {actionLoading ? "Confirming…" : "Confirm appointment"}
          </button>
        </div>
      )}
    </div>
  );
}
