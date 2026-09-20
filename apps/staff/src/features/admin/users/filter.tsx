import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/combobox";
import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Input } from "@/components/input";
import { useMemo } from "react";

import { getAuthRoleLabel, isAuthRole } from "./types";
import type { AuthRole, RoleFilter } from "./types";

interface AdminUsersFilterProps {
  readonly email: string;
  readonly name: string;
  readonly roleFilter: RoleFilter;
  readonly roles: readonly AuthRole[];
  readonly onEmailChange: (email: string) => void;
  readonly onNameChange: (name: string) => void;
  readonly onRoleChange: (role: RoleFilter) => void;
}

interface RoleOption {
  readonly label: string;
  readonly value: RoleFilter;
}

const allRolesOption = { label: "ทุกบทบาท", value: "all" } as const satisfies RoleOption;

function AdminUsersFilter({
  email,
  name,
  roleFilter,
  roles,
  onEmailChange,
  onNameChange,
  onRoleChange,
}: AdminUsersFilterProps) {
  const roleOptions = useMemo<RoleOption[]>(
    () => [
      allRolesOption,
      ...roles.map((role) => ({
        label: getAuthRoleLabel(role),
        value: role,
      })),
    ],
    [roles],
  );
  const selectedRole =
    roleOptions.find((roleOption) => roleOption.value === roleFilter) ?? allRolesOption;

  return (
    <FieldGroup className="grid w-full grid-cols-1 gap-3 lg:w-auto lg:grid-cols-[16rem_16rem_16rem_12rem]">
      <Field className="w-full">
        <FieldLabel htmlFor="admin-user-email">อีเมล</FieldLabel>
        <Input
          id="admin-user-email"
          placeholder="ค้นหาอีเมล"
          type="search"
          value={email}
          onChange={(event) => {
            onEmailChange(event.target.value);
          }}
        />
      </Field>
      <Field className="w-full">
        <FieldLabel>โดเมนอีเมล</FieldLabel>
        <p className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
          ลงท้ายด้วย @kmutt.ac.th
        </p>
      </Field>
      <Field className="w-full">
        <FieldLabel htmlFor="admin-user-name">ชื่อ</FieldLabel>
        <Input
          id="admin-user-name"
          placeholder="ค้นหาชื่อ"
          type="search"
          value={name}
          onChange={(event) => {
            onNameChange(event.target.value);
          }}
        />
      </Field>
      <Field className="w-full">
        <FieldLabel htmlFor="admin-user-role">บทบาท</FieldLabel>
        <Combobox
          items={roleOptions}
          itemToStringValue={(roleOption) => roleOption.label}
          value={selectedRole}
          onValueChange={(roleOption) => {
            if (
              roleOption !== null &&
              (roleOption.value === "all" || isAuthRole(roleOption.value, roles))
            ) {
              onRoleChange(roleOption.value);
            }
          }}
        >
          <ComboboxInput id="admin-user-role" className="w-full" placeholder="ค้นหาบทบาท" />
          <ComboboxContent>
            <ComboboxEmpty>ไม่พบบทบาท</ComboboxEmpty>
            <ComboboxList>
              {(roleOption: RoleOption) => (
                <ComboboxItem key={roleOption.value} value={roleOption}>
                  {roleOption.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Field>
    </FieldGroup>
  );
}

export { AdminUsersFilter };
