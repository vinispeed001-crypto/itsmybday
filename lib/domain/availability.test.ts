import { describe, it, expect } from "vitest";
import { filterOpenFutureSlots } from "./availability";
import type { AvailabilitySlot } from "@/lib/types";

const slot = (overrides: Partial<AvailabilitySlot>): AvailabilitySlot => ({
  id: "1",
  venue_id: "v1",
  event_date: "2099-01-01",
  time: "22:00",
  is_open: true,
  ...overrides,
});

describe("filterOpenFutureSlots", () => {
  it("keeps only slots that are open", () => {
    const slots = [slot({ id: "a", is_open: true }), slot({ id: "b", is_open: false })];
    const result = filterOpenFutureSlots(slots, new Date("2098-01-01"));
    expect(result.map((s) => s.id)).toEqual(["a"]);
  });

  it("excludes slots whose date already passed", () => {
    const slots = [
      slot({ id: "past", event_date: "2020-01-01" }),
      slot({ id: "future", event_date: "2099-01-01" }),
    ];
    const result = filterOpenFutureSlots(slots, new Date("2098-01-01"));
    expect(result.map((s) => s.id)).toEqual(["future"]);
  });

  it("includes a slot dated exactly today", () => {
    const today = new Date("2098-06-15T10:00:00Z");
    const slots = [slot({ id: "today", event_date: "2098-06-15" })];
    const result = filterOpenFutureSlots(slots, today);
    expect(result.map((s) => s.id)).toEqual(["today"]);
  });
});
