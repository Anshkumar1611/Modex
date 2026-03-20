"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { Booking, SlotDetail, SlotSummary } from "@/lib/types";

interface BookingContextValue {
  slots: SlotSummary[];
  slotsLoading: boolean;
  slotsError: string | null;
  refreshSlots: () => Promise<void>;

  slotDetail: SlotDetail | null;
  slotDetailLoading: boolean;
  slotDetailError: string | null;
  loadSlot: (slotId: number) => Promise<void>;
  pollSlot: (slotId: number) => void;
  stopPollingSlot: () => void;

  selectedSeat: number | null;
  setSelectedSeat: (n: number | null) => void;

  pendingBooking: Booking | null;
  setPendingBooking: (b: Booking | null) => void;
  confirmError: string | null;
  setConfirmError: (e: string | null) => void;
  reserveError: string | null;
  setReserveError: (e: string | null) => void;
  actionLoading: boolean;
  setActionLoading: (v: boolean) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<SlotSummary[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [slotDetail, setSlotDetail] = useState<SlotDetail | null>(null);
  const [slotDetailLoading, setSlotDetailLoading] = useState(false);
  const [slotDetailError, setSlotDetailError] = useState<string | null>(null);

  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSlots = useCallback(async () => {
    setSlotsError(null);
    try {
      const list = await api.listSlots();
      setSlots(list);
    } catch (e) {
      setSlotsError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  const loadSlot = useCallback(async (slotId: number) => {
    setSlotDetailError(null);
    setSlotDetailLoading(true);
    try {
      const d = await api.getSlot(slotId);
      setSlotDetail(d);
    } catch (e) {
      setSlotDetail(null);
      setSlotDetailError(
        e instanceof Error ? e.message : "Could not load appointment"
      );
    } finally {
      setSlotDetailLoading(false);
    }
  }, []);

  const stopPollingSlot = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollSlot = useCallback(
    (slotId: number) => {
      stopPollingSlot();
      pollRef.current = setInterval(() => {
        api.getSlot(slotId).then(setSlotDetail).catch(() => {});
      }, 2500);
    },
    [stopPollingSlot]
  );

  useEffect(() => () => stopPollingSlot(), [stopPollingSlot]);

  const value = useMemo<BookingContextValue>(
    () => ({
      slots,
      slotsLoading,
      slotsError,
      refreshSlots,
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
    }),
    [
      slots,
      slotsLoading,
      slotsError,
      refreshSlots,
      slotDetail,
      slotDetailLoading,
      slotDetailError,
      loadSlot,
      pollSlot,
      stopPollingSlot,
      selectedSeat,
      pendingBooking,
      confirmError,
      reserveError,
      actionLoading,
    ]
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
