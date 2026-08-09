import ScrollEdgeEffect from "@/components/scroll-edge-effect";
import { ramp, rampV } from "@/components/scope-card-art";
import SectionHeader from "@/components/section-header";
import { CONTACT } from "@/features/guide/data/about-data";
import { SOCIAL_LINKS } from "../data/data";
import { useReveal } from "@/hooks/use-reveal";

const A = "/assets/figma/";

/**
 * Both social glyphs are multi-layer Figma components, so each layer keeps the inset
 * Figma gives it inside a fixed box rather than being flattened into one file.
 */
const CHANNELS = [
  {
    href: SOCIAL_LINKS[0].href,
    label: "BangMod Hackathon",
    layers: [
      { inset: "0 0 0.37% 0", src: `${A}511e988ab2a468e6fa802c0f8d0d9143f652e6d9.svg` },
      { inset: "18.51% 26.8% 0 27.61%", src: `${A}e093d005737ba6080ea1ab54fad5a8e3e034d839.svg` },
    ],
    /**
     * 24 in the 40 box at 402 (`1190:939`), 52 in the 80 one at 1440 (`708:455`).
     * The badge fills its 80 box down to the 14 padding.
     */
    size: ramp(24, 52),
  },
  {
    href: SOCIAL_LINKS[1].href,
    label: "bangmodhack.kmutt",
    layers: [
      { inset: "0 0.06% 0.02% 0", src: `${A}02ba547447d5d88ca1fc4cd6046c9cad48297c45.svg` },
      { inset: "24.32%", src: `${A}bc01640f62f5ba96f4759e7650ca010ce85028e6.svg` },
      {
        inset: "17.3% 17.3% 70.7% 70.7%",
        src: `${A}f69c5d76e20f72bb57c5d611c23783503d4540b4.svg`,
      },
    ],
    /** 24 in the 40 box at 402 (`1190:943`), 48 in the same 80 box at 1440 (`708:459`) —
     *  a 16 pad rather than Facebook's 14, which is why it is its own ramp */
    size: ramp(24, 48),
  },
];

/**
 * Figma node 708:444 "Section / Hero Banner" — page y 3539, 1024 tall, 120 side padding,
 * its 923-tall content vertically centred (hence 50.5 top). The trailing pad is that
 * 50.5 plus the 325 Figma leaves before the footer at page y 4888.
 */
export default function ContactSection() {
  const { ref: headRef, cls: headCls } = useReveal();
  const { ref: channelsRef, cls: channelsCls } = useReveal({ group: true });
  const { ref: mapRef, cls: mapCls } = useReveal();

  return (
    <section
      id="contact"
      className="shell relative"
      style={{ paddingBottom: rampV(124, 375.5), paddingTop: rampV(159.65, 203.5) }}
    >
      {/*
       * No `overflow-hidden rounded-3xl` here. It was clipping the section eyebrow, whose line
       * box starts flush with this wrapper's top edge, and it was never needed: the only round
       * corners in the section are the map's, and the map carries its own clip.
       */}
      <div
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col"
        style={{ gap: ramp(24, 40) }}
      >
        <div ref={headRef} className={headCls}>
          <SectionHeader number="04" title={CONTACT.title} description={CONTACT.description} />
        </div>

        <div
          ref={channelsRef}
          className={`grid md:grid-cols-2 ${channelsCls}`}
          style={{ gap: ramp(12, 40) }}
        />
        <div ref={channelsRef} className={`grid gap-10 md:grid-cols-2 ${channelsCls}`}>
          {CHANNELS.map((channel) => (
            <a
              key={channel.label}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              /*
               * A colour tint rather than an opacity dim, which is the same hover the footer's
               * social rows have — and the only one available here. These two links are
               * `reveal-group` children, so `opacity` belongs to the reveal: the (unlayered)
               * `.reveal.is-visible { opacity: 1 }` in index.css beats a layered Tailwind
               * `hover:opacity-80` outright, which is why the dim measured `opacity: 1` on
               * hover both before and after this round. Claiming opacity back would mean
               * either an `!important` or a 600ms hover fade, since the reveal's own opacity
               * transition is 600ms; `color` is in the same transition list at `--mm-fast` and
               * costs nothing.
               */
              className="mm-link mm-press flex items-center gap-4 hover:text-brand-red"
              style={{ gap: ramp(4, 16) }}
            >
              {/* Figma pads each glyph inside an 80 box, so the label always lands at 96 */}
              <span
                className="mm-icon-pop flex shrink-0 items-center justify-center rounded-xl"
                style={{ height: ramp(40, 80), width: ramp(40, 80) }}
              >
                <span
                  className="relative block shrink-0"
                  style={{ height: channel.size, width: channel.size }}
                >
                  {channel.layers.map((layer) => (
                    <span
                      key={layer.src}
                      className="absolute max-w-full"
                      style={{ inset: layer.inset }}
                    >
                      <img src={layer.src} alt="" aria-hidden className="block size-full" />
                    </span>
                  ))}
                </span>
              </span>
              <span className="leading-[1.4] font-medium" style={{ fontSize: ramp(16, 26) }}>
                {channel.label}
              </span>
            </a>
          ))}
        </div>

        {/*
         * Figma lays the address over the bottom of the map rather than under it, on a
         * 344-tall dark progressive blur — which is why the copy there is white. Below lg
         * the overlay would crowd the map, so there it stacks underneath on the ink plate.
         */}
        <div ref={mapRef} className={`relative ${mapCls}`}>
          <div
            className="relative overflow-hidden rounded-[calc(15.792px_+_8.208*var(--fl))]"
            style={{ height: ramp(300, 600) }}
          >
            <img
              src={`${A}86eccf9a63e4eae8dfc182a99fd6df1e5dd1304b.png`}
              alt="แผนที่ที่ตั้งภาควิชาวิศวกรรมคอมพิวเตอร์ มจธ."
              className="absolute top-[-30.29%] left-[-14.86%] h-[168.63%] w-[129.72%] max-w-none"
            />
            {/*
             * The band is a fraction of the map, not Figma's flat 344: `57.33%` IS 344 on the
             * 600-tall lg map, and on the 300-tall phone map it is 172 rather than 344 — which
             * as a literal 344 overhung the photograph by 44px, putting the solid end of the
             * ramp *below* the image and fogging the whole thing instead of capping it.
             * Below lg the address is not over the map at all, so there the band only has to
             * hand the photo over to the ink plate underneath it, and 40% does that.
             * Both ramps still finish well before the top of the band: run full height they
             * cover the artwork, which is the one thing this overlay is not meant to do.
             */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{ height: ramp(187, 344) }}
            >
              <ScrollEdgeEffect
                tone="dark"
                flip
                maskAlpha={0.9}
                tintReach={1}
                blurReach={0.6}
                className="absolute inset-0 rounded-b-[calc(15.792px_+_8.208*var(--fl))]"
              />
            </div>
          </div>

          <div
            className="absolute inset-x-0 -bottom-[0.5px] flex items-start gap-4 text-white md:items-center"
            style={{ padding: ramp(16, 40) }}
          >
            {/* Figma pads the pin to 56 inside an 80 box, then insets the vector again */}
            <span
              className="flex shrink-0 items-center justify-center rounded-xl"
              style={{ height: ramp(32, 80), width: ramp(32, 80) }}
            >
              <span
                className="relative block"
                style={{ height: ramp(24, 56), width: ramp(24, 56) }}
              >
                <span className="absolute block inset-[8.39%_12.59%_7.69%_12.6%]">
                  <img
                    src={`${A}1729b3bffbd91e5facf50704cb0d869d52659e47.svg`}
                    alt=""
                    aria-hidden
                    className="block size-full"
                  />
                </span>
              </span>
              {/* 56 in an 80 box is 70%, so the pin keeps its padding as the box scales down */}
            </span>
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="leading-[1.4] font-medium" style={{ fontSize: ramp(18, 26) }}>
                {CONTACT.place}
              </p>
              <p className="leading-[1.5] font-light" style={{ fontSize: ramp(14, 21) }}>
                {CONTACT.address}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
