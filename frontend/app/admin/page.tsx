"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AdminPage() {
  const [doctors, setDoctors] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [doctorId, setDoctorId] = useState("");
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - (d.getMinutes() % 30) + 30);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [totalSeats, setTotalSeats] = useState("12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.listDoctors();
      setDoctors(d);
      if (d.length && !doctorId) setDoctorId(String(d[0].id));
    } catch {
      setError("Could not load doctors. Is the API running?");
    }
  }, [doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const did = Number(doctorId);
    const seats = Number(totalSeats);
    if (!Number.isFinite(did) || !startTime.trim() || !Number.isFinite(seats)) {
      setError("Fill all fields.");
      return;
    }
    setLoading(true);
    try {
      const iso = new Date(startTime).toISOString();
      const slotId = await api.createSlot({
        doctorId: did,
        startTime: iso,
        totalSeats: seats,
      });
      setSuccess(`Slot #${slotId} created.`);
      const d = new Date();
      d.setHours(d.getHours() + 1);
      d.setMinutes(0, 0, 0);
      setStartTime(d.toISOString().slice(0, 16));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <Link href="/" className="text-sm text-clinic font-medium hover:underline">
          ← Slots
        </Link>
        <h1 className="font-display text-3xl font-bold text-ink mt-4">
          Create slot
        </h1>
        <p className="text-ink/55 mt-2 text-sm">
          Add a visit window and number of seats (patients) for that slot.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="rounded-2xl border border-black/8 bg-white p-8 shadow-sm space-y-6"
      >
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">
            Doctor
          </label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded-xl border border-black/15 px-4 py-3 bg-white"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">
            Start time
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-black/15 px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">
            Total seats
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
            className="w-full rounded-xl border border-black/15 px-4 py-3"
          />
        </div>
        {error && (
          <p className="text-sm text-danger font-medium">{error}</p>
        )}
        {success && (
          <p className="text-sm text-clinic font-medium">{success}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-ink text-white font-semibold hover:bg-ink/90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create slot"}
        </button>
      </form>
    </div>
  );
}
