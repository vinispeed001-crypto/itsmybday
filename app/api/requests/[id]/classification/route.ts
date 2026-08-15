import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { classificationSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = classificationSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase.from("classifications").upsert(
    {
      request_id: params.id,
      type: parsed.data.type,
      vip_until_time: parsed.data.vip_until_time ?? null,
      value_male: parsed.data.value_male ?? null,
      value_female: parsed.data.value_female ?? null,
      advance_payment_note: parsed.data.advance_payment_note ?? null,
    },
    { onConflict: "request_id" }
  );

  if (error) {
    console.error("classification upsert failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ status: "classified" });
}
