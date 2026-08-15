import type { GuestList, GuestListEntry } from "@/lib/types";

export type AddEntryResult =
  | { allowed: true }
  | { allowed: false; reason: "deadline_passed" | "quota_full" };

export function canAddEntry(
  list: GuestList,
  existingEntries: GuestListEntry[],
  gender: "male" | "female",
  now: Date
): AddEntryResult {
  if (now.getTime() >= new Date(list.deadline_at).getTime()) {
    return { allowed: false, reason: "deadline_passed" };
  }

  const countByGender = existingEntries.filter((e) => e.gender === gender).length;
  const max = gender === "male" ? list.max_men : list.max_women;

  if (countByGender >= max) {
    return { allowed: false, reason: "quota_full" };
  }

  return { allowed: true };
}
