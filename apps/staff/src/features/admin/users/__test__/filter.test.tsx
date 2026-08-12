// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminUsersFilter } from "../filter";
import type { RoleFilter } from "../types";

describe("admin users filter", () => {
  it("searches email and name independently using server-provided roles", () => {
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
    fireEvent.change(screen.getByRole("combobox", { name: "Role" }), {
      target: { value: "staff" },
    });

    expect(onEmailChange).toHaveBeenCalledWith("@kmutt.ac.th");
    expect(onNameChange).toHaveBeenCalledWith("Beam");
    expect(onRoleChange).toHaveBeenCalledWith("staff");
    expect(screen.getByRole("option", { name: "admin" })).toBeDefined();
    expect(screen.getByRole("option", { name: "staff" })).toBeDefined();
  });
});
