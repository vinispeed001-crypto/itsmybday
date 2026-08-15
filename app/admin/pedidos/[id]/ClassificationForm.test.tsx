import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassificationForm } from "./ClassificationForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ClassificationForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "classified" }) })) as unknown as typeof fetch;
  });

  it("submits valor_genero with both values", async () => {
    render(<ClassificationForm requestId="req-1" />);

    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), "valor_genero");
    await userEvent.type(screen.getByLabelText(/valor homem/i), "200");
    await userEvent.type(screen.getByLabelText(/valor mulher/i), "100");
    await userEvent.click(screen.getByRole("button", { name: /salvar classificação/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/requests/req-1/classification",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ type: "valor_genero", value_male: 200, value_female: 100 }),
        })
      );
    });
  });

  it("shows only the vip_until_time field for vip_ate_hora", async () => {
    render(<ClassificationForm requestId="req-1" />);
    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), "vip_ate_hora");

    expect(screen.getByLabelText(/até que horário/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/valor homem/i)).not.toBeInTheDocument();
  });

  it("shows an error and does not refresh when the save fails", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    render(<ClassificationForm requestId="req-1" />);

    await userEvent.click(screen.getByRole("button", { name: /salvar classificação/i }));

    await waitFor(() => {
      expect(screen.getByText(/não deu pra salvar/i)).toBeInTheDocument();
    });
  });
});
