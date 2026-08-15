import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HouseRulesForm } from "./HouseRulesForm";

describe("HouseRulesForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "updated" }) })) as unknown as typeof fetch;
  });

  it("saves the edited content", async () => {
    render(<HouseRulesForm initialContent="Texto antigo" />);

    const textarea = screen.getByLabelText(/regras da casa/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Texto novo");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/house-rules",
        expect.objectContaining({ method: "PUT", body: JSON.stringify({ content: "Texto novo" }) })
      );
    });
    expect(screen.getByText(/salvo/i)).toBeInTheDocument();
  });

  it("shows an error when the save fails", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    render(<HouseRulesForm initialContent="Texto antigo" />);

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/não deu pra salvar/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/salvo!/i)).not.toBeInTheDocument();
  });
});
