import Link from "next/link";

const VENUE_SLUG = "300-sky-bar";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="font-display text-3xl text-gold">ItsMyBday</p>
        <p className="text-sm text-muted">300 Sky Bar</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link
          href={`/${VENUE_SLUG}/pedido`}
          className="rounded-card bg-gold px-4 py-3 font-semibold text-bg"
        >
          Solicitar minha data
        </Link>
        <Link
          href={`/${VENUE_SLUG}/regras`}
          className="rounded-card border border-border bg-surface px-4 py-3 text-ink"
        >
          Regras da casa
        </Link>
        <Link
          href={`/${VENUE_SLUG}/galeria`}
          className="rounded-card border border-border bg-surface px-4 py-3 text-ink"
        >
          Galeria
        </Link>
      </div>
    </main>
  );
}
