"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASON_SUGGESTIONS = [
  "Casa alugada para evento",
  "Lotação máxima para essa data",
  "Quer tentar outra data?",
];

export function DecisionPanel({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setError(null);
    const res = await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "approve" }),
    });

    if (!res.ok) {
      setError("Não deu pra aprovar o pedido. Tenta de novo.");
      return;
    }

    router.refresh();
  }

  async function confirmDeny() {
    if (reason.trim().length < 3) {
      setError("Informe um motivo com pelo menos 3 caracteres.");
      return;
    }

    setError(null);

    const res = await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "deny", denial_reason: reason.trim() }),
    });

    if (!res.ok) {
      setError("Não deu pra negar o pedido. Tenta de novo.");
      return;
    }

    router.refresh();
  }

  function cancelDeny() {
    setShowDenyForm(false);
    setReason("");
    setError(null);
  }

  if (showDenyForm) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Motivo
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-card border border-border bg-bg p-3 text-ink"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {REASON_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setReason(suggestion)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-gold hover:text-ink"
            >
              {suggestion}
            </button>
          ))}
        </div>
        {error && <p className="text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmDeny}
            className="rounded-card bg-danger px-4 py-2 font-semibold text-ink"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={cancelDeny}
            className="rounded-card border border-border px-4 py-2 text-muted hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-danger">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={approve}
          className="rounded-card bg-gold px-4 py-2 font-semibold text-bg"
        >
          Aceitar
        </button>
        <button
          type="button"
          onClick={() => setShowDenyForm(true)}
          className="rounded-card border border-border px-4 py-2 text-muted hover:text-ink"
        >
          Negar
        </button>
      </div>
    </div>
  );
}
