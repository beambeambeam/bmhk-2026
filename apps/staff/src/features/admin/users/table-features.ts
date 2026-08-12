import {
  columnFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

import type { AuthRole } from "./types";

interface AdminUsersTableMeta {
  readonly currentUserId?: string;
  readonly handleRoleUpdated: (role: AuthRole) => void;
  readonly roles: readonly AuthRole[];
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
