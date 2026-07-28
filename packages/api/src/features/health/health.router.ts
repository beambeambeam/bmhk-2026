import type { PublicProcedure } from "../../core/procedure";

export function createHealthRouter(publicProcedure: PublicProcedure) {
  return {
    check: publicProcedure.handler(() => "OK"),
  };
}
