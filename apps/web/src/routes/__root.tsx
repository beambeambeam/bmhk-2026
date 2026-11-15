import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import CookieConsent from "@/components/cookie-consent";

import appCss from "../index.css?url";

export const Route = createRootRoute({
  component: RootDocument,

  head: () => ({
    links: [
      { href: appCss, rel: "stylesheet" },
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      { crossOrigin: "anonymous", href: "https://fonts.gstatic.com", rel: "preconnect" },
      {
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap",
        rel: "stylesheet",
      },
      { href: "/favicon.png", rel: "icon" },
      { href: "/apple-touch-icon.png", rel: "apple-touch-icon", sizes: "180x180" },
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
        title: "BangMod Hackathon 2026",
      },
    ],
  }),
});

function RootDocument() {
  return (
    <html lang="th" className="light">
      <head>
        <HeadContent />
      </head>
      <body className="font-thai">
        <Outlet />
        <CookieConsent />
        <TanStackRouterDevtools position="bottom-left" />
        <Scripts />
      </body>
    </html>
  );
}
