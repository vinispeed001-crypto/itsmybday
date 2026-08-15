import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RequestsList } from "./RequestsList";

export default async function AdminDashboard() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-gold">Pedidos pendentes</h1>
      <RequestsList initialRequests={data ?? []} />
    </div>
  );
}
