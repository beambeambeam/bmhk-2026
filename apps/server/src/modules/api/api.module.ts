import type { ApiContext, AppRouter } from "@bmhk-2026/api";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Elysia } from "elysia";

function serializeError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: "Unknown API error" };
  }

  const details: {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  } = {
    code: "code" in error ? error.code : undefined,
    message: "message" in error ? error.message : undefined,
    status: "status" in error ? error.status : undefined,
  };

  return {
    code: typeof details.code === "string" ? details.code : undefined,
    message: typeof details.message === "string" ? details.message : "Unknown API error",
    status: typeof details.status === "number" ? details.status : undefined,
  };
}

function createApiContext(request: Request): ApiContext {
  return {
    headers: request.headers,
  };
}

export function createApiModule(router: AppRouter) {
  const rpcHandler = new RPCHandler(router, {
    interceptors: [
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      onError((error) => {
        console.error(serializeError(error));
      }),
    ],
  });
  const openApiHandler = new OpenAPIHandler(router, {
    interceptors: [
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      onError((error) => {
        console.error(serializeError(error));
      }),
    ],
    plugins: [
      new OpenAPIReferencePlugin({
        schemaConverters: [new ZodToJsonSchemaConverter()],
      }),
    ],
  });

  return new Elysia({ name: "api" })
    .all(
      "/rpc*",
      async ({ request }) => {
        const { response } = await rpcHandler.handle(request, {
          context: createApiContext(request),
          prefix: "/rpc",
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
      { parse: "none" },
    )
    .all(
      "/api-reference*",
      async ({ request }) => {
        const { response } = await openApiHandler.handle(request, {
          context: createApiContext(request),
          prefix: "/api-reference",
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
      { parse: "none" },
    );
}
