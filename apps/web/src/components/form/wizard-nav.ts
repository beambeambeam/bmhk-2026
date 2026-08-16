import { useState, useCallback } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { AnyRouter, ParsedLocation, LinkOptions } from "@tanstack/react-router";

type To = LinkOptions["to"] | (string & {});

declare module "@tanstack/react-router" {
  interface HistoryState {
    authNav?: AuthNav;
  }
}
/**
 * Direction and capability plumbing for the auth-flow view transitions.
 *
 * The View Transitions API has no notion of where the user came from — one navigation
 * looks like any other — so the shape of each hop has to be published to CSS out of
 * band. `markAuthNav` stamps `data-auth-nav` on the root element, which the
 * `:root[data-auth-nav='…']` rules in styles/auth-motion.css read to pick that hop's
 * choreography.
 *
 * There is exactly one writer: `trackAuthNav`, which is subscribed to the router itself
 * (see App.tsx). Subscribers are called synchronously from the router's `updateState`,
 * which is two React effect passes before `<RouterProvider>` reaches
 * `document.startViewTransition` — so the flag is always in place before the transition
 * that reads it starts, whether the navigation came from a link, a button, or the
 * browser's own back button. Nothing has to clean it up, since the attribute only ever
 * selects pseudo-elements that exist mid-transition.
 */

/**
 * The hops the flow can make, and their reverses. Each one changes what should visibly
 * carry over:
 *
 *  - `gate`    sign-in → the registration gate: the colour blocks morph, the plate arrives
 *  - `enter`   the gate → the first wizard step: colour sinks away, the pasta spills in
 *  - `forward` step → step
 *  - `submit`  the last step → the success or error screen: pasta leaves, colour returns
 *  - `leave`   out of the flow, with nothing left to carry — a plain crossfade
 *
 * …and `back`, `gate-back`, `enter-back`, `submit-back`, which are those four run the
 * other way. Every forward hop has a reverse, because every one of them is reachable by
 * the browser's back button.
 */
export type AuthNav =
  | "gate"
  | "gate-back"
  | "enter"
  | "enter-back"
  | "forward"
  | "back"
  | "submit"
  | "submit-back"
  | "leave";

/**
 * Popping a history entry undoes the hop that created it, so the direction of a back
 * press is not a property of where the user is going — it is the inverse of how they got
 * where they are. That is why each entry records its own hop (in `location.state`) and
 * why this table exists.
 */
const REVERSE: Record<AuthNav, AuthNav> = {
  back: "forward",
  enter: "enter-back",
  "enter-back": "enter",
  forward: "back",
  gate: "gate-back",
  "gate-back": "gate",
  leave: "leave",
  submit: "submit-back",
  "submit-back": "submit",
};

function markAuthNav(kind: AuthNav) {
  document.documentElement.dataset.authNav = kind;
}

/* --------------------------------------------------------- the history log ---- */

type DataRouter = AnyRouter;

/** What each history entry is: where it points, and which hop put the user there. */
interface Entry {
  path: string;
  kind: AuthNav | undefined;
}

const entries = new Map<number, Entry>();

/**
 * React Router stamps a monotonic `idx` on every history entry it creates. Comparing it
 * across a navigation is the only reliable way to tell a back press from a forward one —
 * `popstate` itself carries no direction.
 */
const historyIdx = () => (window.history.state as { idx?: number } | null)?.idx ?? 0;

const kindOf = (location: ParsedLocation) =>
  (location.state as { authNav?: AuthNav } | null)?.authNav;

/**
 * Keep `data-auth-nav` honest for every navigation the app can make, and keep a log of
 * what each history entry is so a back *button* can pop rather than push.
 *
 * Called once, at module scope, on the router returned by `createBrowserRouter`. Being a
 * router subscriber rather than a `popstate` listener is what makes this work: a popstate
 * listener runs before React Router has even decided what the navigation is, and — more
 * to the point — the previous implementation deliberately refused to animate pops at all,
 * because under `<BrowserRouter>` there was no way to wrap one in a transition. The data
 * router does that itself, remembering which pathname pairs were crossed with
 * `viewTransition` and re-using the transition on the way back.
 */
export function trackAuthNav(router: DataRouter) {
  let prevIdx = historyIdx();
  entries.set(prevIdx, {
    kind: kindOf(router.state.location),
    path: router.state.location.pathname,
  });

  router.subscribe("onResolved", () => {
    const idx = historyIdx();
    const { location } = router.state;
    const { historyAction } = router.history;
    const kind = kindOf(location);

    if (historyAction === "POP") {
      /*
       * Going back plays the reverse of the hop being undone, which is recorded on the
       * entry being *left*, not the one being arrived at. Going forward again through the
       * same entries replays the hop each of them recorded.
       */
      const undoing = entries.get(prevIdx)?.kind;
      markAuthNav(idx < prevIdx ? REVERSE[undoing ?? "leave"] : (kind ?? "leave"));
    } else {
      markAuthNav(kind ?? "leave");
      // a push discards whatever was ahead of it, so the log has to discard it too
      for (const key of [...entries.keys()]) {
        if (key > idx) {
          entries.delete(key);
        }
      }
    }

    entries.set(idx, { kind, path: location.pathname });
    prevIdx = idx;
  });
}

/**
 * Whether the entry immediately behind the current one is exactly `path` — i.e. whether
 * going there is a pop rather than a fresh visit. Unknown after a reload, when the log is
 * empty but `idx` is not, and the honest answer there is "no": pushing is always correct,
 * it just grows the stack.
 */
function previousEntryIs(path: string) {
  return entries.get(historyIdx() - 1)?.path === path;
}

/* ------------------------------------------------------------------ links ---- */

/**
 * Props for a link that moves forward through the flow.
 *
 * `viewTransition` is the data router's own option, and under `<RouterProvider>` it
 * genuinely calls `document.startViewTransition` — under `<BrowserRouter>` it was
 * accepted and silently discarded, which is why this used to be a hand-rolled click
 * interceptor. Letting the router own the transition is not a tidying-up: it is what
 * registers the pathname pair so that *popping* this entry later animates too.
 *
 * `state` records the hop on the history entry, which is what `trackAuthNav` reads back
 * to reverse it.
 */
export function authLink(to: To, kind: AuthNav) {
  return { state: { authNav: kind }, to, viewTransition: true };
}

/** Imperative form, for the controls in this flow that are buttons rather than links. */
export function useAuthNavigate() {
  const navigate = useNavigate();
  return useCallback(
    async (to: To, kind: AuthNav) => {
      await navigate({ state: { authNav: kind } as any, to: to as any, viewTransition: true });
    },
    [navigate],
  );
}

/**
 * Props for a link that undoes a hop — the wizard's "ย้อนกลับ" and the error screen's
 * "ลองอีกครั้ง".
 *
 * These used to push the previous step as a brand-new entry, which is the bug behind
 * "กดกลับแล้วยังไม่กลับไปหน้าก่อนหน้า": walking team → advisor → ย้อนกลับ left three
 * entries deep at team, so the browser's own back button went *forward* to advisor. When
 * the entry behind us already is the destination, this goes there by popping it, which
 * keeps the stack the length the user thinks it is and hands the scroll position back.
 *
 * It stays a real `<a href>` all the same — the guard clauses hand cmd/middle clicks back
 * to the browser so they keep opening tabs, and if the log cannot vouch for the previous
 * entry the click falls through to the `<Link>`, which pushes `to` flagged with the same
 * reverse hop. Either way the choreography is identical; only the stack differs.
 */
export function useAuthBackLink() {
  const navigate = useNavigate();

  return (to: string, kind: AuthNav) => ({
    ...authLink(to, kind),
    onClick(event: MouseEvent<HTMLAnchorElement>) {
      if (event.defaultPrevented) {
        return;
      }
      if (event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (!previousEntryIs(to)) {
        return;
      }
      event.preventDefault();
      navigate({ to: -1 as any });
    },
  });
}

/* -------------------------------------------------------------- entrances ---- */

/**
 * Whether this mount should play its own arrival animation, or leave the arrival to a
 * view transition that is already running.
 *
 * The registration sheet has to spring up whenever the user arrives at it. Arriving
 * *through* the sign-in morph, that spring belongs to `::view-transition-new(auth-sheet)`
 * — the snapshot is what travels. But a direct load, a reload, or any navigation the
 * router did not wrap in a transition starts no transition at all, and there the sheet
 * simply appeared, which is what "มันยังไม่เด้งมา" is about. So the element gets an
 * animation of its own, and this is the test that stops the two ever running together and
 * springing it twice.
 *
 * Read once, at mount, and deliberately during render: with `viewTransition` the router
 * commits the new route inside the transition's update callback, so `:active-view-transition`
 * is the live answer to "did something else already animate my arrival". `try` because the
 * pseudo-class is newer than the API in some engines, and an unknown selector throws in
 * `matches`; where it is missing there are no transitions to collide with either.
 */
export function useOwnArrival() {
  return !useState(() => {
    try {
      return document.documentElement.matches(":active-view-transition");
    } catch {
      return false;
    }
  })[0];
}
