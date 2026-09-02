import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const DEFAULT_VENUE_ID = "00000000-0000-0000-0000-000000000001";

export default async function RegrasPage({ params }: { params: { venueSlug: string } }) {
  const supabase = createSupabaseServiceClient();

  // TODO(multi-venue): resolve venue_id from venueSlug once there's more than one venue.
  const { data } = await supabase
    .from("house_rules")
    .select("content")
    .eq("venue_id", DEFAULT_VENUE_ID)
    .single();

  const content = data?.content?.trim();
  const lines = content ? content.split("\n").filter(Boolean) : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-gold">Regras da casa</h1>
        <Link href={`/${params.venueSlug}/pedido`} className="text-sm text-muted underline">
          Voltar
        </Link>
      </div>

      {lines.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {lines.map((line: string, i: number) => (
            <li
              key={i}
              className="rounded-card border border-border bg-surface p-4 text-ink"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-border bg-surface p-6 text-muted">
          As regras da casa (rolha, bolo, vela, decoração, dress code, horários e mais)
          ainda vão ser cadastradas aqui pela equipe do {params.venueSlug.replace(/-/g, " ")}.
        </p>
      )}
    </main>
  );
}
