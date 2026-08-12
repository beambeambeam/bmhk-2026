// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminUsersFilter } from "../filter";
import type { EmailDomainFilter, RoleFilter } from "../types";

describe("admin users filter", () => {
  it("searches email, name, and server-provided roles independently", async () => {
    const onEmailChange = vi.fn<(value: string) => void>();
    const onEmailDomainChange = vi.fn<(value: EmailDomainFilter) => void>();
    const onNameChange = vi.fn<(value: string) => void>();
    const onRoleChange = vi.fn<(value: RoleFilter) => void>();

    render(
      <AdminUsersFilter
        email=""
        emailDomainFilter="all"
        name=""
        roleFilter="all"
        roles={["admin", "staff"]}
        onEmailChange={onEmailChange}
        onEmailDomainChange={onEmailDomainChange}
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
    fireEvent.click(screen.getByRole("combobox", { name: "Email domain" }));
    const emailDomainOption = await screen.findByRole("option", {
      name: "End with @kmutt.ac.th",
    });
    fireEvent.pointerDown(emailDomainOption);
    fireEvent.click(emailDomainOption);
    const roleCombobox = screen.getByRole("combobox", { name: "Role" });
    expect(roleCombobox).toBeInstanceOf(HTMLInputElement);

    fireEvent.focus(roleCombobox);
    fireEvent.change(roleCombobox, { target: { value: "staff" } });
    fireEvent.keyDown(roleCombobox, { key: "ArrowDown" });
    const roleOption = await screen.findByRole("option", { name: "staff" });
    fireEvent.pointerDown(roleOption);
    fireEvent.click(roleOption);

    expect(onEmailChange).toHaveBeenCalledWith("@kmutt.ac.th");
    expect(onEmailDomainChange).toHaveBeenCalledWith("kmutt.ac.th");
    expect(onNameChange).toHaveBeenCalledWith("Beam");
    expect(onRoleChange).toHaveBeenCalledWith("staff");
  });
});
