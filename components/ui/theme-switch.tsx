"use client";

import { cn } from "../../lib/utils";
import { useTheme } from "../../lib/use-theme";
import type { Theme } from "../../lib/use-theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "system", label: "System", icon: <MonitorIcon /> },
  { value: "light", label: "Light", icon: <SunIcon /> },
  { value: "dark", label: "Dark", icon: <MoonIcon /> },
];

/**
 * Light / Dark / System, as a compact three-way switch. Saves the choice and applies it at once; "System" follows the device.
 * It is already inside the top bar's avatar menu; use it on its own for a settings page.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  return (
    <div role="group" aria-label="Theme" className={cn("flex gap-0.5 rounded-btn bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="menuitemradio"
          aria-checked={theme === o.value}
          onClick={() => setTheme(o.value)}
          className={cn(
            "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-check text-[12px] font-medium [&_svg]:size-3.5",
            theme === o.value ? "bg-surface text-text shadow" : "text-text-faint hover:text-text",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
