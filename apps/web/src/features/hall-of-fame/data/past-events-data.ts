export const PAST_INTRO = {
  /*
   * The run of three spaces before "โดยนักเรียน" is in the Figma copy, so the paragraphs
   * render with `whitespace-pre-wrap` rather than letting the browser collapse it.
   */
  paragraphs: [
    "โครงการนี้เปิดโอกาสให้นักเรียนระดับมัธยมศึกษาตอนปลาย ปวช. หรือเทียบเท่า เข้าร่วมการแข่งขันเขียนโปรแกรมด้วยภาษา C/C++ ในรูปแบบทีม เพื่อเสริมสร้างทักษะการเขียนโปรแกรม การทำงานร่วมกัน และการแก้ไขปัญหาภายใต้เงื่อนไขเวลาที่กำหนด พร้อมชิงเงินรางวัลรวมกว่า 60,000 บาท",
    "ภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี เล็งเห็นว่าการเตรียมความพร้อมของนักเรียนระดับมัธยมศึกษาตอนปลายจำเป็นต้องอาศัยการพัฒนาทักษะในด้านต่าง ๆ อย่างต่อเนื่อง เพื่อให้ผู้เข้าแข่งขันได้รับประสบการณ์จริง ตระหนักถึงศักยภาพของตนเอง และใช้เป็นแนวทางประกอบการตัดสินใจศึกษาต่อในระดับอุดมศึกษา โดยทีมที่ได้รับรางวัลชนะเลิศถึงรองชนะเลิศอันดับ 2 มีสิทธิ์เข้ารับการพิจารณาสอบสัมภาษณ์ในภาควิชาที่กำหนดของคณะวิศวกรรมศาสตร์",
  ],
  title: "โครงการแข่งขันแก้ไขปัญหาด้วยการเขียนโปรแกรมคอมพิวเตอร์ (BangMod Hackathon)",
};

/** Percentages of the frame the artwork sits in — Figma crops fills by over-sizing them. */
interface Crop {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PastEvent {
  title: string;
  subtitle: string;
  photo: string;
  /** Absent = a plain cover fill; present = Figma's own over-sized crop of the shot. */
  photoCrop?: Crop;
  /** Flat black wash Figma lays over the photo before the scroll-edge blur, 0-1. */
  photoWash?: number;
  /** `null` = a multi-part vector with no single export, recomposed by <Mark2024>. */
  logo: { src: string; crop?: Crop } | null;
  /** Figma boxes the 2024 wordmark at 300x242; the other two marks are 1:1. */
  logoHeight: number;
  /**
   * Peak background-blur radius on this card's "Scroll Edge Effect - Soft" instance.
   *
   * All three are **30**, and the 50 / 50 / 10 that used to be here was a misread. Those
   * figures are the OUTER frame's `--scroll-edge-effect-blur-radius`, and that frame has no
   * fill — Figma clips a background blur to the layer's own alpha, so an unfilled frame's
   * blur renders nothing at all. The blur that actually paints is the inner "Blur" child's,
   * which is a flat 30 on all three cards and on the nav band alike. Card 3's 10 was
   * therefore ~3x too weak. Confirmed against the `1190:1515` render: there is no hard edge
   * at the band's top, which a real 50px outer blur would have produced.
   */
  edgeBlur: number;
  awards: { label: string; winners: string[] }[];
}

export const PAST_EVENTS: PastEvent[] = [
  {
    awards: [
      { label: "รางวัลชนะเลิศ", winners: ["โรงเรียนระยองวิทยาคม"] },
      { label: "รางวัลรองชนะเลิศอันดับ 1", winners: ["โรงเรียนปรินส์รอยแยลส์วิทยาลัย"] },
      { label: "รางวัลรองชนะเลิศอันดับ 2", winners: ["โรงเรียนสุรนารีวิทยา"] },
      {
        label: "รางวัลชมเชย",
        winners: ["โรงเรียนประชาคมนานาชาติ", "โรงเรียนราชสีมาวิทยาลัย"],
      },
    ],
    edgeBlur: 30,
    logo: {
      crop: { height: 115.26, left: -7.5, top: -17.54, width: 115.26 },
      src: "/assets/figma/72fe1e1a5c377a144b1956ea6e6202893273ad34-900.png",
    },
    logoHeight: 300,
    photo: "/assets/figma/7f7ec64cfe9729b2619daf4a4f3de4491da3fecb.jpg",
    photoCrop: { height: 100, left: -3.73, top: -0.04, width: 118.52 },
    subtitle: "โครงการแข่งขันแก้ไขปัญหาด้วยการเขียนโปรแกรมคอมพิวเตอร์ประจำปี 2568",
    title: "BangMod Hackathon 2025",
  },
  {
    awards: [
      { label: "รางวัลชนะเลิศ", winners: ["โรงเรียนสวนกุหลาบวิทยาลัย"] },
      { label: "รางวัลรองชนะเลิศอันดับ 1", winners: ["โรงเรียนปทุมเทพวิทยาคาร"] },
      { label: "รางวัลรองชนะเลิศอันดับ 2", winners: ["โรงเรียนปทุมเทพวิทยาคาร"] },
      {
        label: "รางวัลชมเชย",
        winners: ["โรงเรียนพัฒนาวิทยา", "โรงเรียนมหิดลวิทยานุสรณ์"],
      },
    ],
    edgeBlur: 30,
    logo: null,
    logoHeight: 242,
    photo: "/assets/figma/a5f11602db16c55a1851a282a3cd8cb0b9cbd48b.jpg",
    subtitle: "โครงการแข่งขันแก้ไขปัญหา ด้วยการเขียนโปรแกรมคอมพิวเตอร์ประจำปี 2567",
    title: "BangMod Hackathon 2024",
  },
  {
    awards: [
      { label: "รางวัลชนะเลิศ", winners: ["โรงเรียนปทุมเทพวิทยาคาร"] },
      { label: "รางวัลรองชนะเลิศอันดับ 1", winners: ["โรงเรียนเตรียมอุดมศึกษา"] },
      { label: "รางวัลรองชนะเลิศอันดับ 2", winners: ["โรงเรียนประชาคมนานาชาติ"] },
      {
        label: "รางวัลชมเชย",
        winners: ["โรงเรียนสวนกุหลาบวิทยาลัย", "โรงเรียนกำเนิดวิทย์"],
      },
    ],
    edgeBlur: 30,
    logo: { src: "/assets/figma/c7e06ba99e591f3701746b5c4cf082fb4e0c0ec0.png" },
    logoHeight: 300,
    photo: "/assets/figma/6f2d13382d475539bdc47c33b75854bf59ffc124.jpg",
    photoWash: 0.35,
    subtitle: "โครงการแข่งขันแก้ไขปัญหา ด้วยการเขียนโปรแกรมคอมพิวเตอร์ประจำปี 2566",
    title: "BangMod Hackathon 2023",
  },
];
