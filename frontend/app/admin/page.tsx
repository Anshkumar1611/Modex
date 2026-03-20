"use client";

import { useCallback, useEffect, useState } from "react";
import { BackLink, PageHeader } from "@/components/layout/shell";
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
      setSuccess(`Slot #${slotId} created successfully.`);
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

  const inputCls =
    "w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-ink shadow-inner shadow-black/[0.02] focus:border-clinic/40 focus:ring-2 focus:ring-clinic/15 transition-all";

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <div className="space-y-6">
        <BackLink href="/">All visits</BackLink>
        <PageHeader
          eyebrow="Admin"
          title="Create a slot"
          description="Open a new visit window and set how many patients can book for that time."
        />
      </div>

      <form
        onSubmit={submit}
        className="rounded-3xl border border-line bg-white p-8 sm:p-10 shadow-soft space-y-7"
      >
        <div className="space-y-2">
          <label className="block text-sm font-bold text-ink/80">
            Doctor
          </label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className={inputCls}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-ink/80">
            Start time
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-ink/80">
            Total seats
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-ink/40">Between 1 and 200 patients per slot.</p>
        </div>
        {error && (
          <div className="rounded-2xl bg-red-50 border border-danger/20 px-4 py-3 text-sm text-danger font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl bg-clinicLight border border-clinic/20 px-4 py-3 text-sm text-clinic font-semibold">
            {success}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full bg-ink text-white font-semibold shadow-lift hover:bg-ink/90 disabled:opacity-45 transition-all text-base"
        >
          {loading ? "Creating…" : "Create slot"}
        </button>
      </form>
    </div>
  );
}
