import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Input } from "@/components/input";
import { NativeSelect, NativeSelectOption } from "@/components/native-select";

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

function AdminUsersFilter({
  email,
  name,
  roleFilter,
  roles,
  onEmailChange,
  onNameChange,
  onRoleChange,
}: AdminUsersFilterProps) {
  return (
    <FieldGroup className="gap-3 sm:ml-auto sm:w-auto sm:flex-row">
      <Field className="sm:w-64">
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
      <Field className="sm:w-64">
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
      <Field className="sm:w-48">
        <FieldLabel htmlFor="admin-user-role">Role</FieldLabel>
        <NativeSelect
          id="admin-user-role"
          className="w-full"
          value={roleFilter}
          onChange={(event) => {
            const nextRole = event.target.value;

            if (nextRole === "all" || isAuthRole(nextRole, roles)) {
              onRoleChange(nextRole);
            }
          }}
        >
          <NativeSelectOption value="all">All roles</NativeSelectOption>
          {roles.map((allowedRole) => (
            <NativeSelectOption key={allowedRole} value={allowedRole}>
              {allowedRole}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </FieldGroup>
  );
}

export { AdminUsersFilter };
