import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuestListForm } from "./GuestListForm";

describe("GuestListForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "gl-1", share_token: "abc123" }),
    })) as unknown as typeof fetch;
  });

  it("creates the list and shows the shareable link", async () => {
    render(<GuestListForm requestId="req-1" />);

    await userEvent.type(screen.getByLabelText(/máximo de homens/i), "10");
    await userEvent.type(screen.getByLabelText(/máximo de mulheres/i), "10");
    await userEvent.type(screen.getByLabelText(/horário limite/i), "2099-01-01T20:00");
    await userEvent.click(screen.getByRole("button", { name: /gerar lista/i }));

    await waitFor(() => {
      expect(screen.getByText(/\/lista\/abc123/)).toBeInTheDocument();
    });
  });

  it("shows an error and does not display a link when creation fails", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    render(<GuestListForm requestId="req-1" />);

    await userEvent.type(screen.getByLabelText(/máximo de homens/i), "10");
    await userEvent.type(screen.getByLabelText(/máximo de mulheres/i), "10");
    await userEvent.type(screen.getByLabelText(/horário limite/i), "2099-01-01T20:00");
    await userEvent.click(screen.getByRole("button", { name: /gerar lista/i }));

    await waitFor(() => {
      expect(screen.getByText(/não deu pra criar/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/\/lista\//)).not.toBeInTheDocument();
  });
});
