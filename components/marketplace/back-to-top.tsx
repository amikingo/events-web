"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { ChevUpIcon } from "../ui/icons";

/** How far down the page (px) before the button appears: about one screen. */
const SHOW_AFTER = 700;

/**
 * A floating "back to top" button, bottom right. It fades in once you have scrolled about a screen and scrolls smoothly
 * to the top (instantly with reduced motion). While hidden it is out of the tab order and invisible to screen readers.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  function toTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div
      inert={!visible}
      className={`fixed bottom-4 right-4 z-40 transition-[opacity,translate] duration-300 sm:bottom-6 sm:right-6 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <Button variant="secondary" iconOnly aria-label="Back to top" onClick={toTop} className="size-11 rounded-full shadow-raised backdrop-blur-xl">
        <ChevUpIcon className="size-5" />
      </Button>
    </div>
  );
}
