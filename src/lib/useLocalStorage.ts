"use client";

import { useEffect, useState } from "react";

/** Hydration-safe: nilai awal = initial (SSR identik), localStorage dibaca di useEffect. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* data rusak: pakai default */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage penuh/diblokir */
    }
  }, [key, value, ready]);

  return [value, setValue, ready] as const;
}
