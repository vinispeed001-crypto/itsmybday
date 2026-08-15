"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    setLoading(false);

    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Senha
        <input
          name="password"
          type="password"
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
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
