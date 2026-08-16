import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { orpc } from "@bmhk-2026/client/orpc";
import { createQueryClient } from "@bmhk-2026/client/query-client";

import NotFound from "./components/not-found";
import { routeTree } from "./routeTree.gen";

import { trackAuthNav } from "./components/form/wizard-nav";

export function getRouter() {
  const queryClient = createQueryClient();
  const router = createTanStackRouter({
    context: { orpc, queryClient },
    defaultNotFoundComponent: () => <NotFound />,
    // defaultPendingComponent: () => <Loader />,
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  });

  if (typeof window !== "undefined") {
    trackAuthNav(router as any);
  }

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
