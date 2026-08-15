import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignOutButton } from "./SignOutButton";

const mockSignOut = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

describe("SignOutButton", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
  });

  it("signs out and redirects to /admin/login", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole("button", { name: /sair/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/admin/login");
    });
  });
});
