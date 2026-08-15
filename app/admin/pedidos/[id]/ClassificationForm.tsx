"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ClassificationType } from "@/lib/types";

const LABELS: Record<ClassificationType, string> = {
  tudo_vip: "Tudo VIP",
  vip_ate_hora: "VIP até X hora",
  valor_genero: "Valor por gênero",
  pagar_antecipado: "Pagar valor antecipado",
};

export function ClassificationForm({ requestId }: { requestId: string }) {
  const [type, setType] = useState<ClassificationType>("tudo_vip");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const payload: Record<string, unknown> = { type };

    if (type === "vip_ate_hora") {
      payload.vip_until_time = String(form.get("vip_until_time") ?? "");
    }
    if (type === "valor_genero") {
      payload.value_male = Number(form.get("value_male") ?? 0);
      payload.value_female = Number(form.get("value_female") ?? 0);
    }
    if (type === "pagar_antecipado") {
      payload.advance_payment_note = String(form.get("advance_payment_note") ?? "");
    }

    const res = await fetch(`/api/requests/${requestId}/classification`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Não deu pra salvar a classificação. Tenta de novo.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Tipo
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ClassificationType)}
          className="rounded-card border border-border bg-bg p-3 text-ink"
        >
          {Object.entries(LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {type === "vip_ate_hora" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Até que horário
          <input
            name="vip_until_time"
            type="time"
            required
            className="rounded-card border border-border bg-bg p-3 text-ink"
          />
        </label>
      )}

      {type === "valor_genero" && (
        <>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Valor homem (R$)
            <input
              name="value_male"
              type="number"
              min={0}
              step="0.01"
              required
              className="rounded-card border border-border bg-bg p-3 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Valor mulher (R$)
            <input
              name="value_female"
              type="number"
              min={0}
              step="0.01"
              required
              className="rounded-card border border-border bg-bg p-3 text-ink"
            />
          </label>
        </>
      )}

      {type === "pagar_antecipado" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Observação (opcional)
          <input
            name="advance_payment_note"
            className="rounded-card border border-border bg-bg p-3 text-ink"
          />
        </label>
      )}

      {error && <p className="text-danger">{error}</p>}

      <button type="submit" className="rounded-card bg-gold px-4 py-2 font-semibold text-bg">
        Salvar classificação
      </button>
    </form>
  );
}
