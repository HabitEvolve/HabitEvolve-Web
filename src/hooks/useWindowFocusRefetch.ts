import { useEffect, useRef } from "react";

/**
 * Refetches when the browser tab/window regains focus — a mentor who tabs
 * away (checks Discord, another party) and comes back sees current data
 * instead of whatever was loaded on the last full page visit. This is a
 * plain polling-on-focus fallback, not a replacement for the real-time
 * SignalR push (Party Chat) — it only fires for the plain REST-loaded state
 * (members, join requests, boss status) that has no live socket at all.
 *
 * Skips a focus event that fires within `minIntervalMs` of the last run, so
 * rapid alt-tabbing doesn't hammer the API with duplicate requests.
 */
export function useWindowFocusRefetch(refetch: () => void, minIntervalMs = 5000) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    let lastRun = Date.now();

    const run = () => {
      const now = Date.now();
      if (now - lastRun < minIntervalMs) return;
      lastRun = now;
      refetchRef.current();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") run();
    };

    // Both listeners cover the two ways a tab "comes back": switching back to
    // this browser window (focus) vs. switching back to this tab within the
    // same window (visibilitychange) — Chrome/Firefox fire only one or the
    // other depending on how the user switched away.
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [minIntervalMs]);
}
