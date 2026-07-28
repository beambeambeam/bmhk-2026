import type { PublicProcedure } from "../../core";

export function createHealthRouter(publicProcedure: PublicProcedure) {
  return {
    check: publicProcedure.handler(() => "OK"),
  };
}
