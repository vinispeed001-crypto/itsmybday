"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function EntryForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      gender: String(data.get("gender") ?? "male"),
    };

    const res = await fetch(`/api/lists/${token}/entries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      const body = await res.json();
      setError(
        body.reason === "deadline_passed"
          ? "O horário limite pra essa lista já passou."
          : "Vagas esgotadas pra esse gênero."
      );
      return;
    }

    if (!res.ok) {
      setError("Não deu pra adicionar. Tenta de novo.");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Nome do convidado
        <input name="name" required minLength={2} className="rounded-card border border-border bg-surface p-3 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Gênero
        <select name="gender" className="rounded-card border border-border bg-surface p-3 text-ink">
          <option value="male">Homem</option>
          <option value="female">Mulher</option>
        </select>
      </label>
      {error && <p className="text-danger">{error}</p>}
      <button type="submit" className="rounded-card bg-gold px-4 py-2 font-semibold text-bg">
        Adicionar
      </button>
    </form>
  );
}
