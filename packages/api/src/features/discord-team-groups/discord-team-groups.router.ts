import type { AdminProcedure } from "../../core/procedure";
import { teamGroupAssignmentResetAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import {
  teamGroupAssignmentInputSchema,
  teamGroupAssignmentResultSchema,
  teamWithGroupListSchema,
} from "./discord-team-groups.schema";
import type { DiscordTeamGroupsService } from "./discord-team-groups.service";

export function createDiscordTeamGroupsAdminRouter(
  adminProcedure: AdminProcedure,
  service: DiscordTeamGroupsService,
) {
  return {
    assignGroups: adminProcedure
      .route({ method: "POST", tags: ["Team Groups"] })
      .input(teamGroupAssignmentInputSchema)
      .output(teamGroupAssignmentResultSchema)
      .handler(async ({ context, input }) => {
        // A dry run makes no state change, so it skips audit logging entirely rather than
        // recording a preview as if it were the real, committed reassignment.
        if (input.dryRun === true) {
          return await service.assignGroups(input);
        }

        return await executeAudited({
          audit: teamGroupAssignmentResetAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: "team-group-assignment" },
          }),
          execute: async () => await service.assignGroups(input),
          log: context.log,
          onSuccess: (result) => ({ changes: { after: result } }),
        });
      }),
    listTeams: adminProcedure
      .route({ method: "GET", tags: ["Team Groups"] })
      .output(teamWithGroupListSchema)
      .handler(async () => await service.listTeamsWithGroup()),
  };
}
