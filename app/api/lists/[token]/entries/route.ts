import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { guestListEntrySchema } from "@/lib/validation/schemas";
import { canAddEntry } from "@/lib/domain/guestList";
import type { GuestList, GuestListEntry } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const json = await req.json();
  const parsed = guestListEntrySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: list, error: listError } = await supabase
    .from("guest_lists")
    .select("id, max_men, max_women, deadline_at, share_token")
    .eq("share_token", params.token)
    .single<Pick<GuestList, "id" | "max_men" | "max_women" | "deadline_at" | "share_token">>();

  if (listError || !list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }

  const { data: existingEntries } = await supabase
    .from("guest_list_entries")
    .select("id, gender")
    .eq("guest_list_id", list.id)
    .returns<Pick<GuestListEntry, "id" | "gender">[]>();

  const result = canAddEntry(
    list as GuestList,
    (existingEntries ?? []) as GuestListEntry[],
    parsed.data.gender,
    new Date()
  );

  if (!result.allowed) {
    return NextResponse.json({ reason: result.reason }, { status: 409 });
  }

  const { error: insertError } = await supabase
    .from("guest_list_entries")
    .insert({ guest_list_id: list.id, name: parsed.data.name, gender: parsed.data.gender });

  if (insertError) {
    // The guest_list_capacity_guard trigger (see supabase/migrations/0002_*)
    // raises P0001 when it catches a race the application-level canAddEntry
    // check missed (stale read: two concurrent requests both saw room).
    if (insertError.code === "P0001") {
      return NextResponse.json({ reason: "quota_full" }, { status: 409 });
    }
    console.error("guest list entry insert failed", insertError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ status: "added" }, { status: 201 });
}
