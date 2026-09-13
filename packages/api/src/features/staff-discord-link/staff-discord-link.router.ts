import type { ProtectedProcedure } from "../../core/procedure";
import { staffDiscordLinkedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import {
  staffDiscordLinkInputSchema,
  staffDiscordLinkResultSchema,
} from "./staff-discord-link.schema";
import type { StaffDiscordLinkService } from "./staff-discord-link.service";

export function createStaffDiscordLinkRouter(
  protectedProcedure: ProtectedProcedure,
  service: StaffDiscordLinkService,
) {
  return {
    link: protectedProcedure
      .route({ method: "POST", tags: ["Staff Discord Link"] })
      .input(staffDiscordLinkInputSchema)
      .output(staffDiscordLinkResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: staffDiscordLinkedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: context.session.user.id },
            }),
            execute: async () =>
              await service.link({
                token: input.token,
                userId: context.session.user.id,
                userName: context.session.user.name,
                userRole: context.session.user.role,
              }),
            log: context.log,
            onSuccess: (result) => ({ changes: { after: { status: result.status } } }),
          }),
      ),
  };
}
