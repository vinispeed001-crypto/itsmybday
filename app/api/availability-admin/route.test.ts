import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ insert: mockInsert }),
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/availability-admin", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/availability-admin", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockInsert.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  });

  it("returns 401 without an authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ event_date: "2099-01-01", time: "22:00" }));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid time format", async () => {
    const res = await POST(makeRequest({ event_date: "2099-01-01", time: "10pm" }));
    expect(res.status).toBe(400);
  });

  it("creates an open slot for the default venue", async () => {
    mockInsert.mockResolvedValue({ error: null });
    const res = await POST(makeRequest({ event_date: "2099-01-01", time: "22:00" }));
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith({
      venue_id: "00000000-0000-0000-0000-000000000001",
      event_date: "2099-01-01",
      time: "22:00",
      is_open: true,
    });
  });
});
