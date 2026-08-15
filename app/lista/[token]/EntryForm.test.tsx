import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryForm } from "./EntryForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("EntryForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "added" }) })) as unknown as typeof fetch;
  });

  it("adds a name and clears the input", async () => {
    render(<EntryForm token="tok" />);

    await userEvent.type(screen.getByLabelText(/nome do convidado/i), "João");
    await userEvent.selectOptions(screen.getByLabelText(/gênero/i), "male");
    await userEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/lists/tok/entries",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "João", gender: "male" }) })
      );
    });
  });

  it("shows a quota-full message on 409", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ reason: "quota_full" }) })) as unknown as typeof fetch;
    render(<EntryForm token="tok" />);

    await userEvent.type(screen.getByLabelText(/nome do convidado/i), "João");
    await userEvent.selectOptions(screen.getByLabelText(/gênero/i), "male");
    await userEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    await waitFor(() => {
      expect(screen.getByText(/vagas esgotadas/i)).toBeInTheDocument();
    });
  });
});
