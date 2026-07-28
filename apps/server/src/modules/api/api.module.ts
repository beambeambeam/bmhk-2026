import type { ApiContext, AppRouter } from "@bmhk-2026/api";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Elysia } from "elysia";
import { useLogger } from "evlog/elysia";

function useApiContext(request: Request): ApiContext {
  return {
    headers: request.headers,
    log: useLogger(),
  };
}

export function createApiModule(router: AppRouter) {
  const rpcHandler = new RPCHandler(router);
  const openApiHandler = new OpenAPIHandler(router, {
    plugins: [
      new OpenAPIReferencePlugin({
        schemaConverters: [new ZodToJsonSchemaConverter()],
      }),
    ],
  });

  const api = new Elysia({ name: "api" })
    .all(
      "/rpc*",
      async ({ request, set }) => {
        const { response } = await rpcHandler.handle(request, {
          context: useApiContext(request),
          prefix: "/rpc",
        });

        const finalResponse = response ?? new Response("Not Found", { status: 404 });
        set.status = finalResponse.status;
        return finalResponse;
      },
      { parse: "none" },
    )
    .all(
      "/api-reference*",
      async ({ request, set }) => {
        const { response } = await openApiHandler.handle(request, {
          context: useApiContext(request),
          prefix: "/api-reference",
        });

        const finalResponse = response ?? new Response("Not Found", { status: 404 });
        set.status = finalResponse.status;
        return finalResponse;
      },
      { parse: "none" },
    );

  return api;
}
