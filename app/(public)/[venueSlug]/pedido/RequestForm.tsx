"use client";

import { useState, type FormEvent } from "react";

export function RequestForm({ venueSlug }: { venueSlug: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      requester_name: String(form.get("requester_name") ?? ""),
      event_date: String(form.get("event_date") ?? ""),
      event_time: String(form.get("event_time") ?? ""),
      quantity: Number(form.get("quantity") ?? 0),
      instagram: String(form.get("instagram") ?? ""),
      whatsapp: String(form.get("whatsapp") ?? ""),
    };

    if (!payload.event_date || !payload.event_time) {
      setError("Escolha a data e o horário do evento.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Não deu pra enviar o pedido. Confira os dados e tente de novo.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-ink">
        Pedido enviado! A equipe do {venueSlug.replace(/-/g, " ")} vai avaliar e te
        avisar pelo WhatsApp.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Nome
        <input
          name="requester_name"
          required
          minLength={2}
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Data
        <input
          name="event_date"
          type="date"
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Horário
        <input
          name="event_time"
          type="time"
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Quantidade de pessoas
        <input
          name="quantity"
          type="number"
          min={1}
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Instagram
        <input
          name="instagram"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        WhatsApp
        <input
          name="whatsapp"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      {error && <p className="text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-card bg-gold px-4 py-3 font-semibold text-bg disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
