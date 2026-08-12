import { metaHelper, rowPaginationFeature, tableFeatures } from "@tanstack/react-table";

import type { AuthRole, StaffUser } from "./types";

interface AdminUsersTableMeta {
  readonly roleDrafts: Readonly<Record<string, AuthRole>>;
  readonly updatingUserId?: string;
  readonly onRoleDraftChange: (userId: string, role: AuthRole) => void;
  readonly onUpdateRole: (user: StaffUser) => void;
}

interface AdminUsersColumnMeta {
  readonly cellClassName?: string;
  readonly headerClassName?: string;
}

const adminUsersTableFeatures = tableFeatures({
  columnMeta: metaHelper<AdminUsersColumnMeta>(),
  rowPaginationFeature,
  tableMeta: metaHelper<AdminUsersTableMeta>(),
});

type AdminUsersTableFeatures = typeof adminUsersTableFeatures;

export { adminUsersTableFeatures, type AdminUsersTableFeatures };
