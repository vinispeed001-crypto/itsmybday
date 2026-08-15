import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DecisionPanel } from "./DecisionPanel";

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
    </div>
  );
}
