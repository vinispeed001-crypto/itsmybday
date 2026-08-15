"use client";

import { useState, type FormEvent } from "react";

export function HouseRulesForm({ initialContent }: { initialContent: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const form = new FormData(e.currentTarget);
    const content = String(form.get("content") ?? "");

    const res = await fetch("/api/house-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      setError("Não deu pra salvar. Tenta de novo.");
      return;
    }

    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Regras da casa
        <textarea
          name="content"
          defaultValue={initialContent}
          rows={10}
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>
      <button type="submit" className="w-fit rounded-card bg-gold px-4 py-2 font-semibold text-bg">
        Salvar
      </button>
      {error && <p className="text-danger">{error}</p>}
      {saved && <p className="text-gold">Salvo!</p>}
    </form>
  );
}
