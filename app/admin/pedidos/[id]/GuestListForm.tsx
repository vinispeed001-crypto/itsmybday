"use client";

import { useState, type FormEvent } from "react";

export function GuestListForm({ requestId }: { requestId: string }) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    // The datetime-local input value ("YYYY-MM-DDTHH:mm") carries no timezone
    // info, so appending it directly to `new Date(...)` would use the browser's
    // local timezone instead of America/Sao_Paulo. Brazil has had no DST since
    // 2019, so America/Sao_Paulo is a fixed UTC-3 offset — appending it here
    // makes the conversion correct regardless of the browser's own timezone.
    const deadlineLocal = String(form.get("deadline_at"));
    const payload = {
      max_men: Number(form.get("max_men") ?? 0),
      max_women: Number(form.get("max_women") ?? 0),
      deadline_at: new Date(`${deadlineLocal}:00-03:00`).toISOString(),
    };

    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/guest-list`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError("Não deu pra criar a lista. Tenta de novo.");
        return;
      }

      const body = await res.json();
      setShareToken(body.share_token);
    } finally {
      setLoading(false);
    }
  }

  if (shareToken) {
    return (
      <p className="rounded-card border border-border bg-surface p-4 text-ink">
        Lista criada! Link: <span className="text-gold">/lista/{shareToken}</span>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Máximo de homens
        <input name="max_men" type="number" min={0} required className="rounded-card border border-border bg-bg p-3 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Máximo de mulheres
        <input name="max_women" type="number" min={0} required className="rounded-card border border-border bg-bg p-3 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Horário limite pra acrescentar nomes
        <input name="deadline_at" type="datetime-local" required className="rounded-card border border-border bg-bg p-3 text-ink" />
      </label>
      {error && <p className="text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-card bg-gold px-4 py-2 font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        Gerar lista
      </button>
    </form>
  );
}
