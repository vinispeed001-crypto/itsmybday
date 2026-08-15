import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResolveButton } from "./ResolveButton";

const TYPE_LABELS: Record<string, string> = {
  getin_reservation: "Lançar reserva no GetIn",
  whatsapp_notification: "Enviar mensagem no WhatsApp",
  pensanoevento_export: "Subir lista no pensanoevento",
};

const KIND_LABELS: Record<string, string> = {
  approval: "aprovação do pedido",
  denial: "recusa do pedido",
  guest_list_link: "link da lista de convidados",
};

export default async function IntegracoesPage() {
  const supabase = createSupabaseServerClient();
  const { data: events } = await supabase
    .from("integration_events")
    .select("*, requests(requester_name)")
    .eq("status", "pending_manual")
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-gold">Pendências manuais</h1>
      <p className="text-muted">
        Essas ações ainda não são automáticas (falta liberar a API do GetIn, do Nicochat ou do
        pensanoevento). Faça manualmente e marque como feito.
      </p>
      {events && events.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between rounded-card border border-border bg-surface p-4"
            >
              <div>
                <p className="text-ink">{TYPE_LABELS[event.type] ?? event.type}</p>
                <p className="text-sm text-muted">
                  {event.requests?.requester_name}
                  {event.payload?.kind ? ` · ${KIND_LABELS[event.payload.kind] ?? event.payload.kind}` : ""}
                </p>
              </div>
              <ResolveButton eventId={event.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Nenhuma pendência manual.</p>
      )}
    </div>
  );
}
