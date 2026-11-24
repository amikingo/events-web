import { useEffect, useState } from "react";

/** Subscribes to a CSS media query. `false` on the server and until mounted. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** True on touch-first devices (phones, tablets), where the guideline wants native date and time pickers. */
export function usePrefersNativePickers(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
