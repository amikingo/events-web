import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "../components/ui/toaster";
import { themeInitScript } from "../lib/theme-script";

export const metadata: Metadata = { title: "Cheche", description: "Cheche admin" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script below sets data-theme before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies a saved Light / Dark choice before the first paint, so the page never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
