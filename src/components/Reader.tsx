"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
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
const WIDE = "(min-width: 900px) and (min-height: 560px)";
const listenWide = (cb: () => void) => {
  const m = matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/* Views: what is open. On a wide screen the book opens in spreads: the cover alone on the right
   (a closed book), then two pages side by side, and the back cover alone on the left. On a phone,
   one page at a time. */
type View = [number | null, number | null];
const SPREADS: View[] = (() => {
  const v: View[] = [[null, 0]];
  for (let p = 1; p < N - 1; p += 2) v.push([p, p + 1 < N - 1 ? p + 1 : null]);
  v.push([N - 1, null]);
  return v;
})();
const viewOf = (page: number, wide: boolean) => (wide ? SPREADS.findIndex(([l, r]) => l === page || r === page) : page);
const firstPage = (v: number, wide: boolean) => (wide ? (SPREADS[v][0] ?? SPREADS[v][1] ?? 0) : v);
// a closed book sits centred: the cover alone moves left half a page, the back cover right
const shiftOf = ([l, r]: View) => (l == null ? -0.5 : r == null ? 0.5 : 0);

type Flip = { dir: 1 | -1; to: number } | null;
const TURN_MS = 700;
const SHADOW = "shadow-[0_24px_60px_-24px_rgba(64,39,34,.45)]";

function Sheet({ page, lang, side, style, className = "" }: { page: number | null; lang: Lang; side: "left" | "right" | "single"; style?: CSSProperties; className?: string }) {
  if (page == null) return <div className={className.replace(SHADOW, "")} style={style} aria-hidden="true" />;
  const t = UI[lang];
  return (
    <article
      aria-label={`${t.page} ${page + 1} / ${N}: ${pageTitle(book.pages[page], lang)}`}
      className={`relative overflow-hidden bg-cream [container-type:size] ${side === "left" ? "rounded-l-[18px]" : side === "right" ? "rounded-r-[18px]" : "rounded-[18px]"} ${className}`}
      style={style}
    >
      <BookPage page={book.pages[page]} lang={lang} n={page + 1} />
      {/* the gutter: a soft shade where the paper bends into the spine */}
      {side !== "single" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-[12%]"
          style={side === "left" ? { right: 0, background: "linear-gradient(to left, rgba(64,39,34,.16), rgba(64,39,34,0))" } : { left: 0, background: "linear-gradient(to right, rgba(64,39,34,.18), rgba(64,39,34,0))" }}
        />
      )}
    </article>
  );
}

export function Reader() {
  const page = useSyncExternalStore(listen, readPage, () => 0);
  const lang = useSyncExternalStore(listen, readLang, () => "th" as Lang);
  const wide = useSyncExternalStore(listenWide, () => matchMedia(WIDE).matches, () => false);
  const [flip, setFlip] = useState<Flip>(null);
  const start = useRef<number | null>(null);
  const t = UI[lang];

  const views = wide ? SPREADS.length : N;
  const v = viewOf(page, wide);

  const turn = useCallback(
    (to: number) => {
      if (flip) return;
      const target = Math.max(0, Math.min(views - 1, to));
      if (target === v) return;
      // jumps (dots) and reduced motion open the page directly; a step turns the leaf
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(target - v) > 1) {
        history.replaceState(null, "", `#${firstPage(target, wide) + 1}`);
        changed();
        return;
      }
      setFlip({ dir: target > v ? 1 : -1, to: target });
    },
    [flip, views, v, wide],
  );

  const land = () => {
    if (!flip) return;
    history.replaceState(null, "", `#${firstPage(flip.to, wide) + 1}`);
    changed();
    setFlip(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") turn(v + 1);
      if (e.key === "ArrowLeft") turn(v - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [v, turn]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  let stage;
  if (wide) {
    // one page: a 3:4 sheet; the open book is two of them
    const W = "min(calc((100vw - 64px) / 2), calc((100dvh - 150px) * 0.75), 520px)";
    const H = `calc(${W} * 4 / 3)`;
    const cur = SPREADS[v];
    const next = flip ? SPREADS[flip.to] : cur;
    // under the turning leaf: the page it uncovers, and the page that stays put
    const left = flip?.dir === -1 ? next[0] : cur[0];
    const right = flip?.dir === 1 ? next[1] : cur[1];
    const sheet = { width: W, height: H };
    stage = (
      <div
        className="relative flex"
        style={{ width: `calc(${W} * 2)`, height: H, perspective: "2400px", transform: `translateX(calc(${W} * ${shiftOf(next)}))`, transition: `transform ${TURN_MS}ms cubic-bezier(.4,.1,.2,1)` }}
      >
        <Sheet page={left} lang={lang} side="left" style={sheet} className={SHADOW} />
        <Sheet page={right} lang={lang} side="right" style={sheet} className={SHADOW} />
        {flip && (
          <div
            className="absolute top-0"
            onAnimationEnd={land}
            style={{
              ...sheet,
              left: flip.dir === 1 ? W : 0,
              transformOrigin: flip.dir === 1 ? "left center" : "right center",
              transformStyle: "preserve-3d",
              animation: `${flip.dir === 1 ? "leaf-next" : "leaf-prev"} ${TURN_MS}ms cubic-bezier(.45,.05,.25,1) forwards`,
            }}
          >
            <Sheet page={flip.dir === 1 ? cur[1] : cur[0]} lang={lang} side={flip.dir === 1 ? "right" : "left"} className="absolute inset-0 [backface-visibility:hidden]" />
            <Sheet page={flip.dir === 1 ? next[0] : next[1]} lang={lang} side={flip.dir === 1 ? "left" : "right"} className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]" />
          </div>
        )}
      </div>
    );
  } else {
    const W = "min(calc(100vw - 32px), 560px)";
    const H = `min(calc(100dvh - 140px), calc(${W} * 1.9))`;
    const under = flip ? (flip.dir === 1 ? flip.to : v) : v;
    const card = "shadow-[0_24px_60px_-20px_rgba(64,39,34,.35)] ring-1 ring-sand-2";
    stage = (
      <div className="relative" style={{ width: W, height: H, perspective: "2000px" }}>
        <Sheet page={under} lang={lang} side="single" style={{ width: "100%", height: "100%" }} className={card} />
        {flip && (
          <div
            className="absolute inset-0"
            onAnimationEnd={land}
            style={{ transformOrigin: "left center", transformStyle: "preserve-3d", animation: `${flip.dir === 1 ? "single-next" : "single-prev"} ${TURN_MS}ms cubic-bezier(.45,.05,.25,1) forwards` }}
          >
            <Sheet page={flip.dir === 1 ? v : flip.to} lang={lang} side="single" className={`absolute inset-0 ${card} [backface-visibility:hidden]`} />
            <div className="absolute inset-0 rounded-[18px] bg-sand-2 [backface-visibility:hidden] [transform:rotateY(180deg)]" aria-hidden="true" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center overflow-hidden px-4 pb-5 pt-3">
      <header className="flex w-full max-w-[1080px] items-center justify-between gap-3">
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
                onClick={() => saveLang(l)}
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
        className="mt-3 flex w-full flex-1 select-none items-center justify-center"
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerUp={(e) => {
          if (start.current == null) return;
          const dx = e.clientX - start.current;
          start.current = null;
          if (Math.abs(dx) > 50) turn(v + (dx < 0 ? 1 : -1));
          else if (Math.abs(dx) < 6 && !(e.target as HTMLElement).closest("a,button")) {
            // a tap on the right half turns forward, on the left half back, like a page corner
            const r = e.currentTarget.getBoundingClientRect();
            turn(v + (e.clientX > r.left + r.width / 2 ? 1 : -1));
          }
        }}
      >
        {stage}
      </main>

      <nav className="mt-4 flex w-full max-w-[560px] items-center justify-between gap-3" aria-label={t.contents}>
        <button type="button" onClick={() => turn(v - 1)} disabled={v === 0} className="cursor-pointer rounded-full bg-sand px-4 py-2 text-sm font-bold disabled:cursor-default disabled:opacity-35">
          ← <span className="max-sm:sr-only">{t.prev}</span>
        </button>
        <ol className="m-0 flex list-none gap-1.5 p-0">
          {book.pages.map((p, k) => {
            const on = wide ? SPREADS[v].includes(k) : k === v;
            return (
              <li key={k}>
                <button
                  type="button"
                  aria-label={`${t.page} ${k + 1}: ${pageTitle(p, lang)}`}
                  aria-current={on ? "page" : undefined}
                  onClick={() => turn(viewOf(k, wide))}
                  className={`block h-2.5 cursor-pointer rounded-full transition-all duration-300 ${on ? "w-6 bg-melt" : "w-2.5 bg-sand-2 hover:bg-ink/40"}`}
                />
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => turn(v + 1)} disabled={v === views - 1} className="cursor-pointer rounded-full bg-ink px-4 py-2 text-sm font-bold text-cream disabled:cursor-default disabled:opacity-35">
          <span className="max-sm:sr-only">{t.next}</span> →
        </button>
      </nav>
    </div>
  );
}
