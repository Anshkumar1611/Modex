"use client";

import type { SeatAvailability } from "@/lib/types";

type SeatButtonProps = {
  seat: SeatAvailability;
  selected: boolean;
  isMinePending: boolean;
  onPick: () => void;
  disabled: boolean;
};

export function SeatButton({
  seat,
  selected,
  isMinePending,
  onPick,
  disabled,
}: SeatButtonProps) {
  const taken = seat.status === "confirmed" || seat.status === "pending";
  const isOthersPending = seat.status === "pending" && !isMinePending;

  let cls =
    "relative aspect-square min-w-[2.75rem] rounded-2xl text-sm font-bold transition-all duration-200 shadow-seat focus:outline-none focus-visible:ring-2 focus-visible:ring-clinic/50 focus-visible:ring-offset-2 ";
  if (seat.status === "confirmed" || isOthersPending) {
    cls +=
      "bg-ink/[0.06] text-ink/30 cursor-not-allowed border border-ink/5";
  } else if (isMinePending) {
    cls +=
      "bg-warnLight text-warn border-2 border-warn/35 shadow-md scale-[1.03] z-[1]";
  } else if (selected) {
    cls +=
      "bg-gradient-to-br from-clinic to-clinic/90 text-white border-2 border-white/30 shadow-lift scale-[1.05] z-[1]";
  } else {
    cls +=
      "bg-white border-2 border-line text-ink hover:border-clinic/35 hover:bg-clinicLight/40 hover:-translate-y-0.5 active:translate-y-0";
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
      {isOthersPending && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink/25">
          …
        </span>
      )}
      <span className={isOthersPending ? "opacity-25" : ""}>{seat.seatNumber}</span>
    </button>
  );
}
