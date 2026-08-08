import { createFileRoute } from "@tanstack/react-router";
import { AboutDecor } from "@/features/guide/guidePage/about-decor";
import ScopeSection from "@/features/guide/guidePage/scope-section";
import CodernSection from "@/features/guide/guidePage/codern-section";
import FaqSection from "@/features/guide/guidePage/faq-section";
import ContactSection from "@/features/guide/guidePage/contact-section";

export const Route = createFileRoute("/_site/guide")({
  component: RouteComponent,
});

export default function RouteComponent() {
  return (
    /* The height of background frame 935:858 — see the note in Home.tsx; same defect, the
       tomatoes and pots were landing on the footer's link columns. */
    /* `overflow-x-clip`: see the note on the same class in Home.tsx. */
    <div className="relative isolate overflow-x-clip lg:min-h-[4888px]">
      <AboutDecor />
      <ScopeSection />
      <CodernSection />
      <FaqSection />
      <ContactSection />
    </div>
  );
}
