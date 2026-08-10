/**
 * Figma exports the Google mark as two overlaid pieces — the four-colour G plus the
 * blue crossbar — each pinned at its own inset inside a 24px box. Both are the real
 * Figma exports, so the glyph is pixel-identical to the design.
 */
export default function GoogleLogo({
  className = "size-[calc(19.896px_+_4.104*var(--fl))]",
}: {
  className?: string;
}) {
  return (
    <span aria-hidden className={`relative block shrink-0 ${className}`}>
      <img
        src="/assets/figma/1f3d8526a6539e313f6597ff6b470305b04cd69c.png"
        alt=""
        className="absolute top-0 left-0 aspect-[47/48] w-[97.92%] max-w-none"
      />
      <span className="absolute top-[40.92%] right-[37.5%] bottom-[39.73%] left-1/2 block">
        <img
          src="/assets/figma/d800774dad196dfe605892e52a44141bb8866ed6.svg"
          alt=""
          className="block size-full max-w-none"
        />
      </span>
    </span>
  );
}
