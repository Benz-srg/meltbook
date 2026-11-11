import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Itim, Mali } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-bagel", display: "swap" });
const glacial = localFont({
  src: [
    { path: "./fonts/glacial-indifference-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/glacial-indifference-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-glacial",
  display: "swap",
});
const itim = Itim({ weight: "400", subsets: ["thai", "latin"], variable: "--font-itim", display: "swap" });
const mali = Mali({ weight: ["400", "600"], subsets: ["thai", "latin"], variable: "--font-mali", display: "swap" });

export const metadata: Metadata = {
  title: "meltbook · เมล็ดกาแฟที่ Melt.cei เคยชง",
  description: "An e-book of the beans Melt.cei in Chiang Rai has brewed, with tasting notes from barista Dream. Thai and English.",
};

export const viewport: Viewport = { themeColor: "#faf9f6" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${bagel.variable} ${glacial.variable} ${itim.variable} ${mali.variable}`}>
      <body className="bg-cream font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
