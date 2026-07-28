import type { EvlogOrpcContext } from "evlog/orpc";

export interface ApiContext extends EvlogOrpcContext {
  headers: Headers;
}
