import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DecisionPanel } from "./DecisionPanel";
import { ClassificationForm } from "./ClassificationForm";
import { GuestListForm } from "./GuestListForm";

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!request) {
    notFound();
  }

  const { data: classification } = await supabase
    .from("classifications")
    .select("*")
    .eq("request_id", params.id)
    .maybeSingle();

  const { data: guestList } = await supabase
    .from("guest_lists")
    .select("*")
    .eq("request_id", params.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-gold">{request.requester_name}</h1>
        <p className="text-muted">
          {request.event_date} às {request.event_time} · {request.quantity} pessoas · @
          {request.instagram} · {request.whatsapp}
        </p>
        <p className="mt-2 text-sm uppercase tracking-wide text-muted">Status: {request.status}</p>
      </div>

      {request.status === "pending" && <DecisionPanel requestId={request.id} />}

      {request.status === "denied" && request.denial_reason && (
        <p className="text-danger">Negado: {request.denial_reason}</p>
      )}

      {request.status === "approved" && !classification && <ClassificationForm requestId={request.id} />}

      {request.status === "approved" && classification && !guestList && (
        <GuestListForm requestId={request.id} />
      )}

      {guestList && (
        <p className="rounded-card border border-border bg-surface p-4 text-ink">
          Lista ativa: <span className="text-gold">/lista/{guestList.share_token}</span> · limite{" "}
          {new Date(guestList.deadline_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
      )}
    </div>
  );
}
