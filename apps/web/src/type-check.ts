/* oxlint-disable no-unused-vars */
/* eslint-disable no-unused-vars */
import type { authClient } from "@bmhk-2026/client/auth-client";

type RefetchType = ReturnType<typeof authClient.useSession>["refetch"];
let x: RefetchType;
