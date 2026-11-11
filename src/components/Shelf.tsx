"use client";

import Link from "next/link";
import { BOOKS, TONE, UI, fill } from "@/lib/book";
import { Logo } from "@/components/Logo";
import { useLang } from "@/components/lang";

/* The bookshelf: every volume standing as a hardcover with its spine showing, on a wooden shelf.
   A volume opens its reader; each has its EPUB for ReadAwrite. */
export function Shelf() {
  const [lang, setLang] = useLang();
  const t = UI[lang];
  return (
    <div className="min-h-dvh bg-cream px-4 pb-16 pt-4">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
          <span className="font-display text-2xl text-melt">meltbook</span>
        </div>
        <div className="flex rounded-full bg-sand p-1 text-sm font-bold" role="group" aria-label="Language">
          {(["th", "en"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`cursor-pointer rounded-full px-3 py-1 ${lang === l ? "bg-ink text-cream" : "text-ink/60 hover:text-melt"}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto mt-12 max-w-5xl">
        <h1 className="font-display text-[clamp(40px,8vw,72px)] leading-none text-melt">{t.shelf}</h1>
        <p className="mt-3 max-w-xl text-lg text-ink/70">{t.shelfLead}</p>

        <div className="relative mt-12">
          <ul className="m-0 flex list-none flex-wrap items-end gap-x-10 gap-y-14 p-0 px-4">
            {BOOKS.map((b) => {
              const tone = TONE[b.color];
              return (
                <li key={b.slug} className="flex flex-col items-start gap-4">
                  <Link href={`/book/${b.slug}`} className="group block [perspective:1200px]" aria-label={`${t.read} ${b.title[lang]}`}>
                    <div className="relative h-[300px] w-[220px] transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] [transform-style:preserve-3d] [transform:rotateY(-24deg)] group-hover:[transform:rotateY(-8deg)_translateY(-8px)]">
                      {/* page block */}
                      <span aria-hidden="true" className="absolute right-0 top-[4px] h-[292px] w-[30px] origin-right [transform:rotateY(90deg)_translateX(15px)]" style={{ background: "repeating-linear-gradient(to bottom, #f4f1ea 0 1px, #ddd6cb 1px 2px)" }} />
                      {/* spine */}
                      <span aria-hidden="true" className={`absolute left-0 top-0 flex h-full w-[34px] origin-left items-center justify-center [transform:rotateY(-90deg)] ${tone.bg}`}>
                        <span className="rotate-90 whitespace-nowrap font-display text-sm text-cream">meltbook · {b.volume}</span>
                      </span>
                      {/* front cover */}
                      <div className={`absolute inset-0 overflow-hidden rounded-r-[8px] p-5 text-cream shadow-[18px_24px_40px_-18px_rgba(64,39,34,.55)] ${tone.bg}`}>
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.13] mix-blend-multiply" style={{ backgroundImage: "repeating-linear-gradient(0deg, #000 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, #000 0 1px, transparent 1px 3px)" }} />
                        <span aria-hidden="true" className="absolute inset-y-0 left-[10px] w-[3px] bg-black/10" />
                        <Logo className="relative h-6 w-auto" color="#faf9f6" />
                        <p className="relative mt-5 font-display text-[40px] leading-[0.9]">meltbook</p>
                        <p className="relative mt-1 font-display text-base leading-tight">{b.series[lang]}</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.coverArt} alt="" className="absolute -bottom-2 right-2 h-[120px] w-auto -rotate-12" />
                        <span className="absolute bottom-4 left-5 rounded-full border-2 border-cream px-2 py-0.5 text-xs font-bold">{fill(t.vol, { n: b.volume })}</span>
                      </div>
                    </div>
                  </Link>
                  <div>
                    <p className="m-0 font-bold">{b.title[lang]}</p>
                    <p className="m-0 text-sm text-ink/60">{fill(t.pages, { n: b.pages.length })}</p>
                    <div className="mt-2 flex gap-2">
                      <Link href={`/book/${b.slug}`} className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-cream hover:bg-melt">
                        {t.read}
                      </Link>
                      <a href={`/epub/${b.slug}.epub`} download className="rounded-full border-2 border-ink/15 px-4 py-1 text-sm font-bold hover:border-melt hover:text-melt">
                        EPUB
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {/* the shelf board */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[300px] h-4 rounded-sm bg-mocha shadow-[0_14px_24px_-10px_rgba(64,39,34,.6)]" />
        </div>
      </section>
    </div>
  );
}
