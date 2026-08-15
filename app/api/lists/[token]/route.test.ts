import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

const mockSingle = vi.fn();
const mockEntriesSelect = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: (table: string) => {
      if (table === "guest_lists") {
        return { select: () => ({ eq: () => ({ single: mockSingle }) }) };
      }
      return { select: () => ({ eq: mockEntriesSelect }) };
    },
  }),
}));

describe("GET /api/lists/[token]", () => {
  beforeEach(() => {
    mockSingle.mockReset();
    mockEntriesSelect.mockReset();
  });

  it("returns 404 when the token does not match any list", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await GET(new NextRequest("http://localhost/api/lists/bad-token"), {
      params: { token: "bad-token" },
    });
    expect(res.status).toBe(404);
  });

  it("returns the list with its entries", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "gl-1", max_men: 2, max_women: 2, deadline_at: "2099-01-01T00:00:00.000Z", share_token: "tok" },
      error: null,
    });
    mockEntriesSelect.mockResolvedValue({ data: [{ id: "e1", name: "João", gender: "male" }], error: null });

    const res = await GET(new NextRequest("http://localhost/api/lists/tok"), { params: { token: "tok" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.list.id).toBe("gl-1");
    expect(body.entries).toHaveLength(1);
  });
});
