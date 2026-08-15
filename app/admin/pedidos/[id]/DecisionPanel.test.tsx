import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionPanel } from "./DecisionPanel";

describe("DecisionPanel", () => {
  beforeEach(() => {
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
  });

  it("requires a reason before denying", async () => {
    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /negar/i }));

    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(global.fetch).not.toHaveBeenCalled();

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
});
