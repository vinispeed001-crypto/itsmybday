import type { AvailabilitySlot } from "@/lib/types";

export function filterOpenFutureSlots(
  slots: AvailabilitySlot[],
  now: Date
): AvailabilitySlot[] {
  const todayIso = now.toISOString().slice(0, 10);
  return slots.filter((slot) => slot.is_open && slot.event_date >= todayIso);
}
