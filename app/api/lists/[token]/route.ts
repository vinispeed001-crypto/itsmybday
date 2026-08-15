import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createSupabaseServiceClient();

  const { data: list, error } = await supabase
    .from("guest_lists")
    .select("id, max_men, max_women, deadline_at, share_token")
    .eq("share_token", params.token)
    .single();

  if (error || !list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }

  const { data: entries } = await supabase
    .from("guest_list_entries")
    .select("id, name, gender")
    .eq("guest_list_id", list.id);

  return NextResponse.json({ list, entries: entries ?? [] });
}
