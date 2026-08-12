import {
  columnFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

import type { AdminUser, AuthRole } from "./types";

interface AdminUsersTableMeta {
  readonly roleDrafts: Readonly<Record<string, AuthRole>>;
  readonly roles: readonly AuthRole[];
  readonly updatingUserId?: string;
  readonly onRoleDraftChange: (userId: string, role: AuthRole) => void;
  readonly onUpdateRole: (user: AdminUser) => void;
}

interface AdminUsersColumnMeta {
  readonly cellClassName?: string;
  readonly headerClassName?: string;
}

const adminUsersTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnMeta: metaHelper<AdminUsersColumnMeta>(),
  rowPaginationFeature,
  rowSortingFeature,
  tableMeta: metaHelper<AdminUsersTableMeta>(),
});

type AdminUsersTableFeatures = typeof adminUsersTableFeatures;

export { adminUsersTableFeatures, type AdminUsersTableFeatures };
