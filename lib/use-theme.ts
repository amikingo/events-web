"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_KEY } from "./theme-script";

export type Theme = "system" | "light" | "dark";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/** The user's theme choice: `"system"` (follow the device), `"light"` or `"dark"`. Saved in localStorage under the same key the guideline uses. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setThemeState(saved);
    } catch {
      /* storage unavailable — stay on system */
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return [theme, setTheme];
}
