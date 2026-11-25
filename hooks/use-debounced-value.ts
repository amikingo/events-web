"use client";

import { useEffect, useState } from "react";

/** The value after it has stopped changing for `delay` ms. For search boxes that call the API (the Table calls it on every keystroke). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
