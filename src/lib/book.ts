import { VOLUMES } from "../../content/books";

export type Lang = "th" | "en";
export type T = Record<Lang, string>;
export type Tone = "melt" | "sky" | "ink";

export type Cover = { kind: "cover"; art: string; kicker: T };
export type Intro = { kind: "intro"; image: string; heading: T; body: Record<Lang, string[]>; signature: string };
export type Bean = {
  kind: "bean";
  id: string;
  color: Tone;
  art: string;
  photo: string;
  name: T;
  roast: T;
  origin: T;
  process: T;
  altitude: string | null;
  notes: Record<Lang, string[]>;
  scores: { acidity: number; sweetness: number; body: number };
  review: T & { mock: boolean };
};
export type Bar = { kind: "bar"; image: string; heading: T; steps: Record<Lang, string[]>; mock: boolean };
export type Back = { kind: "back"; heading: T; address: T; hours: T; links: { label: string; href: string }[]; social?: { name: "Instagram" | "Facebook" | "TikTok"; href: string }[] };
export type Page = Cover | Intro | Bean | Bar | Back;

/** One volume of meltbook (content/books/<slug>.json). */
export type Book = { slug: string; volume: number; color: Tone; coverArt: string; title: T; series: T; subtitle: T; author: string; mockNote: T; pages: Page[] };

export const BOOKS = (VOLUMES as unknown as Book[]).toSorted((a, b) => a.volume - b.volume);
export const getBook = (slug: string) => BOOKS.find((b) => b.slug === slug);

export const TONE: Record<Tone, { text: string; bg: string; hex: string }> = {
  melt: { text: "text-melt", bg: "bg-melt", hex: "#f21f04" },
  sky: { text: "text-sky", bg: "bg-sky", hex: "#2296d2" },
  ink: { text: "text-ink", bg: "bg-ink", hex: "#402722" },
};

export const UI = {
  th: { prev: "ก่อนหน้า", next: "ถัดไป", page: "หน้า", roast: "ระดับคั่ว", origin: "แหล่งปลูก", process: "โพรเซส", altitude: "ความสูง", notes: "โน้ตรสชาติ", review: "Dream ว่า", acidity: "ความเปรี้ยว", sweetness: "ความหวาน", body: "บอดี้", mock: "ตัวอย่าง", epub: "ดาวน์โหลด EPUB", contents: "สารบัญ", shelf: "ชั้นหนังสือ", read: "เปิดอ่าน", pages: "{n} หน้า", vol: "เล่ม {n}", shelfLead: "หนังสือเล่มเล็กจาก Melt.cei ร้านกาแฟที่เกือบเรียกได้ว่า specialty ในเชียงราย" },
  en: { prev: "Previous", next: "Next", page: "Page", roast: "Roast", origin: "Origin", process: "Process", altitude: "Altitude", notes: "Tasting notes", review: "Dream says", acidity: "Acidity", sweetness: "Sweetness", body: "Body", mock: "Sample", epub: "Download EPUB", contents: "Contents", shelf: "Bookshelf", read: "Read", pages: "{n} pages", vol: "Vol. {n}", shelfLead: "Little books from Melt.cei, an almost-specialty coffee shop in Chiang Rai" },
} satisfies Record<Lang, Record<string, string>>;

export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
