import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionPanel } from "./DecisionPanel";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("DecisionPanel", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "approved" }) })) as unknown as typeof fetch;
  });

  it("approves with one click", async () => {
    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /aceitar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/requests/req-1/decision",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ decision: "approve" }) })
      );
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("shows an error and does not refresh when approval fails", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: "internal_error" }) })) as unknown as typeof fetch;

    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /aceitar/i }));

    await waitFor(() => {
      expect(screen.getByText(/não deu pra aprovar o pedido/i)).toBeInTheDocument();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("requires a reason before denying", async () => {
    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /negar/i }));

    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/informe um motivo com pelo menos 3 caracteres/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/motivo/i), "Lotação máxima pra essa data");
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/requests/req-1/decision",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ decision: "deny", denial_reason: "Lotação máxima pra essa data" }),
        })
      );
    });
  });

  it("trims the reason before sending it", async () => {
    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /negar/i }));

    await userEvent.type(screen.getByLabelText(/motivo/i), "   Sem vaga hoje   ");
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/requests/req-1/decision",
        expect.objectContaining({
          body: JSON.stringify({ decision: "deny", denial_reason: "Sem vaga hoje" }),
        })
      );
    });
  });

  it("shows an error and does not refresh when denial fails", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: "internal_error" }) })) as unknown as typeof fetch;

    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /negar/i }));
    await userEvent.type(screen.getByLabelText(/motivo/i), "Lotação máxima pra essa data");
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(screen.getByText(/não deu pra negar o pedido/i)).toBeInTheDocument();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("cancels the deny form and clears reason and error", async () => {
    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /negar/i }));

    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(screen.getByText(/informe um motivo com pelo menos 3 caracteres/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/motivo/i), "Algum motivo");
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByLabelText(/motivo/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /negar/i }));
    expect(screen.getByLabelText(/motivo/i)).toHaveValue("");
    expect(screen.queryByText(/informe um motivo com pelo menos 3 caracteres/i)).not.toBeInTheDocument();
  });
});
