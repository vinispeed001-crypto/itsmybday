import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { venueLocalDateString } from "@/lib/domain/availability";

export async function GET(req: NextRequest) {
  const venueSlug = req.nextUrl.searchParams.get("venue");

  if (!venueSlug) {
    return NextResponse.json({ error: "venue query param is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const today = venueLocalDateString(new Date());

  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, venue_id, event_date, time, is_open")
    .eq("is_open", true)
    .gte("event_date", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slots: data ?? [] });
}
