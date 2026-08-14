import { Link, CreateFileRoute, createFileRoute } from '@tanstack/react-router'
import AuthPageShell, { RESULT_ACTION, ResultCard } from '@/components/auth-page-shell'
import { authLink } from '@/components/form/wizard-nav'

/**
 * Figma 708:2022 at 1440, 1297:421 at 402.
 *
 * Copy re-verified character for character against both frames: the title is `708:2029` /
 * `1297:503` and the two lines are `708:2030` / `1297:504` split on that node's own newline.
 * The two frames agree on every string here, so there is no desktop-wins call to make.
 */
export const Route = createFileRoute("/register/success")({
  component: SuccessStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

export default function SuccessStep() {
  return (
    <AuthPageShell>
      <ResultCard
        image="/assets/figma/8e7000b311d9ed819a112098ef1a6399fc8d8743.png"
        title="ลงทะเบียนเข้าแข่งขันสำเร็จ"
        lines={[
          'กรุณารอทีมงานตรวจสอบข้อมูลและเอกสาร',
          'คุณสามารถตรวจสอบสิทธิ์การเข้าแข่งขันได้ที่ทีมของฉัน',
        ]}
        action={
          /* the dashboard shares none of this flow's named elements, so `leave` asks for
             the plain crossfade rather than pretending something carries over. */
          <Link {...authLink('/my-team', 'leave')} className={RESULT_ACTION}>
            {/* `group_3_light`: 20 on `1297:568` → 28 on `708:2032`. `size-7` was the 1440 box
                held flat, i.e. a 28px mark in a pill Figma draws 49 tall on a phone. Lands on
                28.000 at `--fl` = 1; the gap beside it ramps 16 → 20 in `RESULT_ACTION`.
                Re-verified, and NOT the replaced-element trap: `size-` sets both axes, and the
                file's own intrinsic box is 28x28, so box and glyph move together. */}
            <img
              src="/assets/figma/c17718ad4d456345bef1d48d85cea6708137ea6e.svg"
              alt=""
              aria-hidden
              className="size-[calc(19.792px_+_8.208*var(--fl))]"
            />
            ไปยังทีมของฉัน
          </Link>
        }
      />
    </AuthPageShell>
  )
}
