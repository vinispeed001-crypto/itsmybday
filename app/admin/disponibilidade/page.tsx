import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AvailabilityForm } from "./AvailabilityForm";

export default async function DisponibilidadePage() {
  const supabase = createSupabaseServerClient();
  const { data: slots } = await supabase
    .from("availability_slots")
    .select("*")
    .order("event_date", { ascending: true })
    .order("time", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-gold">Disponibilidade</h1>
      <AvailabilityForm />
      <ul className="flex flex-col gap-2">
        {(slots ?? []).map((slot) => (
          <li key={slot.id} className="rounded-card border border-border bg-surface p-3 text-ink">
            {slot.event_date} · {slot.time} · {slot.is_open ? "aberto" : "fechado"}
          </li>
        ))}
      </ul>
    </div>
  );
}
