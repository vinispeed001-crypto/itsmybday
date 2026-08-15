import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequestsList } from "./RequestsList";
import type { GuestRequest } from "@/lib/types";

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();
const mockRemoveChannel = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    channel: () => ({ on: mockOn, subscribe: mockSubscribe }),
    removeChannel: mockRemoveChannel,
  }),
}));

const pendingRequest: GuestRequest = {
  id: "r1",
  venue_id: "v1",
  requester_name: "Camila Souza",
  event_date: "2099-01-01",
  event_time: "22:00",
  quantity: 12,
  instagram: "camila.s",
  whatsapp: "+5511999999999",
  referred_by_profile_id: null,
  status: "pending",
  denial_reason: null,
  created_at: "2098-01-01T00:00:00.000Z",
};

describe("RequestsList", () => {
  beforeEach(() => {
    mockOn.mockClear();
    mockSubscribe.mockClear();
    mockRemoveChannel.mockClear();
  });

  it("renders the initial pending requests", () => {
    render(<RequestsList initialRequests={[pendingRequest]} />);
    expect(screen.getByText("Camila Souza")).toBeInTheDocument();
    expect(screen.getByText(/12 pessoas/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no pending requests", () => {
    render(<RequestsList initialRequests={[]} />);
    expect(screen.getByText(/nenhum pedido pendente/i)).toBeInTheDocument();
  });

  it("subscribes to realtime updates on mount", () => {
    render(<RequestsList initialRequests={[]} />);
    expect(mockOn).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });
});
