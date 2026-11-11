"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type * as THREE from "three";
import { UI, type Book, type Lang } from "@/lib/book";
import { BookPage, pageTitle } from "@/components/Pages";
import { Logo } from "@/components/Logo";
import { useLang } from "@/components/lang";
import { FLAT, dragAt, edgeX, turnAt, type CurlState } from "@/components/flip/curl";
import type { FlipGL } from "@/components/flip/FlipGL";
import { forget, snapshot } from "@/components/flip/snapshot";

/* meltbook's reader. The pages at rest are real HTML (crisp text, working links). The one page that
   turns is drawn in WebGL (FlipGL) from pictures of its two sides, bent along a continuous curve
   (flip/curl), lit by a soft light from above, and casting a shadow on the page it uncovers.

   Turning: drag a page from its outer side (a corner lifts it unevenly), click the outer edge, swipe
   on a phone, or use the arrow keys. Letting go finishes the turn or lays the page back, by how far
   it went and how fast. One turn at a time. Reduced motion: pages change without moving. */

type Side = "left" | "right" | "single";
type View = [number | null, number | null];
const WIDE = "(min-width: 900px) and (min-height: 560px)";
const listenWide = (cb: () => void) => {
  const m = matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const listenHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  window.addEventListener("meltbook", cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("meltbook", cb);
  };
};
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function spreadsOf(n: number): View[] {
  const v: View[] = [[null, 0]];
  for (let p = 1; p < n - 1; p += 2) v.push([p, p + 1 < n - 1 ? p + 1 : null]);
  v.push([n - 1, null]);
  return v;
}
// a closed book sits centred: the cover alone moves left half a page, the back cover right
const shiftOf = ([l, r]: View) => (l == null ? -0.5 : r == null ? 0.5 : 0);

const RULED = "repeating-linear-gradient(to bottom, transparent 0 27px, rgba(34,150,210,.16) 27px 28px)";
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .25 0 0 0 0 .15 0 0 0 0 .1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/** One page as paper (or board, for the covers): ruled lines, punched holes on the binding side. */
function Sheet({ book, page, lang, side, bars = false }: { book: Book; page: number; lang: Lang; side: Side; bars?: boolean }) {
  const p = book.pages[page];
  const hard = p.kind === "cover" || p.kind === "back";
  const spine = side === "left" ? "right" : "left";
  const style: CSSProperties = hard ? {} : { backgroundImage: RULED };
  // the content keeps clear of the holes and the margin line on the binding side
  const outer = spine === "left" ? "right" : "left";
  const inset: CSSProperties = hard
    ? { top: bars ? 52 : 0, bottom: bars ? 52 : 0, left: 0, right: 0 }
    : { top: bars ? 56 : "3%", bottom: bars ? 56 : "3%", [spine]: "9%", [outer]: "3%" };
  return (
    <article aria-label={`${UI[lang].page} ${page + 1} / ${book.pages.length}: ${pageTitle(p, lang)}`} className="relative size-full overflow-hidden bg-cream" style={style}>
      {!hard && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-[2px] bg-melt/25" style={{ [spine]: "8.5%" }} />}
      <div className="absolute [container-type:size]" style={inset}>
        <BookPage book={book} page={p} lang={lang} n={page + 1} />
      </div>
      {!hard && <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.16] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />}
      {!hard && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[3%] w-[22px]"
          style={{ [spine]: "2.2%", backgroundImage: "radial-gradient(circle at 50% 50%, #d9d2c6 0 6px, #e9e4da 6px 7px, transparent 7.5px)", backgroundSize: "22px 30px", backgroundRepeat: "repeat-y", backgroundPosition: "center" }}
        />
      )}
      {side !== "single" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(to ${spine === "right" ? "left" : "right"}, rgba(64,39,34,${hard ? 0.16 : 0.2}), rgba(64,39,34,.05) 6%, transparent 14%)` }}
        />
      )}
    </article>
  );
}

/* The page block seen from the side: thin stripes for the leaves under each half of the open book. */
function Edge({ leaves, side }: { leaves: number; side: "left" | "right" }) {
  if (leaves <= 0) return null;
  const w = Math.min(12, 2 + leaves * 1.4);
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-[2px] top-[2px] ${side === "left" ? "rounded-l-[3px]" : "rounded-r-[3px]"}`}
      style={{ width: w, [side]: -w + 1, background: `repeating-linear-gradient(to ${side}, #f6f3ec 0 1px, #ddd5c8 1px 2px)` }}
    />
  );
}

/** What is turning: the leaf's two faces and the pages it lies over. */
type Turn = { from: number; to: number; front: number | null; back: number | null; under: View; target?: 0 | 1 };

export function Reader({ book }: { book: Book }) {
  const N = book.pages.length;
  const SPREADS = spreadsOf(N);
  const [lang, setLang] = useLang();
  const wide = useSyncExternalStore(listenWide, () => matchMedia(WIDE).matches, () => false);
  const hashPage = useSyncExternalStore(listenHash, () => {
    const h = Number(location.hash.slice(1));
    return h >= 1 && h <= N ? h - 1 : 0;
  }, () => 0);
  const t = UI[lang];

  const views = wide ? SPREADS.length : N;
  const viewOf = useCallback((p: number) => (wide ? SPREADS.findIndex(([l, r]) => l === p || r === p) : p), [wide, SPREADS]);
  const v = viewOf(hashPage);
  const firstPage = (x: number) => (wide ? (SPREADS[x][0] ?? SPREADS[x][1] ?? 0) : x);

  // page size: a 3:4 sheet (two side by side when wide); on a phone, the whole screen
  const [size, setSize] = useState({ W: 0, H: 0 });
  useLayoutEffect(() => {
    const fit = () => {
      if (matchMedia(WIDE).matches) {
        const W = Math.floor(Math.min((innerWidth - 120) / 2, (innerHeight - 170) * 0.75, 520));
        setSize({ W, H: Math.round((W * 4) / 3) });
      } else setSize({ W: innerWidth, H: innerHeight });
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [wide]);
  const { W, H } = size;
  const PAD = Math.round(W * 0.35);

  const [turn, setTurn] = useState<Turn | null>(null);
  const turnRef = useRef<Turn | null>(null);
  const gl = useRef<FlipGL | null>(null);
  const canvasBox = useRef<HTMLDivElement>(null);
  const bookBox = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ W, H, wide });
  const offscreen = useRef<HTMLDivElement>(null);
  const textures = useRef(new Map<number, THREE.Texture>());

  /* ---------- WebGL ---------- */
  useEffect(() => {
    let alive = true;
    let made: FlipGL | null = null;
    import("@/components/flip/FlipGL").then(({ FlipGL }) => {
      if (!alive || !canvasBox.current) return;
      made = new FlipGL();
      made.canvas.style.position = "absolute";
      made.canvas.style.inset = "0";
      canvasBox.current.appendChild(made.canvas);
      gl.current = made;
      // the size may have been worked out before three.js finished loading
      const z = sizeRef.current;
      if (z.W) made.resize(z.wide ? z.W * 2 : z.W, z.H, z.W, Math.round(z.W * 0.35));
    });
    return () => {
      alive = false;
      made?.canvas.remove();
      made?.dispose();
      gl.current = null;
      textures.current.clear();
    };
  }, [wide]);

  useEffect(() => {
    sizeRef.current = { W, H, wide };
    if (!W) return;
    gl.current?.resize(wide ? W * 2 : W, H, W, PAD);
  }, [W, H, PAD, wide]);

  /* ---------- page pictures, drawn ahead of time ---------- */
  const key = (i: number) => `${book.slug}:${lang}:${W}x${H}:${wide ? "w" : "p"}:${i}`;
  const textureOf = useCallback(
    async (i: number | null) => {
      if (i == null || !offscreen.current || !gl.current) return null;
      const node = offscreen.current.querySelector<HTMLElement>(`[data-page="${i}"]`);
      if (!node) return null;
      const canvas = await snapshot(node, key(i));
      const k = i;
      let tex = textures.current.get(k);
      if (!tex || (tex.image as HTMLCanvasElement) !== canvas) {
        tex?.dispose();
        tex = gl.current.texture(canvas);
        textures.current.set(k, tex);
      }
      return tex;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.slug, lang, W, H, wide],
  );
  useEffect(() => {
    if (!W) return;
    textures.current.forEach((x) => x.dispose());
    textures.current.clear();
    forget(`${book.slug}:`);
    // nearest pages first, the rest when the browser is idle
    let stop = false;
    const order = book.pages.map((_, i) => i).sort((a, b) => Math.abs(a - hashPage) - Math.abs(b - hashPage));
    (async () => {
      await new Promise((r) => setTimeout(r, 400)); // fonts and images settle
      for (const i of order) {
        if (stop) return;
        await new Promise((r) => ("requestIdleCallback" in window ? requestIdleCallback(r) : setTimeout(r, 30)));
        await textureOf(i).catch(() => null);
      }
    })();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.slug, lang, W, H, wide]);

  /* ---------- drawing one frame ---------- */
  const shiftTo = (x: number) => {
    if (bookBox.current && wide) bookBox.current.style.transform = `translateX(${x * W}px)`;
  };
  const frame = useCallback(
    (s: CurlState) => {
      const g = gl.current;
      const tr = turnRef.current;
      if (!g || !tr) return;
      g.draw(s);
      // the shadow the leaf casts on the page it uncovers, just beyond its outer edge
      const ex = edgeX(s, W);
      const lift = Math.sin((s.edge + s.spine) / 2);
      const el = shadow.current;
      if (el) {
        const width = 30 + 150 * lift;
        const spineX = wide ? W : 0;
        el.style.opacity = String(Math.min(1, lift * 1.3));
        el.style.width = `${width}px`;
        el.style.transform = `translateX(${ex >= 0 ? spineX + ex : spineX + ex - width}px)`;
        el.style.background = `linear-gradient(to ${ex >= 0 ? "right" : "left"}, rgba(64,39,34,${0.32 * lift}), transparent)`;
      }
      // a closed book slides to the middle as it opens, and back as it closes
      if (wide) {
        const p = Math.min(1, Math.max(0, s.edge / Math.PI));
        const a = shiftOf(SPREADS[tr.from]);
        const b = shiftOf(SPREADS[tr.to]);
        const done = tr.to > tr.from ? p : 1 - p;
        shiftTo(a + (b - a) * done);
      }
    },
    [W, wide, SPREADS],
  );

  /* ---------- the turn's life: begin, move, finish ---------- */
  const raf = useRef(0);
  const live = useRef<CurlState>(FLAT);

  const finish = useCallback(
    (tr: Turn, completed: boolean) => {
      cancelAnimationFrame(raf.current);
      const target = completed ? tr.to : tr.from;
      history.replaceState(null, "", `#${firstPage(target) + 1}`);
      window.dispatchEvent(new Event("meltbook"));
      turnRef.current = null;
      setTurn(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wide, SPREADS],
  );

  // once React shows the new pages, the canvas can let go of the last frame
  useLayoutEffect(() => {
    if (!turn) {
      gl.current?.clear();
      if (shadow.current) shadow.current.style.opacity = "0";
      shiftTo(wide ? shiftOf(SPREADS[v]) : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, v, wide]);

  /** Sets up the leaf for a turn from view `from` to the next or previous view. */
  const prepare = useCallback(
    async (to: number): Promise<Turn | null> => {
      if (turnRef.current || to < 0 || to >= views || to === v || !gl.current) return null;
      const fwd = to > v;
      let tr: Turn;
      if (wide) {
        const cur = SPREADS[v];
        const nxt = SPREADS[to];
        // the leaf is always the sheet on the right of the spine: going back, it's the one lying on the left
        tr = fwd ? { from: v, to, front: cur[1], back: nxt[0], under: [cur[0], nxt[1]] } : { from: v, to, front: nxt[1], back: cur[0], under: [nxt[0], cur[1]] };
      } else {
        tr = fwd ? { from: v, to, front: v, back: null, under: [null, to] } : { from: v, to, front: to, back: null, under: [null, v] };
      }
      const [front, back] = await Promise.all([textureOf(tr.front), textureOf(tr.back)]);
      if (turnRef.current || !gl.current) return null;
      gl.current.setLeaf(wide ? W : 0, 1, front, back);
      turnRef.current = tr;
      setTurn(tr);
      return tr;
    },
    [views, v, wide, SPREADS, W, textureOf],
  );

  const stiffOf = (tr: Turn) => {
    const hard = (i: number | null) => i != null && (book.pages[i].kind === "cover" || book.pages[i].kind === "back");
    return hard(tr.front) && (tr.back == null || hard(tr.back));
  };

  /** A full turn on its own (click, key, dots): about 850 ms, edge first, spine settling last. */
  const go = useCallback(
    async (to: number) => {
      if (turnRef.current) return;
      if (reduced()) {
        if (to >= 0 && to < views) {
          history.replaceState(null, "", `#${firstPage(to) + 1}`);
          window.dispatchEvent(new Event("meltbook"));
        }
        return;
      }
      // a jump from the dots turns one leaf and opens on the chosen page
      const tr = await prepare(to);
      if (!tr) return;
      const fwd = to > tr.from;
      const stiff = stiffOf(tr);
      const D = stiff ? 950 : 850;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / D);
        // going back, the same motion runs in reverse, with the edge still leading
        const s = fwd ? turnAt(k, stiff) : mirror(turnAt(k, stiff));
        live.current = s;
        frame(s);
        if (k < 1) raf.current = requestAnimationFrame(step);
        else finish(tr, true);
      };
      raf.current = requestAnimationFrame(step);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prepare, frame, finish, views],
  );

  /** Lets go of a drag: carry on to the end, or lay the page back, easing from where it is. */
  const release = useCallback(
    (tr: Turn, complete: boolean) => {
      const s0 = live.current;
      const end: CurlState = complete === tr.to > tr.from ? { spine: Math.PI, edge: Math.PI, twist: 0, corner: s0.corner } : { ...FLAT, corner: s0.corner };
      const fwdEnd = end.edge > 0;
      const dist = Math.abs(end.edge - s0.edge) / Math.PI;
      const D = 280 + 520 * dist;
      const t0 = performance.now();
      const out = (x: number) => 1 - Math.pow(1 - x, 3);
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / D);
        // the edge arrives first; the spine and the corner settle behind it
        const ke = out(Math.min(1, k / 0.82));
        const ks = out(k);
        const s: CurlState = {
          edge: s0.edge + (end.edge - s0.edge) * ke,
          spine: s0.spine + (end.spine - s0.spine) * ks,
          twist: s0.twist * (1 - ks),
          corner: s0.corner,
        };
        live.current = s;
        frame(s);
        if (k < 1) raf.current = requestAnimationFrame(step);
        else finish(tr, fwdEnd === tr.to > tr.from ? complete : !complete);
      };
      raf.current = requestAnimationFrame(step);
    },
    [frame, finish],
  );

  /* ---------- pointer: drag a corner, click an edge, swipe ---------- */
  const drag = useRef<{ x0: number; y0: number; t0: number; tr: Turn | null; pending: boolean; lastX: number; lastT: number; vx: number; peek: boolean } | null>(null);

  const local = (e: React.PointerEvent) => {
    const r = bookBox.current!.getBoundingClientRect();
    // x from the spine (positive to the right), y from the top of the page
    return { x: e.clientX - r.left - (wide ? W : 0), y: e.clientY - r.top };
  };

  const onPointerDown = async (e: React.PointerEvent) => {
    if (turnRef.current && !drag.current?.peek) return;
    if ((e.target as HTMLElement).closest("a,button")) return; // links and buttons work as they should
    if (e.button !== 0 || !bookBox.current) return;
    const { x, y } = local(e);
    // the outer part of a page is where it can be picked up
    const outer = wide ? Math.abs(x) > W * 0.45 : true;
    if (!outer || y < 0 || y > H) return;
    const fwd = wide ? x > 0 : x > W * 0.5 || true;
    drag.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), tr: drag.current?.tr ?? null, pending: true, lastX: e.clientX, lastT: performance.now(), vx: 0, peek: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    void fwd;
  };

  const onPointerMove = async (e: React.PointerEvent) => {
    const d = drag.current;
    if (!bookBox.current || reduced()) return;
    const { x, y } = local(e);
    if (!d) {
      // hovering a corner: the page lifts a little, inviting a turn (wide screens)
      if (!wide || turnRef.current) return;
      const corner = Math.abs(x) > W - 70 && (y < 70 || y > H - 70) && !(e.target as HTMLElement).closest("a,button");
      if (corner) {
        const to = v + (x > 0 ? 1 : -1);
        drag.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), tr: null, pending: false, lastX: e.clientX, lastT: performance.now(), vx: 0, peek: true };
        const tr = await prepare(to);
        if (!tr || !drag.current) return;
        drag.current.tr = tr;
      }
      return;
    }
    const now = performance.now();
    d.vx = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
    d.lastX = e.clientX;
    d.lastT = now;
    if (d.peek) {
      const inCorner = Math.abs(x) > W - 90 && (y < 90 || y > H - 90);
      if (!inCorner && d.tr) {
        const tr = d.tr;
        drag.current = null;
        release(tr, false);
        return;
      }
      if (d.tr) {
        // follow the pointer, but only a little: a peek, not a turn
        const px = x > 0 ? Math.max(W - 60, x) : Math.min(-(W - 60), x);
        const s = dragAt(px > 0 ? px : px, y, W, H, stiffOf(d.tr));
        const sp = x > 0 ? s : s;
        live.current = sp;
        frame(sp);
      }
      return;
    }
    if (d.pending) {
      if (Math.abs(e.clientX - d.x0) < 8) return;
      d.pending = false;
      if (!d.tr) {
        const to = wide ? v + (local(e).x > 0 ? 1 : -1) : v + (e.clientX < d.x0 ? 1 : -1);
        d.tr = await prepare(to);
        if (!d.tr) {
          drag.current = null;
          return;
        }
      }
    }
    if (!d.tr) return;
    // on a phone the finger can grab anywhere: its travel maps onto the page's turn
    const px = wide ? x : d.tr.to > d.tr.from ? W - (d.x0 - e.clientX) * 1.6 : -W + (e.clientX - d.x0) * 1.6;
    const s = dragAt(px, wide ? y : (d.y0 - bookBox.current.getBoundingClientRect().top), W, H, stiffOf(d.tr));
    live.current = s;
    frame(s);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.peek) {
      if (d?.peek && d.tr) {
        // a click on a lifted corner turns the page
        const tr = d.tr;
        release(tr, true);
      }
      return;
    }
    if (d.pending) {
      // a click without dragging: the outer edge turns, as on a real page
      if (performance.now() - d.t0 < 400) {
        const { x } = local(e);
        if (wide) go(v + (x > 0 ? 1 : -1));
        else go(v + (x > W * 0.4 ? 1 : -1));
      }
      return;
    }
    if (!d.tr) return;
    const fwd = d.tr.to > d.tr.from;
    const s = live.current;
    // past halfway, or flicked in the turning direction, it goes over; otherwise it lies back
    const flick = fwd ? d.vx < -0.45 : d.vx > 0.45;
    const back = fwd ? d.vx > 0.45 : d.vx < -0.45;
    const over = fwd ? s.edge > Math.PI / 2 : s.edge < Math.PI / 2;
    release(d.tr, !back && (over || flick));
  };

  const onPointerLeave = () => {
    const d = drag.current;
    if (d?.peek && d.tr) {
      drag.current = null;
      release(d.tr, false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(v + 1);
      if (e.key === "ArrowLeft") go(v - 1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [v, go]);

  /* ---------- what shows where ---------- */
  const sideOf = (i: number): Side => (!wide ? "single" : i === 0 ? "right" : i % 2 === 1 ? "left" : "right");
  const shown: View = turn ? turn.under : wide ? SPREADS[v] : [null, v];
  const leftLeaves = wide && shown[0] != null ? Math.ceil(shown[0] / 2) : 0;
  const rightLeaves = wide && shown[1] != null ? Math.ceil((N - 1 - shown[1]) / 2) : 0;

  const langSwitch = (
    <div className="flex rounded-full bg-sand/90 p-1 text-sm font-bold backdrop-blur" role="group" aria-label="Language">
      {(["th", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${lang === l ? "bg-ink text-cream" : "text-ink/60 hover:text-melt"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
  const lit = (k: number) => (wide ? SPREADS[v].includes(k) : k === v);
  const dots = (
    <ol className="m-0 flex list-none gap-1.5 p-0">
      {book.pages.map((p, k) => (
        <li key={k}>
          <button
            type="button"
            aria-label={`${t.page} ${k + 1}: ${pageTitle(p, lang)}`}
            aria-current={lit(k) ? "page" : undefined}
            onClick={() => go(viewOf(k))}
            className={`block h-2.5 cursor-pointer rounded-full transition-all duration-300 ${lit(k) ? "w-6 bg-melt" : "w-2.5 bg-ink/15 hover:bg-ink/40"}`}
          />
        </li>
      ))}
    </ol>
  );

  const slot = (i: number | null, side: Side) =>
    i == null ? <div style={{ width: W, height: H }} /> : (
      <div className="relative" style={{ width: W, height: H }}>
        {side !== "single" && <Edge leaves={side === "left" ? leftLeaves : rightLeaves} side={side} />}
        <Sheet book={book} page={i} lang={lang} side={side} bars={side === "single"} />
      </div>
    );

  const stage = W ? (
    <div
      ref={bookBox}
      className="relative touch-none"
      style={{ width: wide ? W * 2 : W, height: H, transform: `translateX(${wide ? shiftOf(SPREADS[turn ? turn.from : v]) * W : 0}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {/* the book's shadow on the table */}
      {wide && <span aria-hidden="true" className="pointer-events-none absolute -bottom-5 h-8 rounded-[50%] bg-ink/25 blur-xl" style={{ left: shown[0] == null ? "52%" : "3%", right: shown[1] == null ? "52%" : "3%" }} />}
      <div className="relative flex" style={{ boxShadow: "none" }}>
        {wide ? (
          <>
            {slot(shown[0], "left")}
            {slot(shown[1], "right")}
          </>
        ) : (
          slot(shown[1], "single")
        )}
      </div>
      {/* the shadow cast by the turning page */}
      <div ref={shadow} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-full opacity-0" />
      {/* the turning page itself */}
      <div ref={canvasBox} aria-hidden="true" className="pointer-events-none absolute" style={{ left: -PAD, top: -PAD, width: (wide ? W * 2 : W) + PAD * 2, height: H + PAD * 2, visibility: turn ? "visible" : "hidden" }} />
    </div>
  ) : null;

  // every page, drawn once off-screen at its true size, for the turning page's pictures
  const pictures = W ? (
    <div ref={offscreen} aria-hidden="true" className="pointer-events-none fixed left-[-200vw] top-0" style={{ width: W }}>
      {book.pages.map((_, i) => (
        <div key={i} data-page={i} style={{ width: W, height: H }}>
          <Sheet book={book} page={i} lang={lang} side={sideOf(i)} bars={!wide} />
        </div>
      ))}
    </div>
  ) : null;

  if (!wide)
    return (
      <div className="fixed inset-0 select-none overflow-hidden bg-cream">
        {stage}
        {pictures}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
          <Link href="/" className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-cream/85 px-3 py-1.5 text-sm font-bold shadow-sm backdrop-blur">
            ← {t.shelf}
          </Link>
          <div className="pointer-events-auto">{langSwitch}</div>
        </div>
        <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))]" aria-label={t.contents}>
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
      <main className="mt-6 flex w-full flex-1 items-center justify-center">{stage}</main>
      {pictures}
      <nav className="mt-6 flex w-full max-w-[560px] items-center justify-between gap-3" aria-label={t.contents}>
        <button type="button" onClick={() => go(v - 1)} disabled={v === 0} className="cursor-pointer rounded-full bg-sand px-4 py-2 text-sm font-bold disabled:cursor-default disabled:opacity-35">
          ← {t.prev}
        </button>
        {dots}
        <button type="button" onClick={() => go(v + 1)} disabled={v === views - 1} className="cursor-pointer rounded-full bg-ink px-4 py-2 text-sm font-bold text-cream disabled:cursor-default disabled:opacity-35">
          {t.next} →
        </button>
      </nav>
    </div>
  );
}

/** The same turn, played backwards: the page comes from the left back to the right. */
function mirror(s: CurlState): CurlState {
  return { spine: Math.PI - s.spine, edge: Math.PI - s.edge, twist: 0, corner: s.corner };
}
