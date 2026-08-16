import { Link } from "@tanstack/react-router";
import AuthPageShell, { RESULT_ACTION, ResultCard } from "@/components/auth-page-shell";
import { useAuthBackLink } from "@/components/form/wizard-nav";
import { createFileRoute } from "@tanstack/react-router";
/**
 * Figma 708:2260 at 1440, 1297:597 at 402 — the failure state desaturates the page's colour
 * blocks to grey.
 *
 * Copy re-verified on both frames: title `708:2267` / `1297:616`, the single line
 * `708:2268` / `1297:617`, the pill's label `708:2270` / `1297:621`. `text-brand-red` is
 * Figma's own #c0563e on the title node, and only on the title — the description stays #282828.
 *
 * DELIBERATE divergence from the phone frame, which desktop wins: `1297:618` hangs a
 * `group_3_light` mark (`1297:619`) in the ลองอีกครั้ง pill, where `708:2269` has the label and
 * nothing else. The 402 frames are the older pass and this is one of their stale leftovers, so
 * the pill stays label-only. Success is the screen that legitimately carries a glyph.
 */
export const Route = createFileRoute("/register/error")({
  component: ErrorStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

export default function ErrorStep() {
  const authBack = useAuthBackLink();

  return (
    <AuthPageShell muted>
      <ResultCard
        image="/assets/figma/88a60428462d844f1f3ed64f3d0783097c2d33ac.png"
        title="ลงทะเบียนเข้าแข่งขันไม่สำเร็จ"
        titleClassName="text-brand-red"
        lines={["เกิดข้อผิดพลาดขึ้นในระหว่างการลงทะเบียน กรุณาลองอีกครั้ง"]}
        action={
          /* `submit-back`, not `back`: this undoes the submit, so it is the whole result
             screen coming apart — the colour blocks sink away and the wizard's pasta spills
             back in — not a step sliding sideways. And when the terms step is genuinely the
             entry behind this one, it is reached by popping it, so the user's answers and
             their scroll position come back with it. */
          <Link {...authBack("/register/terms", "submit-back")} className={RESULT_ACTION}>
            ลองอีกครั้ง
          </Link>
        }
      />
    </AuthPageShell>
  );
}
