import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockListSingle = vi.fn();
const mockEntriesSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: (table: string) => {
      if (table === "guest_lists") {
        return { select: () => ({ eq: () => ({ single: mockListSingle }) }) };
      }
      if (table === "guest_list_entries") {
        return {
          select: () => ({ eq: () => ({ returns: mockEntriesSelect }) }),
          insert: mockInsert,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/lists/tok/entries", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/lists/[token]/entries", () => {
  beforeEach(() => {
    mockListSingle.mockReset();
    mockEntriesSelect.mockReset();
    mockInsert.mockReset();
    mockListSingle.mockResolvedValue({
      data: { id: "gl-1", max_men: 1, max_women: 1, deadline_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
  });

  it("returns 404 for an unknown token", async () => {
    mockListSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await POST(makeRequest({ name: "João", gender: "male" }), { params: { token: "bad" } });
    expect(res.status).toBe(404);
  });

  it("rejects when the quota is full", async () => {
    mockEntriesSelect.mockResolvedValue({ data: [{ id: "e1", gender: "male" }], error: null });
    const res = await POST(makeRequest({ name: "Pedro", gender: "male" }), { params: { token: "tok" } });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.reason).toBe("quota_full");
  });

  it("adds the entry when there is room before the deadline", async () => {
    mockEntriesSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(makeRequest({ name: "João", gender: "male" }), { params: { token: "tok" } });

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith({ guest_list_id: "gl-1", name: "João", gender: "male" });
  });

  it("returns 409 quota_full when the DB capacity trigger rejects a race-losing insert", async () => {
    // The application-level canAddEntry check passed on a stale read (room
    // available), but a concurrent request beat this one to the last slot;
    // the guest_list_capacity_guard trigger catches it at insert time.
    mockEntriesSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({
      error: { code: "P0001", message: "guest_list_capacity_exceeded" },
    });

    const res = await POST(makeRequest({ name: "João", gender: "male" }), { params: { token: "tok" } });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.reason).toBe("quota_full");
  });
});
