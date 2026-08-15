import { describe, it, expect } from "vitest";
import { canAddEntry } from "./guestList";
import type { GuestList, GuestListEntry } from "@/lib/types";

const list: GuestList = {
  id: "gl1",
  request_id: "r1",
  max_men: 2,
  max_women: 1,
  deadline_at: "2099-01-01T23:00:00.000Z",
  share_token: "tok",
};

const entry = (gender: "male" | "female", id: string): GuestListEntry => ({
  id,
  guest_list_id: "gl1",
  name: "x",
  gender,
  created_at: "2020-01-01T00:00:00.000Z",
});

describe("canAddEntry", () => {
  it("allows adding when under capacity and before the deadline", () => {
    const result = canAddEntry(list, [], "male", new Date("2020-01-01"));
    expect(result).toEqual({ allowed: true });
  });

  it("rejects when the male quota is full", () => {
    const existing = [entry("male", "e1"), entry("male", "e2")];
    const result = canAddEntry(list, existing, "male", new Date("2020-01-01"));
    expect(result).toEqual({ allowed: false, reason: "quota_full" });
  });

  it("rejects when the female quota is full", () => {
    const existing = [entry("female", "e1")];
    const result = canAddEntry(list, existing, "female", new Date("2020-01-01"));
    expect(result).toEqual({ allowed: false, reason: "quota_full" });
  });

  it("rejects after the deadline has passed", () => {
    const result = canAddEntry(list, [], "male", new Date("2099-06-01"));
    expect(result).toEqual({ allowed: false, reason: "deadline_passed" });
  });

  it("checks the deadline before the quota", () => {
    const existing = [entry("male", "e1"), entry("male", "e2")];
    const result = canAddEntry(list, existing, "male", new Date("2099-06-01"));
    expect(result).toEqual({ allowed: false, reason: "deadline_passed" });
  });

  it("ignores entries of the other gender when counting quota", () => {
    // max_men: 2, and the female quota (max_women: 1) is already full,
    // but that must not affect whether a male entry is allowed.
    const existing = [entry("female", "e1"), entry("female", "e2")];
    const result = canAddEntry(list, existing, "male", new Date("2020-01-01"));
    expect(result).toEqual({ allowed: true });
  });

  it("rejects when now is exactly equal to the deadline", () => {
    const result = canAddEntry(list, [], "male", new Date(list.deadline_at));
    expect(result).toEqual({ allowed: false, reason: "deadline_passed" });
  });

  it("allows adding when one entry below capacity", () => {
    const existing = [entry("male", "e1")];
    const result = canAddEntry(list, existing, "male", new Date("2020-01-01"));
    expect(result).toEqual({ allowed: true });
  });
});
