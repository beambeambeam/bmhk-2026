// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminUserRole } from "../role";
import type { AdminUser, AuthRole } from "../types";

// oxlint-disable-next-line vitest/prefer-import-in-mock -- This boundary fake supplies only the role mutation used by the component.
vi.mock("@bmhk-2026/client/orpc", () => ({
  orpc: {
    adminUsers: {
      list: {
        key: () => ["adminUsers", "list"],
      },
      setRole: {
        mutationOptions: () => ({
          mutationFn: (input: { role: AuthRole; userId: string }) => input,
        }),
      },
    },
  },
}));

const user = {
  email: "staff@kmutt.ac.th",
  id: "staff-user",
  name: "Staff User",
  role: "staff",
} as const satisfies AdminUser;

describe("admin user role", () => {
  afterEach(() => {
    cleanup();
  });

  it("edits a displayed role through a confirmed dialog", async () => {
    const handleRoleUpdated = vi.fn<(role: AuthRole) => void>();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AdminUserRole
          isCurrentUser={false}
          roles={["admin", "staff", "user"]}
          user={user}
          onRoleUpdated={handleRoleUpdated}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText("staff")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit role for staff@kmutt.ac.th" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit role for staff@kmutt.ac.th" }));

    const roleDialog = await screen.findByRole("dialog", { name: "Edit user role" });
    expect(roleDialog).toBeTruthy();

    fireEvent.click(screen.getByRole("combobox", { name: "Role" }));
    const adminOption = await screen.findByRole("option", { name: "admin" });
    fireEvent.pointerDown(adminOption);
    fireEvent.click(adminOption);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    const confirmationDialog = await screen.findByRole("alertdialog", {
      name: "Confirm role change?",
    });
    expect(confirmationDialog.textContent).toContain("from staff to admin");

    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));

    await waitFor(() => {
      expect(handleRoleUpdated).toHaveBeenCalledWith("admin");
    });
    expect(screen.queryByRole("dialog", { name: "Edit user role" })).toBeNull();
  });

  it("disables role editing for the current user", () => {
    const handleRoleUpdated = vi.fn<(role: AuthRole) => void>();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AdminUserRole
          isCurrentUser
          roles={["admin", "staff", "user"]}
          user={user}
          onRoleUpdated={handleRoleUpdated}
        />
      </QueryClientProvider>,
    );

    const editButton = screen.getByRole("button", {
      name: "Edit role for staff@kmutt.ac.th",
    });

    expect(editButton.getAttribute("disabled")).not.toBeNull();
    fireEvent.click(editButton);

    expect(screen.queryByRole("dialog", { name: "Edit user role" })).toBeNull();
    expect(handleRoleUpdated).not.toHaveBeenCalled();
  });
});
