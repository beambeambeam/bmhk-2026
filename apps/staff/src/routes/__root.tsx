import { Toaster } from "@/components/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/tooltip";
import type { orpc } from "@bmhk-2026/client/orpc";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import appCss from "../index.css?url";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,

  head: () => ({
    links: [
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      { crossOrigin: "anonymous", href: "https://fonts.gstatic.com", rel: "preconnect" },
      {
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap",
        rel: "stylesheet",
      },
      {
        href: "/assets/figma/81a21a35c9efb8c6f5073ba1753e4d8cf1cf97c7.svg",
        rel: "icon",
        type: "image/svg+xml",
      },
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "Staff BMHK2026",
      },
      {
        content: "noindex, nofollow",
        name: "robots",
      },
    ],
  }),
});

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-thai">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange enableSystem>
          <TooltipProvider>
            <Outlet />
          </TooltipProvider>
          <Toaster richColors />
          <TanStackRouterDevtools position="top-right" />
          <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}
