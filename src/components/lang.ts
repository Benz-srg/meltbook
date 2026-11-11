"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/book";

/* The reader's language, kept in localStorage (a module variable when storage is blocked). */
let memLang: Lang = "th";
const listen = (cb: () => void) => {
  window.addEventListener("meltbook-lang", cb);
  return () => window.removeEventListener("meltbook-lang", cb);
};
const read = (): Lang => {
  try {
    const l = localStorage.getItem("meltbook-lang");
    return l === "en" || l === "th" ? l : memLang;
  } catch {
    return memLang;
  }
};
const save = (l: Lang) => {
  memLang = l;
  try {
    localStorage.setItem("meltbook-lang", l);
  } catch {}
  window.dispatchEvent(new Event("meltbook-lang"));
};

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(listen, read, () => "th" as Lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return [lang, save];
}
