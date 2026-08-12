import {
  columnFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

import type { AdminUser, AuthRole } from "./types";

interface AdminUsersTableMeta {
  readonly currentUserId?: string;
  readonly roles: readonly AuthRole[];
  readonly updatingUserId?: string;
  readonly onUpdateRole: (user: AdminUser, role: AuthRole) => Promise<boolean>;
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
