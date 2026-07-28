import type { ProtectedProcedure } from "../../core/procedure";

export function createPrivateDataRouter(protectedProcedure: ProtectedProcedure) {
  return {
    get: protectedProcedure.handler(({ context }) => ({
      message: "This is private",
      user: context.session.user,
    })),
  };
}
