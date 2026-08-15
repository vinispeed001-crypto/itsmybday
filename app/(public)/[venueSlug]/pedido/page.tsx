import { RequestForm } from "./RequestForm";

export default function PedidoPage({ params }: { params: { venueSlug: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="font-display text-2xl text-gold">Peça sua data</h1>
      <RequestForm venueSlug={params.venueSlug} />
    </main>
  );
}
