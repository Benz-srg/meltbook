"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { PageFlip } from "page-flip";
import { UI, type Book, type Lang } from "@/lib/book";
import { BookPage, pageTitle } from "@/components/Pages";
import { Logo } from "@/components/Logo";
import { useLang } from "@/components/lang";

/* The book is turned by StPageFlip (page-flip): the page curls from the corner you drag, follows a
   finger or the mouse, casts moving shadows, and the covers turn stiff like board. On a wide screen
   it opens as two-page spreads; on a phone one page fills the screen and a swipe turns it. */

const WIDE = "(min-width: 900px) and (min-height: 560px)";
const listenWide = (cb: () => void) => {
  const m = matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
// notebook rules: soft sky-blue lines every 28px, and a faint paper grain
const RULED = "repeating-linear-gradient(to bottom, transparent 0 27px, rgba(34,150,210,.16) 27px 28px)";
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .25 0 0 0 0 .15 0 0 0 0 .1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/** One sheet of paper (or board, for the covers). `side`: which side of the spine it lies on. */
function Sheet({ book, page, lang, side }: { book: Book; page: number; lang: Lang; side: "left" | "right" | "single" }) {
  const p = book.pages[page];
  const hard = p.kind === "cover" || p.kind === "back";
  // the binding side: where the punched holes run
  const spine = side === "left" ? "right" : "left";
  const style: CSSProperties = hard ? {} : { backgroundImage: RULED };
  return (
    <article aria-label={`${UI[lang].page} ${page + 1} / ${book.pages.length}: ${pageTitle(p, lang)}`} className="relative size-full overflow-hidden bg-cream" style={style}>
      {!hard && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-[2px] bg-melt/25" style={{ [spine]: "8.5%" }} />}
      {/* the content; on a phone it keeps clear of the bars over the top and bottom */}
      <div className={`absolute [container-type:size] ${side === "single" ? "inset-x-0 bottom-[52px] top-[52px]" : "inset-0"}`}>
        <BookPage book={book} page={p} lang={lang} n={page + 1} />
      </div>
      {!hard && <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.18] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />}
      {/* punched holes along the binding, like a ring notebook */}
      {!hard && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[3%] w-[22px]"
          style={{ [spine]: "2.2%", backgroundImage: "radial-gradient(circle at 50% 50%, #d9d2c6 0 6px, #e9e4da 6px 7px, transparent 7.5px)", backgroundSize: "22px 30px", backgroundRepeat: "repeat-y", backgroundPosition: "center" }}
        />
      )}
      {/* paper bending into the spine */}
      {side !== "single" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(to ${spine === "right" ? "left" : "right"}, rgba(64,39,34,${hard ? 0.18 : 0.22}), rgba(64,39,34,.05) 6%, transparent 14%)` }}
        />
      )}
    </article>
  );
}

const startPage = (n: number) => {
  const h = Number(location.hash.slice(1));
  return h >= 1 && h <= n ? h - 1 : 0;
};

export function Reader({ book }: { book: Book }) {
  const N = book.pages.length;
  const [lang, setLang] = useLang();
  const wide = useSyncExternalStore(listenWide, () => matchMedia(WIDE).matches, () => false);
  const host = useRef<HTMLDivElement>(null);
  const flip = useRef<PageFlip | null>(null);
  // the page elements StPageFlip moves around; React renders into them through portals
  const [sheets, setSheets] = useState<HTMLElement[]>([]);
  const [page, setPage] = useState(0);
  const t = UI[lang];

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let pf: PageFlip | null = null;
    let cancelled = false;
    // StPageFlip removes its own root on destroy, so it gets a root React doesn't own
    const root = document.createElement("div");
    el.appendChild(root);
    const nodes = book.pages.map((p) => {
      const d = document.createElement("div");
      d.className = "page";
      if (p.kind === "cover" || p.kind === "back") d.dataset.density = "hard";
      root.appendChild(d);
      return d;
    });
    const first = startPage(N);
    import("page-flip").then(({ PageFlip }) => {
      if (cancelled) return;
      const w = wide ? 520 : window.innerWidth;
      const h = wide ? 693 : window.innerHeight;
      pf = new PageFlip(root, {
        width: w,
        height: h,
        size: wide ? "stretch" : "fixed",
        minWidth: wide ? 300 : w,
        maxWidth: w,
        minHeight: wide ? 400 : h,
        maxHeight: h,
        showCover: true,
        usePortrait: !wide,
        autoSize: true,
        drawShadow: true,
        maxShadowOpacity: 0.45,
        flippingTime: 850,
        swipeDistance: 20,
        showPageCorners: true,
        mobileScrollSupport: false,
        startPage: first,
      });
      pf.loadFromHTML(nodes);
      pf.on("flip", (e) => {
        const i = Number(e.data);
        setPage(i);
        history.replaceState(null, "", `#${i + 1}`);
      });
      flip.current = pf;
    });
    // the pages exist from here on; the content is drawn into them
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSheets(nodes);
    setPage(first);
    return () => {
      cancelled = true;
      flip.current = null;
      pf?.destroy();
      root.remove();
      setSheets([]);
    };
  }, [book, N, wide]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") flip.current?.flipNext();
      if (e.key === "ArrowLeft") flip.current?.flipPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // in a spread the cover sits alone on the right, then odd pages fall left of the spine
  const sideOf = (i: number): "left" | "right" | "single" => (!wide ? "single" : i === 0 ? "right" : i % 2 === 1 ? "left" : "right");
  const portals = sheets.map((node, i) => createPortal(<Sheet book={book} page={i} lang={lang} side={sideOf(i)} />, node, `p${i}`));

  const langSwitch = (
    <div className="flex rounded-full bg-sand/90 p-1 text-sm font-bold backdrop-blur" role="group" aria-label="Language">
      {(["th", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${lang === l ? "bg-ink text-cream" : "text-ink/60 hover:text-melt"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
  // in a spread both open pages are lit
  const on = (k: number) => (wide && page > 0 && page < N - 1 ? k === page || k === (page % 2 ? page + 1 : page - 1) : k === page);
  const dots = (
    <ol className="m-0 flex list-none gap-1.5 p-0">
      {book.pages.map((p, k) => (
        <li key={k}>
          <button
            type="button"
            aria-label={`${t.page} ${k + 1}: ${pageTitle(p, lang)}`}
            aria-current={on(k) ? "page" : undefined}
            onClick={() => flip.current?.flip(k)}
            className={`block h-2.5 cursor-pointer rounded-full transition-all duration-300 ${on(k) ? "w-6 bg-melt" : "w-2.5 bg-ink/15 hover:bg-ink/40"}`}
          />
        </li>
      ))}
    </ol>
  );

  if (!wide)
    return (
      <div className="fixed inset-0 touch-none select-none overflow-hidden bg-cream">
        <div ref={host} className="absolute inset-0" />
        {portals}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-between p-3">
          <Link href="/" className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-cream/85 px-3 py-1.5 text-sm font-bold shadow-sm backdrop-blur">
            ← {t.shelf}
          </Link>
          <div className="pointer-events-auto">{langSwitch}</div>
        </div>
        <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))]" aria-label={t.contents}>
          <div className="pointer-events-auto rounded-full bg-cream/85 px-3 py-2 shadow-sm backdrop-blur">{dots}</div>
        </nav>
      </div>
    );

  return (
    <div className="flex min-h-dvh select-none flex-col items-center overflow-hidden px-4 pb-5 pt-3">
      <header className="flex w-full max-w-[1100px] items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-auto" />
          <span className="font-display text-xl text-melt">meltbook</span>
          <span className="text-sm font-bold text-ink/50">· {t.shelf}</span>
        </Link>
        <div className="flex items-center gap-2">
          {langSwitch}
          <a href={`/epub/${book.slug}.epub`} download className="rounded-full bg-melt px-3.5 py-1.5 text-sm font-bold text-cream hover:bg-ink">
            EPUB
          </a>
        </div>
      </header>
      <main className="mt-4 flex w-full flex-1 items-center justify-center">
        <div ref={host} className="w-full max-w-[1040px] [filter:drop-shadow(0_24px_30px_rgba(64,39,34,.28))]" />
        {portals}
      </main>
      <nav className="mt-6 flex w-full max-w-[560px] items-center justify-between gap-3" aria-label={t.contents}>
        <button type="button" onClick={() => flip.current?.flipPrev()} disabled={page === 0} className="cursor-pointer rounded-full bg-sand px-4 py-2 text-sm font-bold disabled:cursor-default disabled:opacity-35">
          ← {t.prev}
        </button>
        {dots}
        <button type="button" onClick={() => flip.current?.flipNext()} disabled={page >= N - 1} className="cursor-pointer rounded-full bg-ink px-4 py-2 text-sm font-bold text-cream disabled:cursor-default disabled:opacity-35">
          {t.next} →
        </button>
      </nav>
    </div>
  );
}
