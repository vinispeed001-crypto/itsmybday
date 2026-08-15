import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvailabilityForm } from "./AvailabilityForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AvailabilityForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "created" }) })) as unknown as typeof fetch;
  });

  it("adds a new open slot", async () => {
    render(<AvailabilityForm />);

    await userEvent.type(screen.getByLabelText(/data/i), "2099-01-01");
    await userEvent.type(screen.getByLabelText(/horário/i), "22:00");
    await userEvent.click(screen.getByRole("button", { name: /adicionar horário/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/availability-admin",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ event_date: "2099-01-01", time: "22:00" }),
        })
      );
    });
  });

  it("shows an error when adding a duplicate or invalid slot fails", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    render(<AvailabilityForm />);

    await userEvent.type(screen.getByLabelText(/data/i), "2099-01-01");
    await userEvent.type(screen.getByLabelText(/horário/i), "22:00");
    await userEvent.click(screen.getByRole("button", { name: /adicionar horário/i }));

    await waitFor(() => {
      expect(screen.getByText(/não deu pra adicionar/i)).toBeInTheDocument();
    });
  });
});
