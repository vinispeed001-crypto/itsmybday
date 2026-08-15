"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveButton({ eventId }: { eventId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/integration-events/${eventId}/resolve`, { method: "POST" });

      if (!res.ok) {
        setError("Não deu pra marcar como feito. Tenta de novo.");
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-card border border-gold px-3 py-1 text-xs text-gold hover:bg-gold hover:text-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        Marcar como feito
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
