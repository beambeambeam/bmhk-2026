import { createFileRoute } from "@tanstack/react-router";
import HallOfFamePage from "@/features/hall-of-fame/page";

export const Route = createFileRoute("/_site/hall-of-fame")({
  component: HallOfFamePage,
});
