import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HouseRulesForm } from "./HouseRulesForm";

const DEFAULT_VENUE_ID = "00000000-0000-0000-0000-000000000001";

export default async function RegrasPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("house_rules")
    .select("content")
    .eq("venue_id", DEFAULT_VENUE_ID)
    .single();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-gold">Regras da casa</h1>
      <HouseRulesForm initialContent={data?.content ?? ""} />
    </div>
  );
}
