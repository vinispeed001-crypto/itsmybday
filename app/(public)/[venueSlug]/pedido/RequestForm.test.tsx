import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestForm } from "./RequestForm";

describe("RequestForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "req-1" }),
    })) as unknown as typeof fetch;
  });

  it("submits the form and shows a confirmation", async () => {
    render(<RequestForm venueSlug="300-sky-bar" />);

    await userEvent.type(screen.getByLabelText(/nome/i), "Camila Souza");
    await userEvent.type(screen.getByLabelText(/data/i), "2026-09-01");
    await userEvent.type(screen.getByLabelText(/horário/i), "20:00");
    await userEvent.type(screen.getByLabelText(/quantidade/i), "12");
    await userEvent.type(screen.getByLabelText(/instagram/i), "camila.s");
    await userEvent.type(screen.getByLabelText(/whatsapp/i), "+5511999999999");
    await userEvent.click(screen.getByRole("button", { name: /enviar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText(/pedido enviado/i)).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/requests",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows a generic error when the server rejects the request", async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    render(<RequestForm venueSlug="300-sky-bar" />);

    await userEvent.type(screen.getByLabelText(/nome/i), "Camila Souza");
    await userEvent.type(screen.getByLabelText(/data/i), "2026-09-01");
    await userEvent.type(screen.getByLabelText(/horário/i), "20:00");
    await userEvent.type(screen.getByLabelText(/quantidade/i), "12");
    await userEvent.type(screen.getByLabelText(/instagram/i), "camila.s");
    await userEvent.type(screen.getByLabelText(/whatsapp/i), "+5511999999999");
    await userEvent.click(screen.getByRole("button", { name: /enviar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText(/não deu pra enviar/i)).toBeInTheDocument();
    });
  });

  it("blocks submission client-side when date/time are missing, without calling fetch", async () => {
    render(<RequestForm venueSlug="300-sky-bar" />);

    await userEvent.type(screen.getByLabelText(/nome/i), "Camila Souza");
    await userEvent.type(screen.getByLabelText(/quantidade/i), "12");
    await userEvent.type(screen.getByLabelText(/instagram/i), "camila.s");
    await userEvent.type(screen.getByLabelText(/whatsapp/i), "+5511999999999");
    await userEvent.click(screen.getByRole("button", { name: /enviar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText(/escolha a data e o horário/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
