import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: updated, error } = await supabase
    .from("integration_events")
    .update({ status: "sent", resolved_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("id");

  if (error) {
    console.error("integration event resolve failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ status: "resolved" });
}
