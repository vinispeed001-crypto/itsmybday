import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockInsert = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/requests", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/requests", () => {
  beforeEach(() => {
    mockInsert.mockReset();
  });

  it("rejects an invalid payload", async () => {
    const res = await POST(makeRequest({ requester_name: "a" }));
    expect(res.status).toBe(400);
  });

  it("inserts a valid request and returns 201", async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: { id: "req-1" },
            error: null,
          }),
      }),
    });

    const res = await POST(
      makeRequest({
        requester_name: "Camila Souza",
        event_date: "2099-01-01",
        event_time: "22:00",
        quantity: 12,
        instagram: "camila.s",
        whatsapp: "+5511999999999",
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("req-1");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requester_name: "Camila Souza",
        venue_id: "00000000-0000-0000-0000-000000000001",
        status: "pending",
      })
    );
  });

  it("returns a generic 500 error when the Supabase insert fails", async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { message: "boom" },
          }),
      }),
    });

    const res = await POST(
      makeRequest({
        requester_name: "Camila Souza",
        event_date: "2099-01-01",
        event_time: "22:00",
        quantity: 12,
        instagram: "camila.s",
        whatsapp: "+5511999999999",
      })
    );

    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "internal_error" });
  });
});
