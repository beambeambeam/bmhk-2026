import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
  staff: ["access", "registration_access"],
} as const;

const ac = createAccessControl(statement);

const admin = ac.newRole({
  staff: ["access", "registration_access"],
  ...adminAc.statements,
});

const staff = ac.newRole({
  staff: ["access"],
  ...userAc.statements,
});

const registrationStaff = ac.newRole({
  staff: ["access", "registration_access"],
  ...userAc.statements,
});

const user = ac.newRole({
  ...userAc.statements,
});

export { ac, admin, staff, registrationStaff, user };
