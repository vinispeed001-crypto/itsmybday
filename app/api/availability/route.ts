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

  // TODO(multi-venue): this route accepts `venue` but doesn't filter by it yet —
  // safe only while a single venue exists. Before seeding a second venue, join
  // against venues.slug to scope this query, or every venue's open slots will
  // leak into every other venue's public availability response.
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, venue_id, event_date, time, is_open")
    .eq("is_open", true)
    .gte("event_date", today);

  if (error) {
    console.error("availability query failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ slots: data ?? [] });
}
