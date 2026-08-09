import { useState } from "react";

/**
 * Whether this mount should play its own arrival animation, or leave the arrival to a
 * view transition that is already running.
 */
export function useOwnArrival() {
  // oxlint-disable-next-line react/hook-use-state -- read once at mount; it never updates
  const [transitionRunning] = useState(() => {
    try {
      return document.documentElement.matches(":active-view-transition");
    } catch {
      return false;
    }
  });
  return !transitionRunning;
}
