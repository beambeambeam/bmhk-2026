import { createFileRoute } from "@tanstack/react-router";
import ComingSoon from "@/features/coming-soon/coming-soon";

export const Route = createFileRoute("/coming-soon")({
  component: ComingSoon,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});
