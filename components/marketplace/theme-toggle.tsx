"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "../../lib/use-theme";
import { cn } from "../../lib/utils";
import { MoonIcon, SunIcon } from "../ui/icons";

/**
 * Header button that flips between light and dark. The icon shows where a click goes (sun while dark, moon while
 * light); the choice is saved by `useTheme`, the same store the dashboard's theme switch uses. While the theme is
 * "system" it starts from the device setting, and the first click makes the opposite choice explicit.
 */
function subscribeSystem(cb: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", cb);
  return () => media.removeEventListener("change", cb);
}
const systemIsDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const serverSnapshot = () => false;
const noSubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const system = useSyncExternalStore(subscribeSystem, systemIsDark, serverSnapshot);
  // The resolved theme is only known in the browser, so the icon appears after mount (the button keeps its size).
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const dark = theme === "system" ? system : theme === "dark";

  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" aria-label={label} title={label} onClick={() => setTheme(dark ? "light" : "dark")} className={cn("inline-flex size-10 items-center justify-center", className)}>
      {!mounted ? null : dark ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />}
    </button>
  );
}
