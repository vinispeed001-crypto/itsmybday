import { EntryForm } from "./EntryForm";

async function getListData(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/lists/${token}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
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
  const menCount = entries.filter((e: { gender: string }) => e.gender === "male").length;
  const womenCount = entries.filter((e: { gender: string }) => e.gender === "female").length;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="font-display text-2xl text-gold">Lista de convidados</h1>
      <p className="text-muted">
        {menCount}/{list.max_men} homens · {womenCount}/{list.max_women} mulheres · limite{" "}
        {new Date(list.deadline_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
      </p>
      <EntryForm token={params.token} />
      <ul className="flex flex-col gap-2">
        {entries.map((entry: { id: string; name: string; gender: string }) => (
          <li key={entry.id} className="rounded-card border border-border bg-surface p-3 text-ink">
            {entry.name} <span className="text-muted">({entry.gender === "male" ? "homem" : "mulher"})</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
