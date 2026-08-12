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

import { isAuthRole } from "./types";
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

const allRolesOption = { label: "All roles", value: "all" } as const satisfies RoleOption;

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
        label: role,
        value: role,
      })),
    ],
    [roles],
  );
  const selectedRole =
    roleOptions.find((roleOption) => roleOption.value === roleFilter) ?? allRolesOption;

  return (
    <FieldGroup className="grid w-full grid-cols-1 gap-3 lg:ml-auto lg:w-auto lg:grid-cols-[16rem_16rem_12rem]">
      <Field className="w-full">
        <FieldLabel htmlFor="admin-user-email">Email</FieldLabel>
        <Input
          id="admin-user-email"
          placeholder="Search email"
          type="search"
          value={email}
          onChange={(event) => {
            onEmailChange(event.target.value);
          }}
        />
      </Field>
      <Field className="w-full">
        <FieldLabel htmlFor="admin-user-name">Name</FieldLabel>
        <Input
          id="admin-user-name"
          placeholder="Search name"
          type="search"
          value={name}
          onChange={(event) => {
            onNameChange(event.target.value);
          }}
        />
      </Field>
      <Field className="w-full">
        <FieldLabel htmlFor="admin-user-role">Role</FieldLabel>
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
          <ComboboxInput id="admin-user-role" className="w-full" placeholder="Search roles" />
          <ComboboxContent>
            <ComboboxEmpty>No roles found.</ComboboxEmpty>
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
