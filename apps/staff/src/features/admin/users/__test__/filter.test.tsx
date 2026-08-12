// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminUsersFilter } from "../filter";
import type { RoleFilter } from "../types";

describe("admin users filter", () => {
  it("searches email, name, and server-provided roles independently", async () => {
    const onEmailChange = vi.fn<(value: string) => void>();
    const onNameChange = vi.fn<(value: string) => void>();
    const onRoleChange = vi.fn<(value: RoleFilter) => void>();

    render(
      <AdminUsersFilter
        email=""
        name=""
        roleFilter="all"
        roles={["admin", "staff"]}
        onEmailChange={onEmailChange}
        onNameChange={onNameChange}
        onRoleChange={onRoleChange}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Email" }), {
      target: { value: "@kmutt.ac.th" },
    });
    fireEvent.change(screen.getByRole("searchbox", { name: "Name" }), {
      target: { value: "Beam" },
    });
    const roleCombobox = screen.getByRole("combobox", { name: "Role" });
    expect(roleCombobox).toBeInstanceOf(HTMLInputElement);

    fireEvent.focus(roleCombobox);
    fireEvent.change(roleCombobox, { target: { value: "staff" } });
    fireEvent.keyDown(roleCombobox, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "staff" }));

    expect(onEmailChange).toHaveBeenCalledWith("@kmutt.ac.th");
    expect(onNameChange).toHaveBeenCalledWith("Beam");
    expect(onRoleChange).toHaveBeenCalledWith("staff");
  });
});
