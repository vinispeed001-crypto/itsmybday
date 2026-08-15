import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { GuestList, GuestListEntry } from "@/lib/types";
import { EntryForm } from "./EntryForm";

async function getListData(token: string) {
  const supabase = createSupabaseServiceClient();

  const { data: list, error } = await supabase
    .from("guest_lists")
    .select("id, max_men, max_women, deadline_at, share_token")
    .eq("share_token", token)
    .single<Pick<GuestList, "id" | "max_men" | "max_women" | "deadline_at" | "share_token">>();

  if (error || !list) {
    return null;
  }

  const { data: entries } = await supabase
    .from("guest_list_entries")
    .select("id, name, gender")
    .eq("guest_list_id", list.id)
    .returns<Pick<GuestListEntry, "id" | "name" | "gender">[]>();

  return { list, entries: entries ?? [] };
}

export default async function ListPage({ params }: { params: { token: string } }) {
  const data = await getListData(params.token);

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <p className="text-danger">Essa lista não existe ou o link está errado.</p>
      </main>
    );
  }

  const { list, entries } = data;
  const menCount = entries.filter((e) => e.gender === "male").length;
  const womenCount = entries.filter((e) => e.gender === "female").length;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="font-display text-2xl text-gold">Lista de convidados</h1>
      <p className="text-muted">
        {menCount}/{list.max_men} homens · {womenCount}/{list.max_women} mulheres · limite{" "}
        {new Date(list.deadline_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
      </p>
      <EntryForm token={params.token} />
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-card border border-border bg-surface p-3 text-ink">
            {entry.name} <span className="text-muted">({entry.gender === "male" ? "homem" : "mulher"})</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
