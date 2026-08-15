import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { houseRulesSchema } from "@/lib/validation/schemas";

const DEFAULT_VENUE_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("house_rules")
    .select("content")
    .eq("venue_id", DEFAULT_VENUE_ID)
    .single();

  if (error) {
    console.error("house rules fetch failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ content: data.content });
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = houseRulesSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase
    .from("house_rules")
    .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
    .eq("venue_id", DEFAULT_VENUE_ID);

  if (error) {
    console.error("house rules update failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ status: "updated" });
}
