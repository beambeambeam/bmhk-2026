import { createFileRoute } from "@tanstack/react-router";
import { AboutDecor } from "@/features/guide/guidePage/about-decor";
import ScopeSection from "@/features/guide/guidePage/scope-section";
import CodernSection from "@/features/guide/guidePage/codern-section";
import FaqSection from "@/features/guide/guidePage/faq-section";
import ContactSection from "@/features/guide/guidePage/contact-section";
import { FAQS } from "@/features/guide/data/about-data";

const URL = "https://bangmodhackathon.com/guide";

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  inLanguage: "th",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    acceptedAnswer: { "@type": "Answer", text: faq.a },
    name: faq.q,
  })),
};

const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", item: "https://bangmodhackathon.com/", name: "หน้าหลัก", position: 1 },
    { "@type": "ListItem", item: URL, name: "คู่มือการแข่งขัน", position: 2 },
  ],
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  logo: "https://bangmodhackathon.com/logo.png",
  name: "BangMod Hackathon — Department of Computer Engineering, KMUTT",
  sameAs: ["https://facebook.com/BangmodHackathon", "https://instagram.com/bangmodhack.kmutt"],
  url: "https://bangmodhackathon.com/",
};

export const Route = createFileRoute("/_site/guide")({
  component: RouteComponent,
  head: () => ({
    links: [{ href: URL, rel: "canonical" }],
    meta: [
      { title: "คู่มือการแข่งขัน | ขอบเขตเนื้อหาและข้อกำหนด BangMod Hackathon 2026" },
      {
        content:
          "ขอบเขตเนื้อหาการแข่งขัน 3 กลุ่มวิชา คณิตศาสตร์ วิทยาการคอมพิวเตอร์ อัลกอริทึม พร้อมคู่มือแพลตฟอร์ม Codern และคำถามที่พบบ่อยของ BangMod Hackathon 2026",
        name: "description",
      },
      { content: "article", property: "og:type" },
      {
        content: "คู่มือการแข่งขัน | ขอบเขตเนื้อหาและข้อกำหนด BangMod Hackathon 2026",
        property: "og:title",
      },
      {
        content:
          "ขอบเขตเนื้อหาการแข่งขัน 3 กลุ่มวิชา คณิตศาสตร์ วิทยาการคอมพิวเตอร์ อัลกอริทึม พร้อมคู่มือแพลตฟอร์ม Codern และคำถามที่พบบ่อยของ BangMod Hackathon 2026",
        property: "og:description",
      },
      { content: "https://bangmodhackathon.com/og/home.png", property: "og:image" },
      { content: URL, property: "og:url" },
      { content: "summary_large_image", name: "twitter:card" },
      { "script:ld+json": FAQ_JSON_LD },
      { "script:ld+json": BREADCRUMB_JSON_LD },
      { "script:ld+json": ORGANIZATION_JSON_LD },
    ],
  }),
});

export default function RouteComponent() {
  return (
    /* The height of background frame 935:858 — see the note in Home.tsx; same defect, the
       tomatoes and pots were landing on the footer's link columns. */
    /* `overflow-x-clip`: see the note on the same class in Home.tsx. */
    <div className="relative isolate overflow-x-clip min-[1440px]:min-h-[4888px]">
      <h1 className="sr-only">
        คู่มือการแข่งขัน BangMod Hackathon 2026 — ขอบเขตเนื้อหา แพลตฟอร์ม Codern และคำถามที่พบบ่อย
      </h1>
      <AboutDecor />
      <ScopeSection />
      <CodernSection />
      <FaqSection />
      <ContactSection />
    </div>
  );
}
