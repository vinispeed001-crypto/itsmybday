"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AvailabilityForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch("/api/availability-admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event_date: String(data.get("event_date") ?? ""),
        time: String(data.get("time") ?? ""),
      }),
    });

    if (!res.ok) {
      setError("Não deu pra adicionar. Confira se essa data/horário já não existe.");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-end gap-3 rounded-card border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Data
          <input name="event_date" type="date" required className="rounded-card border border-border bg-bg p-3 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Horário
          <input name="time" type="time" required className="rounded-card border border-border bg-bg p-3 text-ink" />
        </label>
        <button type="submit" className="rounded-card bg-gold px-4 py-3 font-semibold text-bg">
          Adicionar horário
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}
    </form>
  );
}
