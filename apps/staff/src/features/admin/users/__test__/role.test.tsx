// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminUserRole } from "../role";
import { getAuthRoleLabel } from "../types";
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

  it.each(["admin", "superAdmin"] as const)("sets %s through a confirmed dialog", async (role) => {
    const handleRoleUpdated = vi.fn<(role: AuthRole) => void>();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AdminUserRole
          isCurrentUser={false}
          roles={["superAdmin", "admin", "staff", "user"]}
          user={user}
          onRoleUpdated={handleRoleUpdated}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText("ทีมงาน")).toBeTruthy();
    expect(screen.getByRole("button", { name: "แก้ไขบทบาทของ staff@kmutt.ac.th" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "แก้ไขบทบาทของ staff@kmutt.ac.th" }));

    const roleDialog = await screen.findByRole("dialog", { name: "แก้ไขบทบาทผู้ใช้" });
    expect(roleDialog).toBeTruthy();

    fireEvent.click(screen.getByRole("combobox", { name: "บทบาท" }));
    const adminOption = await screen.findByRole("option", { name: getAuthRoleLabel(role) });
    fireEvent.pointerDown(adminOption);
    fireEvent.click(adminOption);
    fireEvent.click(screen.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง" }));

    const confirmationDialog = await screen.findByRole("alertdialog", {
      name: "ยืนยันการเปลี่ยนบทบาทหรือไม่",
    });
    expect(confirmationDialog.textContent).toContain(`จาก ทีมงาน เป็น ${getAuthRoleLabel(role)}`);

    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการเปลี่ยนแปลง" }));

    await waitFor(() => {
      expect(handleRoleUpdated).toHaveBeenCalledWith(role);
    });
    expect(screen.queryByRole("dialog", { name: "แก้ไขบทบาทผู้ใช้" })).toBeNull();
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
      name: "แก้ไขบทบาทของ staff@kmutt.ac.th",
    });

    expect(editButton.getAttribute("disabled")).not.toBeNull();
    fireEvent.click(editButton);

    expect(screen.queryByRole("dialog", { name: "แก้ไขบทบาทผู้ใช้" })).toBeNull();
    expect(handleRoleUpdated).not.toHaveBeenCalled();
  });
});
