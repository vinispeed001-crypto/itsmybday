import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decisionSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = decisionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const requestId = params.id;

  if (parsed.data.decision === "approve") {
    const { error: updateError } = await supabase
      .from("requests")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: user.id })
      .eq("id", requestId);

    if (updateError) {
      console.error("request approval update failed", updateError);
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    const { error: eventsError } = await supabase.from("integration_events").insert([
      { request_id: requestId, type: "getin_reservation", status: "pending_manual", payload: {} },
      {
        request_id: requestId,
        type: "whatsapp_notification",
        status: "pending_manual",
        payload: { kind: "approval" },
      },
    ]);

    if (eventsError) {
      console.error("integration event insert failed", eventsError);
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    return NextResponse.json({ status: "approved" });
  }

  const { error: updateError } = await supabase
    .from("requests")
    .update({
      status: "denied",
      denial_reason: parsed.data.denial_reason,
      decided_at: new Date().toISOString(),
      decided_by: user.id,
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("request denial update failed", updateError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const { error: eventError } = await supabase.from("integration_events").insert([
    {
      request_id: requestId,
      type: "whatsapp_notification",
      status: "pending_manual",
      payload: { kind: "denial", reason: parsed.data.denial_reason },
    },
  ]);

  if (eventError) {
    console.error("integration event insert failed", eventError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ status: "denied" });
}
