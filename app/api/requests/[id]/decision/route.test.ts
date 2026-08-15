import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "requests") {
        return { update: mockUpdate };
      }
      return { insert: mockInsert };
    },
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/requests/req-1/decision", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/requests/[id]/decision", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockInsert.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  });

  it("returns 401 when there is no authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ decision: "approve" }), { params: { id: "req-1" } });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid payload", async () => {
    const res = await POST(makeRequest({ decision: "deny" }), { params: { id: "req-1" } });
    expect(res.status).toBe(400);
  });

  it("approves and creates getin + whatsapp integration events", async () => {
    mockUpdate.mockReturnValue({
      eq: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{ id: "req-1" }], error: null }) }) }),
    });
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(makeRequest({ decision: "approve" }), { params: { id: "req-1" } });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", decided_by: "admin-1" })
    );
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ request_id: "req-1", type: "getin_reservation" }),
      expect.objectContaining({ request_id: "req-1", type: "whatsapp_notification" }),
    ]);
  });

  it("denies with a reason and creates a whatsapp integration event", async () => {
    mockUpdate.mockReturnValue({
      eq: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{ id: "req-1" }], error: null }) }) }),
    });
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({ decision: "deny", denial_reason: "Lotação máxima pra essa data" }),
      { params: { id: "req-1" } }
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "denied", denial_reason: "Lotação máxima pra essa data" })
    );
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ request_id: "req-1", type: "whatsapp_notification" }),
    ]);
  });

  it("returns 409 when approving a request that is no longer pending", async () => {
    mockUpdate.mockReturnValue({
      eq: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }),
    });

    const res = await POST(makeRequest({ decision: "approve" }), { params: { id: "req-1" } });

    expect(res.status).toBe(409);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 409 when denying a request that is no longer pending", async () => {
    mockUpdate.mockReturnValue({
      eq: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }),
    });

    const res = await POST(
      makeRequest({ decision: "deny", denial_reason: "Lotação máxima pra essa data" }),
      { params: { id: "req-1" } }
    );

    expect(res.status).toBe(409);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
