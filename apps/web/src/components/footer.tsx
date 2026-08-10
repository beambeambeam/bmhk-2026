import { Link } from "@tanstack/react-router";
import { FOOTER_ABOUT, FOOTER_GROUPS, SOCIAL_LINKS } from "../data";
import { useReveal } from "@/hooks/use-reveal";
import { VERSION_LABEL } from "../version";

const FOOTER_PAD: React.CSSProperties = {
  paddingBottom: "clamp(24px, 7.3217726vw - 5.433526px, 100px)",
  paddingInline: "clamp(24px, 3.4682081vw + 10.0578035px, 60px)",
  paddingTop: "clamp(24px, 3.4682081vw + 10.0578035px, 60px)",
};

const LINKS_STYLE: React.CSSProperties & { "--reveal-delay"?: string } = {
  "--reveal-delay": "70ms",
};

function BottomRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-[1.5] font-light text-gray-1 min-[1440px]:w-max min-[1440px]:flex-nowrap ${className}`}
    >
      <span className="tabular-nums whitespace-nowrap">{VERSION_LABEL}</span>
      <p className="min-[1440px]:whitespace-nowrap">{FOOTER_ABOUT.copyright}</p>
    </div>
  );
}

export default function Footer() {
  const { ref: aboutRef, cls: aboutCls } = useReveal();
  const { ref: linksRef, cls: linksCls } = useReveal();
  const { ref: phoneRef, cls: phoneCls } = useReveal({ group: true });

  return (
    <footer style={FOOTER_PAD} className="site-footer relative rounded-3xl bg-white">
      <div
        ref={phoneRef}
        className={`flex flex-col items-center gap-6 text-center md:hidden ${phoneCls}`}
      >
        <div className="flex w-full flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <Link to="/" viewTransition className="mm-press">
              <img src="/assets/logo-nav.png" alt="BangMod Hackathon 2026" className="h-[60px]" />
            </Link>
            <div className="flex items-center gap-1.5">
              <img
                src="/assets/figma/334492fe4cb116291b1b34c10e03a9aa49cd8960.svg"
                alt="มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี"
                className="h-9 w-[158.25px] shrink-0"
              />
              <span aria-hidden className="h-9 w-px shrink-0 bg-ink" />
              <span className="relative block h-[22px] w-[42px] shrink-0 overflow-hidden">
                <img
                  src="/assets/figma/b1f497a79771a763f521a081e6006d3a027a793f.svg"
                  alt="ภาควิชาวิศวกรรมคอมพิวเตอร์"
                  className="absolute top-[-30.12%] left-[-7.09%] h-[160.4353%] w-[114.0625%] max-w-none"
                />
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2">
            <p className="fl-18 leading-[1.4]">
              {FOOTER_ABOUT.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <p className="fl-14 leading-[1.5] text-gray-1">{FOOTER_ABOUT.body}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="mm-link mm-press flex min-h-11 items-center gap-1 fl-18 leading-[1.4] hover:text-brand-red"
            >
              <img src={social.icon} alt="" aria-hidden className="mm-icon-pop size-6" />
              {social.label}
            </a>
          ))}
        </div>
        <BottomRow className="justify-center" />
      </div>

      <div className="mx-auto hidden max-w-[1320px] flex-col gap-8 md:flex lg:flex-row lg:justify-between">
        <div
          ref={aboutRef}
          className={`flex max-w-[600px] flex-col justify-between gap-8 ${aboutCls}`}
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 lg:gap-3">
              <Link to="/" viewTransition className="mm-press shrink-0">
                <img
                  src="/assets/logo-nav.png"
                  alt="BangMod Hackathon 2026"
                  className="h-8 w-auto lg:h-[calc(44px_+_16*var(--fl))]"
                />
              </Link>
              <span
                aria-hidden
                className="h-5 w-px shrink-0 bg-ink lg:h-[calc(36px_+_12*var(--fl))]"
              />
              <img
                src="/assets/figma/334492fe4cb116291b1b34c10e03a9aa49cd8960.svg"
                alt="มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี"
                className="h-[21px] w-[92.31px] shrink-0 lg:h-[calc(36px_+_12*var(--fl))] lg:w-[calc((36px_+_12*var(--fl))*4.3958)]"
              />
              <span
                aria-hidden
                className="h-5 w-px shrink-0 bg-ink lg:h-[calc(36px_+_12*var(--fl))]"
              />
              <span className="relative block h-5 w-[40.71px] shrink-0 overflow-hidden lg:h-7 lg:w-[57px]">
                <img
                  src="/assets/figma/b1f497a79771a763f521a081e6006d3a027a793f.svg"
                  alt="ภาควิชาวิศวกรรมคอมพิวเตอร์"
                  className="absolute top-[-30.12%] left-[-7.09%] h-[160.4353%] w-[114.0625%] max-w-none"
                />
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <p className="fl-18 leading-[1.4]">
                {FOOTER_ABOUT.titleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <p className="fl-16 leading-[1.5] text-gray-1">{FOOTER_ABOUT.body}</p>
            </div>
          </div>

          <BottomRow />
        </div>
        <div
          ref={linksRef}
          style={LINKS_STYLE}
          className={`grid grid-cols-2 gap-x-6 gap-y-10 lg:w-[500px] lg:gap-0 ${linksCls}`}
        >
          {FOOTER_GROUPS.map((column, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-10 lg:w-full">
              {column.map((group) => (
                <div key={group.heading} className="flex flex-col gap-3">
                  <p className="fl-18 leading-[1.4] text-gray-2">{group.heading}</p>
                  {group.links.map((link) => (
                    <Link
                      key={link.label}
                      to={link.to}
                      viewTransition={!link.to.includes("#")}
                      className="mm-link mm-press inline-block fl-16 leading-[1.4] hover:text-brand-red"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
              {i === 1 && (
                <div className="flex flex-col gap-3">
                  <p className="fl-18 leading-[1.4] text-gray-2">ติดต่อเรา</p>
                  {SOCIAL_LINKS.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="mm-link mm-press flex items-center gap-2.5 fl-16 leading-[1.4] hover:text-brand-red"
                    >
                      <img src={social.icon} alt="" aria-hidden className="mm-icon-pop size-6" />
                      {social.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
