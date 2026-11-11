"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { book, UI, type Lang } from "@/lib/book";
import { BookPage, pageTitle } from "@/components/Pages";
import { Logo } from "@/components/Logo";

const N = book.pages.length;

/* The page number lives in the URL hash and the language in localStorage; both are read through
   small stores so the static HTML (page 1, Thai) and the browser agree without an effect. */
const listen = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  window.addEventListener("meltbook", cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("meltbook", cb);
  };
};
const readPage = () => {
  const h = Number(location.hash.slice(1));
  return h >= 1 && h <= N ? h - 1 : 0;
};
let memLang: Lang = "th"; // used when storage is blocked (private windows)
const readLang = (): Lang => {
  try {
    const l = localStorage.getItem("meltbook-lang");
    return l === "en" || l === "th" ? l : memLang;
  } catch {
    return memLang;
  }
};
const changed = () => window.dispatchEvent(new Event("meltbook"));
const saveLang = (l: Lang) => {
  memLang = l;
  try {
    localStorage.setItem("meltbook-lang", l);
  } catch {}
  changed();
};

/* The web reader: one 3:4 sheet at a time, turned with the buttons, the arrow keys, a swipe or the
   dots; Thai or English; the page number lives in the URL hash so a page can be linked to. */
export function Reader() {
  const i = useSyncExternalStore(listen, readPage, () => 0);
  const lang = useSyncExternalStore(listen, readLang, () => "th" as Lang);
  const [dir, setDir] = useState(1);
  const start = useRef<number | null>(null);

  const go = useCallback(
    (to: number) => {
      const n = Math.max(0, Math.min(N - 1, to));
      if (n === i) return;
      setDir(n > i ? 1 : -1);
      history.replaceState(null, "", `#${n + 1}`);
      changed();
    },
    [i],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const pickLang = saveLang;

  const t = UI[lang];
  const page = book.pages[i];

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 pb-5 pt-3">
      <header className="flex w-full max-w-[560px] items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-auto" />
          <span className="font-display text-xl text-melt">meltbook</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-sand p-1 text-sm font-bold" role="group" aria-label="Language">
            {(["th", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => pickLang(l)}
                className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${lang === l ? "bg-ink text-cream" : "text-ink/60 hover:text-melt"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <a href="/meltbook.epub" download className="rounded-full bg-melt px-3.5 py-1.5 text-sm font-bold text-cream hover:bg-ink">
            EPUB
          </a>
        </div>
      </header>

      <main
        className="mt-3 flex w-full flex-1 items-center justify-center"
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerUp={(e) => {
          if (start.current == null) return;
          const dx = e.clientX - start.current;
          start.current = null;
          if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        <article
          key={`${i}-${lang}`}
          aria-label={`${t.page} ${i + 1} / ${N}: ${pageTitle(page, lang)}`}
          className="@container relative aspect-[3/4] overflow-hidden max-sm:aspect-auto max-sm:h-[min(calc(100dvh-140px),190vw)] rounded-[22px] bg-cream shadow-[0_1px_0_#e7e4dd,0_24px_60px_-20px_rgba(64,39,34,0.35)] ring-1 ring-sand-2 select-none"
          style={{ width: "min(100%, max(calc((100dvh - 150px) * 0.75), min(100%, 360px)), 560px)", animation: `${dir > 0 ? "turn-in" : "turn-back"} 0.45s var(--ease-jelly) both` }}
        >
          <BookPage page={page} lang={lang} n={i + 1} />
        </article>
      </main>

      <nav className="mt-4 flex w-full max-w-[560px] items-center justify-between gap-3" aria-label={t.contents}>
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="cursor-pointer rounded-full bg-sand px-4 py-2 text-sm font-bold disabled:cursor-default disabled:opacity-35">
          ← <span className="max-sm:sr-only">{t.prev}</span>
        </button>
        <ol className="m-0 flex list-none gap-1.5 p-0">
          {book.pages.map((p, k) => (
            <li key={k}>
              <button
                type="button"
                aria-label={`${t.page} ${k + 1}: ${pageTitle(p, lang)}`}
                aria-current={k === i ? "page" : undefined}
                onClick={() => go(k)}
                className={`block h-2.5 cursor-pointer rounded-full transition-all duration-300 ${k === i ? "w-6 bg-melt" : "w-2.5 bg-sand-2 hover:bg-ink/40"}`}
              />
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => go(i + 1)} disabled={i === N - 1} className="cursor-pointer rounded-full bg-ink px-4 py-2 text-sm font-bold text-cream disabled:cursor-default disabled:opacity-35">
          <span className="max-sm:sr-only">{t.next}</span> →
        </button>
      </nav>
    </div>
  );
}
