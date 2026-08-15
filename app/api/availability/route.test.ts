import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

const mockSelect = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

describe("GET /api/availability", () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it("returns 400 when venue query param is missing", async () => {
    const req = new NextRequest("http://localhost/api/availability");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns the open slots for the venue", async () => {
    mockSelect.mockReturnValue({
      eq: () => ({
        gte: () =>
          Promise.resolve({
            data: [{ id: "1", venue_id: "v1", event_date: "2099-01-01", time: "22:00", is_open: true }],
            error: null,
          }),
      }),
    });

    const req = new NextRequest("http://localhost/api/availability?venue=300-sky-bar");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.slots).toHaveLength(1);
  });

  it("returns a generic 500 error when the Supabase query fails", async () => {
    mockSelect.mockReturnValue({
      eq: () => ({
        gte: () =>
          Promise.resolve({
            data: null,
            error: { message: "boom" },
          }),
      }),
    });

    const req = new NextRequest("http://localhost/api/availability?venue=300-sky-bar");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "internal_error" });
  });
});
