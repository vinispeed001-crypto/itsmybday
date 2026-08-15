import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({ eq: () => ({ single: mockSingle }) }),
      update: mockUpdate,
    }),
  }),
}));

describe("/api/house-rules", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockSingle.mockReset();
    mockUpdate.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  });

  it("GET returns 401 without an authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns the current rules", async () => {
    mockSingle.mockResolvedValue({ data: { content: "Dress code: esporte fino." }, error: null });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.content).toBe("Dress code: esporte fino.");
  });

  it("PUT returns 401 without an authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/api/house-rules", {
      method: "PUT",
      body: JSON.stringify({ content: "novo texto" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("PUT updates the rules", async () => {
    mockUpdate.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const req = new NextRequest("http://localhost/api/house-rules", {
      method: "PUT",
      body: JSON.stringify({ content: "novo texto" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ content: "novo texto", updated_at: expect.any(String) });
  });
});
