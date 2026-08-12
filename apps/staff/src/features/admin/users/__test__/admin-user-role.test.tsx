// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminUserRole } from "../admin-user-role";
import type { AdminUser, AuthRole } from "../types";

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
    const handleUpdateRole = vi.fn<(user: AdminUser, role: AuthRole) => Promise<boolean>>();
    handleUpdateRole.mockResolvedValue(true);

    render(
      <AdminUserRole
        isCurrentUser={false}
        isUpdating={false}
        roles={["admin", "staff", "user"]}
        user={user}
        handleUpdateRole={handleUpdateRole}
      />,
    );

    expect(screen.getByText("staff")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit role for staff@kmutt.ac.th" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit role for staff@kmutt.ac.th" }));

    const roleDialog = await screen.findByRole("dialog", { name: "Edit user role" });
    expect(roleDialog).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Role" }), {
      target: { value: "admin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    const confirmationDialog = await screen.findByRole("alertdialog", {
      name: "Confirm role change?",
    });
    expect(confirmationDialog.textContent).toContain("from staff to admin");

    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));

    await waitFor(() => {
      expect(handleUpdateRole).toHaveBeenCalledWith(user, "admin");
    });
    expect(screen.queryByRole("dialog", { name: "Edit user role" })).toBeNull();
  });

  it("disables role editing for the current user", () => {
    const handleUpdateRole = vi.fn<(user: AdminUser, role: AuthRole) => Promise<boolean>>();

    render(
      <AdminUserRole
        isCurrentUser
        isUpdating={false}
        roles={["admin", "staff", "user"]}
        user={user}
        handleUpdateRole={handleUpdateRole}
      />,
    );

    const editButton = screen.getByRole("button", {
      name: "Edit role for staff@kmutt.ac.th",
    });

    expect(editButton.getAttribute("disabled")).not.toBeNull();
    fireEvent.click(editButton);

    expect(screen.queryByRole("dialog", { name: "Edit user role" })).toBeNull();
    expect(handleUpdateRole).not.toHaveBeenCalled();
  });
});
