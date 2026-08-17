import { Link } from "@tanstack/react-router";
import { FOOTER_ABOUT, FOOTER_GROUPS, SOCIAL_LINKS } from "../data";
import { useReveal } from "@/hooks/use-reveal";
import { VERSION_LABEL } from "../version";

const FOOTER_PAD: React.CSSProperties = {
  paddingBottom: "clamp(24px, 7.3217726vw - 5.433526px, 100px)",
  paddingInline: "clamp(24px, 3.4682081vw + 10.0578035px, 60px)",
  paddingTop: "clamp(24px, 3.4682081vw + 10.0578035px, 60px)",
};

const MARK_GAP = "gap-[calc(6.87px_+_5.13*var(--fl))]";
const RULE = "w-px shrink-0 bg-[#b9b9b9] h-[calc(33.532px_+_18.468*var(--fl))]";

function BottomRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[calc(11.948px+2.052*var(--fl))] leading-normal font-light text-gray-1 min-[1440px]:w-max min-[1440px]:flex-nowrap ${className}`}
    >
      <span className="tabular-nums whitespace-nowrap">{VERSION_LABEL}</span>
      <p className="min-[1440px]:whitespace-nowrap">{FOOTER_ABOUT.copyright}</p>
    </div>
  );
}

function SponsorLockup({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center ${MARK_GAP} ${className}`}>
      <img
        src="/assets/footer-kmutt.svg"
        alt="มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี"
        className="h-[calc(27.61px+15.39*var(--fl))] w-auto shrink-0"
      />
      <span aria-hidden className={RULE} />
      <img
        src="/assets/footer-faculty.svg"
        alt="คณะวิศวกรรมศาสตร์ Faculty of Engineering"
        className="h-[calc(21.714px+11.286*var(--fl))] w-auto shrink-0"
      />
      <span aria-hidden className={RULE} />
      <img
        src="/assets/footer-cpe.svg"
        alt="ภาควิชาวิศวกรรมคอมพิวเตอร์"
        className="h-[calc(21.688px+12.312*var(--fl))] w-auto shrink-0"
      />
      <span aria-hidden className={RULE} />
      <Link to="/" viewTransition className="mm-press shrink-0">
        <img
          src="/assets/logo-nav.png"
          alt="BangMod Hackathon 2026"
          className="h-[calc(25.636px+14.364*var(--fl))] w-auto"
        />
      </Link>
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
          <SponsorLockup />

          <div className="flex w-full flex-col gap-2">
            <p className="fl-18 leading-[1.4]">
              {FOOTER_ABOUT.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <p className="fl-14 leading-normal text-gray-1">{FOOTER_ABOUT.body}</p>
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
              <span
                aria-hidden
                style={
                  { "--icon": `url("${social.icon}")` } as React.CSSProperties &
                    Record<string, string>
                }
                className="mm-icon-pop size-6 shrink-0 bg-current [-webkit-mask-image:var(--icon)] mask-(--icon) [-webkit-mask-repeat:no-repeat] mask-no-repeat [-webkit-mask-position:center] mask-center [-webkit-mask-size:contain] mask-contain"
              />

              {social.label}
            </a>
          ))}
        </div>

        <BottomRow className="justify-center" />
      </div>

      <div className="mx-auto hidden max-w-330 flex-col gap-8 md:flex lg:flex-row lg:justify-between">
        <div ref={aboutRef} className={`flex max-w-150 flex-col justify-between gap-8 ${aboutCls}`}>
          <div className="flex flex-col gap-5">
            <SponsorLockup className="justify-start" />

            <div className="flex flex-col gap-2">
              <p className="fl-18 leading-[1.4]">
                {FOOTER_ABOUT.titleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <p className="fl-16 leading-normal text-gray-1">{FOOTER_ABOUT.body}</p>
            </div>
          </div>

          <BottomRow />
        </div>
        <div
          ref={linksRef}
          style={{ "--reveal-delay": "70ms" }}
          className={`grid grid-cols-2 gap-x-6 gap-y-10 lg:w-125 lg:gap-0 ${linksCls}`}
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
                      <span
                        aria-hidden
                        style={
                          { "--icon": `url("${social.icon}")` } as React.CSSProperties &
                            Record<string, string>
                        }
                        className="mm-icon-pop size-6 shrink-0 bg-current [-webkit-mask-image:var(--icon)] mask-(--icon) [-webkit-mask-repeat:no-repeat] [mask-repeat:no-repeat] [-webkit-mask-position:center] [mask-position:center] [-webkit-mask-size:contain] [mask-size:contain]"
                      />
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
