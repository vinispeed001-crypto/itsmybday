import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createRequestSchema } from "@/lib/validation/schemas";

const DEFAULT_VENUE_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = createRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // TODO(multi-venue): venue_id is hardcoded to the single seeded venue and the
  // [venueSlug] URL param is never used to resolve it — every submission lands
  // on this one venue regardless of which venue's /pedido page it came from.
  // Before seeding a second venue, resolve venue_id from venueSlug via venues.slug.
  const { data, error } = await supabase
    .from("requests")
    .insert({
      venue_id: DEFAULT_VENUE_ID,
      requester_name: parsed.data.requester_name,
      event_date: parsed.data.event_date,
      event_time: parsed.data.event_time,
      quantity: parsed.data.quantity,
      instagram: parsed.data.instagram,
      whatsapp: parsed.data.whatsapp,
      referred_by_profile_id: parsed.data.referred_by_profile_id ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("request insert failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
