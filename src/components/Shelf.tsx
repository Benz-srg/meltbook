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
                  <Link href={`/book/${b.slug}`} className="group block" aria-label={`${t.read} ${b.title[lang]}`}>
                    {/* a flat, Melt-style book: rounded red cover, a darker spine strip, a cream page edge */}
                    <div className="relative flex h-[300px] w-[230px] transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:-translate-y-2 group-hover:-rotate-2">
                      <span aria-hidden="true" className={`flex w-[30px] shrink-0 items-center justify-center rounded-l-[14px] ${tone.bg} brightness-[.82]`}>
                        <span className="whitespace-nowrap font-display text-sm text-cream [writing-mode:vertical-rl]">meltbook · {b.volume}</span>
                      </span>
                      <div className={`relative flex-1 overflow-hidden rounded-r-[18px] p-5 text-cream ${tone.bg}`}>
                        <span aria-hidden="true" className="absolute inset-2 rounded-[12px] border-2 border-cream/40" />
                        <Logo className="relative h-6 w-auto" color="#faf9f6" />
                        <p className="relative mt-5 font-display text-[34px] leading-[0.9]">meltbook</p>
                        <p className="relative mt-1 font-display text-base leading-tight">{b.series[lang]}</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.coverArt} alt="" className="absolute -bottom-3 right-1 h-[118px] w-auto -rotate-12" />
                        <span className="absolute bottom-5 left-5 rounded-full border-2 border-cream px-2 py-0.5 text-xs font-bold">{fill(t.vol, { n: b.volume })}</span>
                      </div>
                      <span aria-hidden="true" className="absolute -right-1.5 bottom-2 top-2 -z-10 w-3 rounded-r-[10px] bg-sand-2" />
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
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[300px] h-3 rounded-full bg-ink" />
        </div>
      </section>
    </div>
  );
}
