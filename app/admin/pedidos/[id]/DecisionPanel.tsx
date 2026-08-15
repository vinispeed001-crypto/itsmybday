"use client";

import { useState } from "react";

const REASON_SUGGESTIONS = [
  "Casa alugada para evento",
  "Lotação máxima para essa data",
  "Quer tentar outra data?",
];

export function DecisionPanel({ requestId }: { requestId: string }) {
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [reason, setReason] = useState("");

  async function approve() {
    await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "approve" }),
    });
    window.location.reload();
  }

  async function confirmDeny() {
    if (reason.trim().length < 3) return;

    await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "deny", denial_reason: reason }),
    });
    window.location.reload();
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
        <button
          type="button"
          onClick={confirmDeny}
          className="rounded-card bg-danger px-4 py-2 font-semibold text-ink"
        >
          Confirmar
        </button>
      </div>
    );
  }

  return (
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
  );
}
