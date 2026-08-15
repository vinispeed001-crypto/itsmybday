import * as crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { guestListSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = guestListSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: request, error: fetchError } = await supabase
    .from("requests")
    .select("status")
    .eq("id", params.id)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (request.status !== "approved") {
    return NextResponse.json({ error: "request_not_approved" }, { status: 409 });
  }

  const { data: existingList } = await supabase
    .from("guest_lists")
    .select("id")
    .eq("request_id", params.id)
    .maybeSingle();

  if (existingList) {
    return NextResponse.json({ error: "guest_list_already_exists" }, { status: 409 });
  }

  const shareToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from("guest_lists")
    .insert({
      request_id: params.id,
      max_men: parsed.data.max_men,
      max_women: parsed.data.max_women,
      deadline_at: parsed.data.deadline_at,
      share_token: shareToken,
    })
    .select("id, share_token")
    .single();

  if (error) {
    console.error("guest list insert failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  // TODO(reliability): this insert can fail after the guest_lists insert above already
  // succeeded, leaving a created guest list with no integration_events row — meaning
  // /admin/integracoes (Task 15) would never surface the manual WhatsApp reminder to
  // send the list link. No cross-table transaction is available without a Postgres RPC.
  const { error: eventError } = await supabase.from("integration_events").insert([
    {
      request_id: params.id,
      type: "whatsapp_notification",
      status: "pending_manual",
      payload: { kind: "guest_list_link", share_token: data.share_token },
    },
  ]);

  if (eventError) {
    console.error("integration event insert failed", eventError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, share_token: data.share_token }, { status: 201 });
}
