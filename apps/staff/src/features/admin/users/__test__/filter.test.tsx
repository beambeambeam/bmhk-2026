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

    const { rerender } = render(
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

    fireEvent.change(screen.getByRole("searchbox", { name: "อีเมล" }), {
      target: { value: "@kmutt.ac.th" },
    });
    fireEvent.change(screen.getByRole("searchbox", { name: "ชื่อ" }), {
      target: { value: "Beam" },
    });
    expect(screen.getByRole("combobox", { name: "โดเมนอีเมล" }).textContent).toContain("อีเมลทั้งหมด");
    fireEvent.click(screen.getByRole("combobox", { name: "โดเมนอีเมล" }));
    const emailDomainOption = await screen.findByRole("option", {
      name: "ลงท้ายด้วย @kmutt.ac.th",
    });
    fireEvent.pointerDown(emailDomainOption);
    fireEvent.click(emailDomainOption);
    rerender(
      <AdminUsersFilter
        email=""
        emailDomainFilter="kmutt.ac.th"
        name=""
        roleFilter="all"
        roles={["admin", "staff"]}
        onEmailChange={onEmailChange}
        onEmailDomainChange={onEmailDomainChange}
        onNameChange={onNameChange}
        onRoleChange={onRoleChange}
      />,
    );
    expect(screen.getByRole("combobox", { name: "โดเมนอีเมล" }).textContent).toContain(
      "ลงท้ายด้วย @kmutt.ac.th",
    );
    const roleCombobox = screen.getByRole("combobox", { name: "บทบาท" });
    expect(roleCombobox).toBeInstanceOf(HTMLInputElement);

    fireEvent.focus(roleCombobox);
    fireEvent.change(roleCombobox, { target: { value: "ทีมงาน" } });
    fireEvent.keyDown(roleCombobox, { key: "ArrowDown" });
    const roleOption = await screen.findByRole("option", { name: "ทีมงาน" });
    fireEvent.pointerDown(roleOption);
    fireEvent.click(roleOption);

    expect({
      email: onEmailChange.mock.calls,
      emailDomain: onEmailDomainChange.mock.calls,
      name: onNameChange.mock.calls,
      role: onRoleChange.mock.calls,
    }).toStrictEqual({
      email: [["@kmutt.ac.th"]],
      emailDomain: [["kmutt.ac.th"]],
      name: [["Beam"]],
      role: [["staff"]],
    });
  });
});
