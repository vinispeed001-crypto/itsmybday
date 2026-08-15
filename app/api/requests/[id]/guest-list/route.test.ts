import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockEventsInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "requests") {
        return { select: () => ({ eq: () => ({ single: mockSingle }) }) };
      }
      if (table === "guest_lists") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
          insert: mockInsert,
        };
      }
      return { insert: mockEventsInsert };
    },
  }),
}));

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return { ...actual, randomUUID: () => "fixed-token-1234" };
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/requests/req-1/guest-list", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/requests/[id]/guest-list", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockSingle.mockReset();
    mockMaybeSingle.mockReset();
    mockInsert.mockReset();
    mockEventsInsert.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockSingle.mockResolvedValue({ data: { status: "approved" }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("returns 401 without an authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ max_men: 2, max_women: 2, deadline_at: "2099-01-01T20:00:00.000Z" }), {
      params: { id: "req-1" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the request doesn't exist", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await POST(makeRequest({ max_men: 2, max_women: 2, deadline_at: "2099-01-01T20:00:00.000Z" }), {
      params: { id: "req-1" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when the request isn't approved", async () => {
    mockSingle.mockResolvedValue({ data: { status: "pending" }, error: null });
    const res = await POST(makeRequest({ max_men: 2, max_women: 2, deadline_at: "2099-01-01T20:00:00.000Z" }), {
      params: { id: "req-1" },
    });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid payload", async () => {
    const res = await POST(makeRequest({}), { params: { id: "req-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 409 when a guest list already exists for this request", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "gl-existing" }, error: null });
    const res = await POST(
      makeRequest({ max_men: 2, max_women: 2, deadline_at: "2099-01-01T20:00:00.000Z" }),
      { params: { id: "req-1" } }
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("guest_list_already_exists");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 409 when the insert loses a create race to the unique constraint", async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { code: "23505", message: "duplicate key value" },
          }),
      }),
    });

    const res = await POST(
      makeRequest({ max_men: 2, max_women: 2, deadline_at: "2099-01-01T20:00:00.000Z" }),
      { params: { id: "req-1" } }
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("guest_list_already_exists");
    expect(mockEventsInsert).not.toHaveBeenCalled();
  });

  it("creates the guest list with a generated share token and a whatsapp event", async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "gl-1", share_token: "fixed-token-1234" }, error: null }),
      }),
    });
    mockEventsInsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({ max_men: 2, max_women: 2, deadline_at: "2099-01-01T20:00:00.000Z" }),
      { params: { id: "req-1" } }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.share_token).toBe("fixed-token-1234");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ request_id: "req-1", max_men: 2, max_women: 2, share_token: "fixed-token-1234" })
    );
    expect(mockEventsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ request_id: "req-1", type: "whatsapp_notification", payload: { kind: "guest_list_link", share_token: "fixed-token-1234" } }),
    ]);
  });
});
