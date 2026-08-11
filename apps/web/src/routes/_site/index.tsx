import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/features/home/page";

const URL = "https://bangmodhackathon.com/";
const OG_IMAGE = "https://bangmodhackathon.com/og/home.png";

/** `startDate` is the qualifying round (26 ก.ย.), not the registration open date — the
 *  registration window is `offers.validFrom`/`validThrough`, per Google's Event spec. */
const EVENT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Event",
  alternateName: "โครงการแข่งขันแก้ไขปัญหาด้วยการเขียนโปรแกรมคอมพิวเตอร์ ประจำปี 2569",
  audience: {
    "@type": "EducationalAudience",
    audienceType: "นักเรียนระดับมัธยมศึกษาตอนปลายและ ปวช.",
    educationalRole: "student",
  },
  description:
    "การแข่งขันเขียนโปรแกรมภาษา C/C++ ประเภททีม สำหรับนักเรียนระดับมัธยมศึกษาตอนปลายและ ปวช. ชิงเงินรางวัลรวมกว่า 60,000 บาท",
  endDate: "2026-11-07T17:00+07:00",
  eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  image: [OG_IMAGE],
  inLanguage: "th",
  isAccessibleForFree: true,
  location: [
    {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "TH",
        addressLocality: "เขตทุ่งครุ",
        addressRegion: "กรุงเทพมหานคร",
        postalCode: "10140",
        streetAddress: "อาคารวิศววัฒนะ ชั้น 10-11 เลขที่ 126 ถนนประชาอุทิศ แขวงบางมด",
      },
      name: "ภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี",
    },
    {
      "@type": "VirtualLocation",
      url: "https://codern.app",
    },
  ],
  name: "BangMod Hackathon 2026",
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    price: "0",
    priceCurrency: "THB",
    url: "https://bangmodhackathon.com/signin",
    validFrom: "2026-08-17T00:00+07:00",
    validThrough: "2026-09-20T23:59+07:00",
  },
  organizer: {
    "@type": "CollegeOrUniversity",
    name: "ภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี",
    url: URL,
  },
  startDate: "2026-09-26T09:00+07:00",
  url: URL,
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  logo: "https://bangmodhackathon.com/logo.png",
  name: "BangMod Hackathon — Department of Computer Engineering, KMUTT",
  sameAs: ["https://facebook.com/BangmodHackathon", "https://instagram.com/bangmodhack.kmutt"],
  url: URL,
};

export const Route = createFileRoute("/_site/")({
  component: HomePage,
  head: () => ({
    links: [{ href: URL, rel: "canonical" }],
    meta: [
      { title: "BangMod Hackathon 2026 | แข่งขันเขียนโปรแกรม C/C++ ม.ปลาย–ปวช." },
      {
        content:
          "การแข่งขันเขียนโปรแกรม C/C++ ประเภททีม ระดับมัธยมศึกษาตอนปลายและ ปวช. ชิงเงินรางวัลรวมกว่า 60,000 บาท จัดโดยภาควิชาวิศวกรรมคอมพิวเตอร์ มจธ. รับสมัคร 17 ส.ค.–20 ก.ย. 2569",
        name: "description",
      },
      { content: "website", property: "og:type" },
      {
        content:
          "BangMod Hackathon 2026 — การแข่งขันเขียนโปรแกรมคอมพิวเตอร์ ระดับมัธยมศึกษาตอนปลายและอาชีวศึกษา",
        property: "og:title",
      },
      {
        content:
          "การแข่งขันเขียนโปรแกรม C/C++ ประเภททีม ทีมละ 2–3 คน ชิงเงินรางวัลรวมกว่า 60,000 บาท พร้อมสิทธิ์เข้ารับการพิจารณาสอบสัมภาษณ์คณะวิศวกรรมศาสตร์ มจธ. เปิดรับสมัครถึง 20 ก.ย. 2569",
        property: "og:description",
      },
      { content: OG_IMAGE, property: "og:image" },
      { content: URL, property: "og:url" },
      { content: "summary_large_image", name: "twitter:card" },
      { "script:ld+json": EVENT_JSON_LD },
      { "script:ld+json": ORGANIZATION_JSON_LD },
    ],
  }),
});
