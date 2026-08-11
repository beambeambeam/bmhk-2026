import { createFileRoute } from "@tanstack/react-router";
import HallOfFamePage from "@/features/hall-of-fame/page";

const URL = "https://bangmodhackathon.com/hall-of-fame";

const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", item: "https://bangmodhackathon.com/", name: "หน้าหลัก", position: 1 },
    { "@type": "ListItem", item: URL, name: "หอเกียรติยศ", position: 2 },
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

export const Route = createFileRoute("/_site/hall-of-fame")({
  component: HallOfFamePage,
  head: () => ({
    links: [{ href: URL, rel: "canonical" }],
    meta: [
      { title: "หอเกียรติยศ | ทำเนียบผู้ได้รับรางวัล BangMod Hackathon" },
      {
        content:
          "ข้อมูลโครงการ BangMod Hackathon โดยภาควิชาวิศวกรรมคอมพิวเตอร์ มจธ. พร้อมทำเนียบสถานศึกษาที่ได้รับรางวัล ประจำปี 2566–2568",
        name: "description",
      },
      { content: "article", property: "og:type" },
      { content: "หอเกียรติยศ | ทำเนียบผู้ได้รับรางวัล BangMod Hackathon", property: "og:title" },
      {
        content:
          "ข้อมูลโครงการ BangMod Hackathon โดยภาควิชาวิศวกรรมคอมพิวเตอร์ มจธ. พร้อมทำเนียบสถานศึกษาที่ได้รับรางวัล ประจำปี 2566–2568",
        property: "og:description",
      },
      { content: "https://bangmodhackathon.com/og/home.png", property: "og:image" },
      { content: URL, property: "og:url" },
      { content: "summary_large_image", name: "twitter:card" },
      { "script:ld+json": BREADCRUMB_JSON_LD },
      { "script:ld+json": ORGANIZATION_JSON_LD },
    ],
  }),
});
