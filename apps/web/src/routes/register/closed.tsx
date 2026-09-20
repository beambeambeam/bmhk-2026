import { createFileRoute } from "@tanstack/react-router";
import AuthPageShell, { ResultCard } from "@/components/auth-page-shell";

export const Route = createFileRoute("/register/closed")({
  component: ClosedStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

function ClosedStep() {
  return (
    <AuthPageShell muted>
      <ResultCard
        image="/assets/figma/88a60428462d844f1f3ed64f3d0783097c2d33ac.png"
        title="หมดเวลารับสมัคร"
        titleClassName="text-brand-red"
        lines={["ไว้พบกันใหม่ในการแข่งขันรอบหน้า"]}
      />
    </AuthPageShell>
  );
}
