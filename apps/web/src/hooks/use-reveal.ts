import { useEffect, useRef, useState } from "react";

interface Options {
  /** Stagger the element's direct children instead of the element itself. */
  group?: boolean;
  /** Fraction of the element that must be visible before revealing. */
  threshold?: number;
}

/** Reveal once the element's top has crossed this far into the viewport. */
const TRIGGER = 0.92;

/**
 * Reveals an element once it scrolls into view. Returns the ref to attach and the
 * class names that drive the transition (see `.reveal` in index.css).
 *
 * Reveals are one-way — sections don't re-animate on the way back up.
 *
 * IntersectionObserver drives the common case, but it only reports *changes* in
 * intersection: jumping straight past a section (footer anchor links, scroll
 * restoration, find-in-page) takes it from "below the viewport" to "above the
 * viewport" at a ratio of 0 both times, so no callback fires and the section
 * would stay invisible forever. A passive scroll listener covers that.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  group = false,
  threshold = 0.15,
}: Options = {}) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return () => {
        // Do nothing if there is no element
      };
    }

    let frame = 0;
    let done = false;

    function finish(animate: boolean) {
      if (done) {
        return;
      }
      done = true;
      cleanup();
      if (!animate) {
        setVisible(true);
        return;
      }
      // An element already on screen at mount would otherwise flip to visible in
      // the same paint as its hidden state, leaving the transition no start value.
      // Waiting two frames lets the hidden state paint first.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    }

    // already scrolled past on mount (deep link, restored position): no animation
    function passed() {
      if (!el) {
        return false;
      }
      return el.getBoundingClientRect().top < window.innerHeight * TRIGGER;
    }

    if (typeof IntersectionObserver === "undefined") {
      frame = requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            finish(true);
          } else if (entry.boundingClientRect.bottom < 0) {
            finish(false);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold },
    );

    let ticking = false;
    function onScroll() {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (passed()) {
          finish(true);
        }
      });
    }

    function cleanup() {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }

    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [threshold]);

  const cls = `${group ? "reveal-group" : "reveal"}${visible ? " is-visible" : ""}`;
  return { cls, ref, visible };
}
