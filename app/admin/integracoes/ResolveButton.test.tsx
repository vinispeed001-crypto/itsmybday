import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResolveButton } from "./ResolveButton";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ResolveButton", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "resolved" }) })) as unknown as typeof fetch;
  });

  it("calls the resolve endpoint on click", async () => {
    render(<ResolveButton eventId="ev-1" />);
    await userEvent.click(screen.getByRole("button", { name: /marcar como feito/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/integration-events/ev-1/resolve",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows an error and stays visible when the resolve call fails", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    render(<ResolveButton eventId="ev-1" />);
    await userEvent.click(screen.getByRole("button", { name: /marcar como feito/i }));

    await waitFor(() => {
      expect(screen.getByText(/não deu pra marcar/i)).toBeInTheDocument();
    });
  });
});
