import type { Back, Bar, Bean, Cover, Intro, Lang, Page } from "@/lib/book";
import { TONE, UI, book } from "@/lib/book";
import { Logo } from "@/components/Logo";

/* Each page is drawn on a sheet and sized in --u, a container unit (1% of a 3:4 sheet's width), so it
   scales like a printed page. On a phone the sheet is taller than 3:4 and --u grows up to 1.4×, so
   the text stays readable instead of shrinking to fit the narrow width. */

const MockBadge = ({ lang }: { lang: Lang }) => (
  <span className="rounded-full border border-current px-[calc(1.6*var(--u))] py-[calc(0.3*var(--u))] text-[calc(2.2*var(--u))] font-bold uppercase tracking-wide opacity-70">{UI[lang].mock}</span>
);

const Folio = ({ n, light }: { n: number; light?: boolean }) => (
  <span className={`absolute bottom-[calc(2.8*var(--u))] left-1/2 -translate-x-1/2 text-[calc(2.4*var(--u))] tabular-nums ${light ? "text-cream/70" : "text-ink/45"}`}>{n}</span>
);

function CoverPage({ p, lang }: { p: Cover; lang: Lang }) {
  return (
    <div className="flex h-full flex-col px-[calc(7*var(--u))] pb-[calc(7*var(--u))] pt-[calc(8*var(--u))]">
      <div className="flex items-center justify-between">
        <Logo className="h-[calc(9*var(--u))] w-auto" />
        <span className="rounded-full bg-ink px-[calc(3*var(--u))] py-[calc(1*var(--u))] text-[calc(2.8*var(--u))] font-bold text-cream">{p.kicker[lang]}</span>
      </div>
      <h1 className="mt-[calc(6*var(--u))] font-display text-[min(calc(17*var(--u)),15cqw)] leading-[0.9] text-melt">meltbook</h1>
      <p className="mt-[calc(2.5*var(--u))] text-[calc(4.4*var(--u))] font-semibold leading-snug">{book.subtitle[lang]}</p>
      <div className="relative mt-[calc(6*var(--u))] min-h-0 flex-1 overflow-hidden rounded-[calc(6*var(--u))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" className="absolute inset-0 size-full object-cover" />
        <span className="absolute bottom-[calc(3*var(--u))] left-[calc(3*var(--u))] rounded-full bg-cream px-[calc(3*var(--u))] py-[calc(1*var(--u))] text-[calc(2.8*var(--u))] font-bold">Chiang Rai · Thailand</span>
      </div>
    </div>
  );
}

function IntroPage({ p, lang, n }: { p: Intro; lang: Lang; n: number }) {
  return (
    <div className="flex h-full flex-col px-[calc(8*var(--u))] pb-[calc(10*var(--u))] pt-[calc(8*var(--u))]">
      <div className="relative h-[34%] min-h-0 shrink overflow-hidden rounded-[calc(6*var(--u))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
      <h2 className="mt-[calc(5*var(--u))] font-display text-[calc(8*var(--u))] leading-none text-melt">{p.heading[lang]}</h2>
      <div className="mt-[calc(3.5*var(--u))] flex flex-col gap-[calc(2.2*var(--u))] text-[calc(3.5*var(--u))] leading-relaxed">
        {p.body[lang].map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      <p className="mt-auto self-end font-display text-[calc(4.4*var(--u))] text-ink/80">— {p.signature}</p>
      <Folio n={n} />
    </div>
  );
}

function Scale({ label, v, hex }: { label: string; v: number; hex: string }) {
  return (
    <div className="flex items-center gap-[calc(2*var(--u))]">
      <span className="w-[calc(25*var(--u))] text-[calc(2.7*var(--u))] font-semibold text-ink/70">{label}</span>
      <span className="flex gap-[calc(1.1*var(--u))]" aria-label={`${label} ${v}/5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="size-[calc(2.3*var(--u))] rounded-full" style={{ background: i <= v ? hex : "#e7e4dd" }} />
        ))}
      </span>
    </div>
  );
}

function BeanPage({ p, lang, n }: { p: Bean; lang: Lang; n: number }) {
  const t = UI[lang];
  const tone = TONE[p.color];
  const rows: [string, string][] = [
    [t.roast, p.roast[lang]],
    [t.origin, p.origin[lang]],
    [t.process, p.process[lang]],
    ...(p.altitude ? ([[t.altitude, p.altitude]] as [string, string][]) : []),
  ];
  return (
    <div className="relative flex h-full flex-col px-[calc(7.5*var(--u))] pb-[calc(8.5*var(--u))] pt-[calc(6.5*var(--u))]">
      <div className="flex items-start justify-between gap-[calc(3*var(--u))]">
        <div className="min-w-0 pt-[calc(2*var(--u))]">
          <span className={`text-[calc(2.8*var(--u))] font-bold uppercase tracking-[0.2em] ${tone.text}`}>{p.roast.en}</span>
          <h2 className={`mt-[calc(1.2*var(--u))] text-balance font-display text-[calc(7*var(--u))] leading-[1.05] ${tone.text}`}>{p.name[lang]}</h2>
          {lang === "th" && <p className="mt-[calc(1*var(--u))] text-[calc(3*var(--u))] text-ink/55">{p.name.en}</p>}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.art} alt="" className="h-[calc(22*var(--u))] max-w-[calc(30*var(--u))] w-auto shrink-0 object-contain" />
      </div>

      <ul className="mt-[calc(3*var(--u))] flex flex-wrap gap-[calc(1.4*var(--u))]">
        {p.notes[lang].map((x) => (
          <li key={x} className={`rounded-full px-[calc(2.6*var(--u))] py-[calc(0.7*var(--u))] text-[calc(2.9*var(--u))] font-bold text-cream ${tone.bg}`}>
            {x}
          </li>
        ))}
      </ul>

      <div className="mt-[calc(3*var(--u))] grid grid-cols-[1fr_auto] items-center gap-[calc(4*var(--u))]">
        <dl className="m-0 flex flex-col">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-[calc(2*var(--u))] border-b border-dashed border-ink/20 py-[calc(1*var(--u))] text-[calc(2.9*var(--u))]">
              <dt className="text-ink/60">{k}</dt>
              <dd className="m-0 text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="relative size-[calc(20*var(--u))] overflow-hidden rounded-full border-[calc(0.8*var(--u))] border-cream shadow-[0_0_0_calc(0.5*var(--u))_var(--color-sand-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photo} alt="" className="absolute inset-0 size-full object-cover" />
        </div>
      </div>

      <div className="mt-[calc(3*var(--u))] flex flex-col gap-[calc(1.1*var(--u))]">
        <Scale label={t.acidity} v={p.scores.acidity} hex={tone.hex} />
        <Scale label={t.sweetness} v={p.scores.sweetness} hex={tone.hex} />
        <Scale label={t.body} v={p.scores.body} hex={tone.hex} />
      </div>

      <figure className="mt-auto rounded-[calc(5*var(--u))] bg-sand px-[calc(4.5*var(--u))] py-[calc(3*var(--u))]">
        <figcaption className="flex items-center justify-between">
          <span className={`font-display text-[calc(4.2*var(--u))] ${tone.text}`}>{t.review}</span>
          {p.review.mock && <MockBadge lang={lang} />}
        </figcaption>
        <blockquote className="m-0 mt-[calc(1*var(--u))] text-[calc(3.1*var(--u))] leading-normal">“{p.review[lang]}”</blockquote>
      </figure>
      <Folio n={n} />
    </div>
  );
}

function BarPage({ p, lang, n }: { p: Bar; lang: Lang; n: number }) {
  return (
    <div className="flex h-full flex-col px-[calc(8*var(--u))] pb-[calc(10*var(--u))] pt-[calc(8*var(--u))]">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[calc(9*var(--u))] leading-none text-melt">{p.heading[lang]}</h2>
        {p.mock && <MockBadge lang={lang} />}
      </div>
      <div className="relative mt-[calc(5*var(--u))] h-[42%] min-h-0 shrink overflow-hidden rounded-[calc(6*var(--u))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
      <ol className="m-0 mt-[calc(5*var(--u))] flex list-none flex-col gap-[calc(2.6*var(--u))] p-0">
        {p.steps[lang].map((s, i) => (
          <li key={s} className="flex items-center gap-[calc(3*var(--u))] text-[calc(3.8*var(--u))]">
            <span className="grid size-[calc(7*var(--u))] shrink-0 place-items-center rounded-full bg-melt font-display text-[calc(3.6*var(--u))] text-cream">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <Folio n={n} />
    </div>
  );
}

function BackPage({ p, lang }: { p: Back; lang: Lang }) {
  return (
    <div className="flex h-full flex-col bg-melt px-[calc(8*var(--u))] pb-[calc(9*var(--u))] pt-[calc(10*var(--u))] text-cream">
      <Logo className="h-[calc(16*var(--u))] w-auto self-start" color="#faf9f6" />
      <h2 className="mt-[calc(8*var(--u))] font-display text-[calc(10*var(--u))] leading-[0.95]">{p.heading[lang]}</h2>
      <p className="mt-[calc(5*var(--u))] text-[calc(3.8*var(--u))] leading-relaxed">{p.address[lang]}</p>
      <p className="mt-[calc(2*var(--u))] text-[calc(3.8*var(--u))] font-bold">{p.hours[lang]}</p>
      <ul className="mt-auto flex flex-wrap gap-[calc(2*var(--u))]">
        {p.links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-cream px-[calc(4*var(--u))] py-[calc(1.6*var(--u))] text-[calc(3.4*var(--u))] font-bold text-ink hover:text-melt">
              {l.label} ↗
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-[calc(5*var(--u))] text-[calc(2.6*var(--u))] text-cream/75">{book.mockNote[lang]}</p>
    </div>
  );
}

export function BookPage({ page, lang, n }: { page: Page; lang: Lang; n: number }) {
  return (
    <div className="h-full" style={{ ["--u" as string]: "max(1cqw, min(1.3cqw, 0.75cqh))" }}>
      <Sheet page={page} lang={lang} n={n} />
    </div>
  );
}

function Sheet({ page, lang, n }: { page: Page; lang: Lang; n: number }) {
  switch (page.kind) {
    case "cover":
      return <CoverPage p={page} lang={lang} />;
    case "intro":
      return <IntroPage p={page} lang={lang} n={n} />;
    case "bean":
      return <BeanPage p={page} lang={lang} n={n} />;
    case "bar":
      return <BarPage p={page} lang={lang} n={n} />;
    case "back":
      return <BackPage p={page} lang={lang} />;
  }
}

export const pageTitle = (p: Page, lang: Lang) =>
  p.kind === "cover" ? "meltbook" : p.kind === "back" ? p.heading[lang] : p.kind === "bean" ? p.name[lang] : p.heading[lang];
