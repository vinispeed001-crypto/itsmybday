import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ update: mockUpdate }),
  }),
}));

describe("POST /api/integration-events/[id]/resolve", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockUpdate.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  });

  it("returns 401 without an authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(new NextRequest("http://localhost/api/integration-events/ev-1/resolve", { method: "POST" }), {
      params: { id: "ev-1" },
    });
    expect(res.status).toBe(401);
  });

  it("marks the event as sent", async () => {
    mockUpdate.mockReturnValue({
      eq: () => ({ select: () => Promise.resolve({ data: [{ id: "ev-1" }], error: null }) }),
    });
    const res = await POST(new NextRequest("http://localhost/api/integration-events/ev-1/resolve", { method: "POST" }), {
      params: { id: "ev-1" },
    });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ status: "sent", resolved_at: expect.any(String) });
  });

  it("returns 404 when no event matches the id", async () => {
    mockUpdate.mockReturnValue({
      eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
    });
    const res = await POST(new NextRequest("http://localhost/api/integration-events/ev-1/resolve", { method: "POST" }), {
      params: { id: "ev-1" },
    });
    expect(res.status).toBe(404);
  });
});
