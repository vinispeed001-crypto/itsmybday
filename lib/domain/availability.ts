import type { AvailabilitySlot } from "@/lib/types";

const VENUE_TIME_ZONE = "America/Sao_Paulo";

export function venueLocalDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: VENUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // en-CA locale formats as YYYY-MM-DD
}

export function filterOpenFutureSlots(
  slots: AvailabilitySlot[],
  now: Date
): AvailabilitySlot[] {
  const todayIso = venueLocalDateString(now);
  return slots.filter((slot) => slot.is_open && slot.event_date >= todayIso);
}
