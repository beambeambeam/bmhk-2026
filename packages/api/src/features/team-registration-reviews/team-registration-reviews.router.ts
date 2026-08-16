import type { RegistrationProcedure, TeamOwnerProcedure } from "../../core/procedure";
import { teamRegistrationReviewChangedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import type { TeamRegistrationReviewService } from "./team-registration-reviews.service";
import {
  saveTeamRegistrationReviewSchema,
  saveTeamRegistrationReviewSubjectSchema,
  teamRegistrationReviewFeedbackSchema,
  teamRegistrationReviewListInputSchema,
  teamRegistrationReviewListResultSchema,
  teamRegistrationReviewSchema,
  teamRegistrationReviewTeamInputSchema,
} from "./team-registration-reviews.schema";
import type { TeamRegistrationReview } from "./team-registration-reviews.schema";

function toAuditedReview(review: TeamRegistrationReview) {
  return {
    advisorIssueCodes: review.advisorIssueCodes,
    participant1IssueCodes: review.participant1IssueCodes,
    participant2IssueCodes: review.participant2IssueCodes,
    participant3IssueCodes: review.participant3IssueCodes,
    status: review.status,
  };
}

export function createTeamRegistrationReviewsRouter(
  registrationProcedure: RegistrationProcedure,
  teamOwnerProcedure: TeamOwnerProcedure,
  service: TeamRegistrationReviewService,
) {
  return {
    feedback: teamOwnerProcedure
      .route({ method: "GET", tags: ["Team Registration Review"] })
      .input(teamRegistrationReviewTeamInputSchema)
      .output(teamRegistrationReviewFeedbackSchema)
      .handler(async ({ context, input }) => {
        const feedback = await service.getFeedback(context.teamAccess, input.teamId);
        context.log.set({ teamRegistrationReviewFeedback: { teamId: input.teamId } });
        return feedback;
      }),
    get: registrationProcedure
      .route({ method: "GET", tags: ["Team Registration Review"] })
      .input(teamRegistrationReviewTeamInputSchema)
      .output(teamRegistrationReviewSchema.nullable())
      .handler(async ({ context, input }) => {
        const review = await service.get(context.teamAccess, input.teamId);
        context.log.set({ teamRegistrationReview: { teamId: input.teamId } });
        return review;
      }),
    list: registrationProcedure
      .route({ method: "GET", tags: ["Team Registration Review"] })
      .input(teamRegistrationReviewListInputSchema)
      .output(teamRegistrationReviewListResultSchema)
      .handler(async ({ input }) => await service.list(input)),
    save: registrationProcedure
      .route({ method: "PUT", tags: ["Team Registration Review"] })
      .input(saveTeamRegistrationReviewSchema)
      .output(teamRegistrationReviewSchema)
      .handler(async ({ context, input }) => {
        const { review } = await executeAudited({
          audit: teamRegistrationReviewChangedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.teamId, teamId: input.teamId },
          }),
          execute: async () => await service.save(context.teamAccess, input.teamId, input.data),
          log: context.log,
          onSuccess: (result) => ({
            changes: result.previous
              ? {
                  after: toAuditedReview(result.review),
                  before: toAuditedReview(result.previous),
                }
              : { after: toAuditedReview(result.review) },
            target: {
              id: input.teamId,
              reviewId: result.review.id,
              teamId: input.teamId,
              type: "team-registration-review",
            },
          }),
        });

        context.log.set({ teamRegistrationReview: { id: review.id, teamId: review.teamId } });
        return review;
      }),
    saveSubject: registrationProcedure
      .route({ method: "PUT", tags: ["Team Registration Review"] })
      .input(saveTeamRegistrationReviewSubjectSchema)
      .output(teamRegistrationReviewSchema)
      .handler(async ({ context, input }) => {
        const { review } = await executeAudited({
          audit: teamRegistrationReviewChangedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.teamId, teamId: input.teamId },
          }),
          execute: async () =>
            await service.saveSubject(context.teamAccess, input.teamId, input.data),
          log: context.log,
          onSuccess: (result) => ({
            changes: result.previous
              ? { after: toAuditedReview(result.review), before: toAuditedReview(result.previous) }
              : { after: toAuditedReview(result.review) },
            target: {
              id: input.teamId,
              reviewId: result.review.id,
              teamId: input.teamId,
              type: "team-registration-review",
            },
          }),
        });
        context.log.set({ teamRegistrationReview: { id: review.id, teamId: review.teamId } });
        return review;
      }),
  };
}
