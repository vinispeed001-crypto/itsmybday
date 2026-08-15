import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockUpsert = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "requests") {
        return { select: () => ({ eq: () => ({ single: mockSingle }) }) };
      }
      return { upsert: mockUpsert };
    },
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/requests/req-1/classification", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/requests/[id]/classification", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockUpsert.mockReset();
    mockSingle.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockSingle.mockResolvedValue({ data: { status: "approved" }, error: null });
  });

  it("returns 401 without an authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ type: "tudo_vip" }), { params: { id: "req-1" } });
    expect(res.status).toBe(401);
  });

  it("rejects vip_ate_hora without vip_until_time", async () => {
    const res = await POST(makeRequest({ type: "vip_ate_hora" }), { params: { id: "req-1" } });
    expect(res.status).toBe(400);
  });

  it("saves a valid classification", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({ type: "valor_genero", value_male: 200, value_female: 100 }),
      { params: { id: "req-1" } }
    );

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-1",
        type: "valor_genero",
        value_male: 200,
        value_female: 100,
      }),
      { onConflict: "request_id" }
    );
  });

  it("returns 409 when the request is not approved", async () => {
    mockSingle.mockResolvedValue({ data: { status: "pending" }, error: null });

    const res = await POST(makeRequest({ type: "tudo_vip" }), { params: { id: "req-1" } });

    expect(res.status).toBe(409);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 404 when the request does not exist", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const res = await POST(makeRequest({ type: "tudo_vip" }), { params: { id: "req-1" } });

    expect(res.status).toBe(404);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
