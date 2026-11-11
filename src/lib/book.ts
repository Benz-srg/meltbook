import data from "../../content/book.json";

export type Lang = "th" | "en";
export type T = Record<Lang, string>;
export type Tone = "melt" | "sky" | "ink";

export type Cover = { kind: "cover"; image: string; kicker: T };
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
export type Back = { kind: "back"; heading: T; address: T; hours: T; links: { label: string; href: string }[] };
export type Page = Cover | Intro | Bean | Bar | Back;

export const book = data as unknown as { title: T; subtitle: T; author: string; mockNote: T; pages: Page[] };

export const TONE: Record<Tone, { text: string; bg: string; hex: string }> = {
  melt: { text: "text-melt", bg: "bg-melt", hex: "#f21f04" },
  sky: { text: "text-sky", bg: "bg-sky", hex: "#2296d2" },
  ink: { text: "text-ink", bg: "bg-ink", hex: "#402722" },
};

export const UI = {
  th: { prev: "ก่อนหน้า", next: "ถัดไป", page: "หน้า", roast: "ระดับคั่ว", origin: "แหล่งปลูก", process: "โพรเซส", altitude: "ความสูง", notes: "โน้ตรสชาติ", review: "Dream ว่า", acidity: "ความเปรี้ยว", sweetness: "ความหวาน", body: "บอดี้", mock: "ตัวอย่าง", epub: "ดาวน์โหลด EPUB", contents: "สารบัญ" },
  en: { prev: "Previous", next: "Next", page: "Page", roast: "Roast", origin: "Origin", process: "Process", altitude: "Altitude", notes: "Tasting notes", review: "Dream says", acidity: "Acidity", sweetness: "Sweetness", body: "Body", mock: "Sample", epub: "Download EPUB", contents: "Contents" },
} satisfies Record<Lang, Record<string, string>>;
