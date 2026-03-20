"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBooking } from "@/contexts/BookingContext";
import { api } from "@/lib/api";
import type { SeatAvailability } from "@/lib/types";

const COLS = 6;
const PENDING_MS = 2 * 60 * 1000;

function SeatButton({
  seat,
  selected,
  isMinePending,
  onPick,
  disabled,
}: {
  seat: SeatAvailability;
  selected: boolean;
  isMinePending: boolean;
  onPick: () => void;
  disabled: boolean;
}) {
  const taken = seat.status === "confirmed" || seat.status === "pending";
  const isOthersPending = seat.status === "pending" && !isMinePending;

  let cls =
    "aspect-square rounded-xl text-sm font-bold transition-all duration-200 ";
  if (seat.status === "confirmed" || isOthersPending) {
    cls +=
      "bg-ink/10 text-ink/35 cursor-not-allowed line-through decoration-ink/30";
  } else if (isMinePending) {
    cls += "bg-warn/20 text-warn ring-2 ring-warn/50";
  } else if (selected) {
    cls += "bg-clinic text-white ring-2 ring-clinic ring-offset-2 scale-[1.02]";
  } else {
    cls +=
      "bg-white border-2 border-black/10 text-ink hover:border-clinic/50 hover:bg-clinic/5";
  }

  return (
    <button
      type="button"
      disabled={disabled || taken}
      onClick={onPick}
      className={cls}
      title={
        seat.status === "confirmed"
          ? "Booked"
          : isOthersPending
            ? "On hold"
            : `Seat ${seat.seatNumber}`
      }
    >
      {seat.seatNumber}
    </button>
  );
}

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
    for (let i = 0; i < slotDetail.seats.length; i += COLS) {
      rows.push(slotDetail.seats.slice(i, i + COLS));
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
      <p className="text-danger">
        Invalid slot. <Link href="/" className="underline">Home</Link>
      </p>
    );
  }

  if (slotDetailLoading && !slotDetail) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-black/10 rounded-lg animate-pulse" />
        <div className="grid grid-cols-6 gap-2 max-w-xl">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-black/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (slotDetailError || !slotDetail) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-8">
        <p className="text-danger font-medium">
          {slotDetailError || "Slot not found"}
        </p>
        <Link href="/" className="inline-block mt-4 text-clinic font-semibold">
          ← All slots
        </Link>
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-clinic/15 text-clinic text-3xl mb-6">
          ✓
        </div>
        <h1 className="font-display text-3xl font-bold text-ink">
          Appointment confirmed
        </h1>
        <p className="text-ink/60 mt-3">
          Seat <strong>{confirmedBooking.seatNumber}</strong> with{" "}
          <strong>{slotDetail.doctorName}</strong>
        </p>
        <p className="text-sm text-ink/45 mt-2">
          Status: <span className="text-clinic font-semibold">CONFIRMED</span>
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-10 px-8 py-3 rounded-xl bg-clinic text-white font-semibold"
        >
          Back to slots
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/"
          className="text-sm font-medium text-clinic hover:underline mb-4 inline-block"
        >
          ← All slots
        </Link>
        <h1 className="font-display text-3xl font-bold text-ink">
          {slotDetail.doctorName}
        </h1>
        <p className="text-ink/55 mt-1">
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(slotDetail.startTime))}
        </p>
        <p className="text-sm mt-3 text-ink/50">
          <span className="text-clinic font-semibold">{slotDetail.availableCount}</span>{" "}
          seats free · updates every few seconds
        </p>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-ink mb-4">
          Select a seat
        </h2>
        <div
          className="inline-grid gap-2 p-6 rounded-2xl bg-white border border-black/8 shadow-sm"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(2.75rem, 1fr))`,
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
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-ink/50">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-white border-2 border-black/10" />{" "}
            Free
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-clinic" /> Selected
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-warn/20 ring-1 ring-warn" /> Your
            hold
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-ink/10 line-through" /> Taken
          </span>
        </div>
      </div>

      {reserveError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {reserveError}
        </div>
      )}

      {!pendingBooking ? (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={selectedSeat == null || actionLoading}
            onClick={handleReserve}
            className="px-8 py-3 rounded-xl bg-clinic text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-clinic/90"
          >
            {actionLoading ? "Reserving…" : "Hold seat (2 min)"}
          </button>
          <p className="text-sm text-ink/45 max-w-sm">
            We&apos;ll put the seat on hold so nobody else can take it. Confirm
            within 2 minutes.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-warn/30 bg-warn/5 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-warn font-bold">
                Pending — confirm soon
              </p>
              <p className="text-lg font-bold text-ink mt-1">
                Seat {pendingBooking.seatNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink/50">Time left</p>
              <p className="text-3xl font-display font-bold text-warn tabular-nums">
                {secondsLeft != null
                  ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : "—"}
              </p>
            </div>
          </div>
          {confirmError && (
            <p className="text-sm text-danger font-medium">{confirmError}</p>
          )}
          <button
            type="button"
            disabled={actionLoading || (secondsLeft ?? 0) <= 0}
            onClick={handleConfirm}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-ink text-white font-semibold hover:bg-ink/90 disabled:opacity-40"
          >
            {actionLoading ? "Confirming…" : "Confirm appointment"}
          </button>
        </div>
      )}
    </div>
  );
}
