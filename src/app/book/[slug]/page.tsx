import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { BOOKS, getBook } from "@/lib/book";

export const generateStaticParams = () => BOOKS.map((b) => ({ slug: b.slug }));

export async function generateMetadata({ params }: PageProps<"/book/[slug]">): Promise<Metadata> {
  const book = getBook((await params).slug);
  if (!book) return {};
  return {
    title: `${book.title.th} · ${book.series.th}`,
    description: `${book.series.en}: ${book.subtitle.en}. An e-book from Melt.cei, Chiang Rai.`,
    openGraph: { title: `${book.title.en} · ${book.series.en}`, images: [`/covers/${book.slug}.png`] },
  };
}

export default async function BookPage({ params }: PageProps<"/book/[slug]">) {
  const book = getBook((await params).slug);
  if (!book) notFound();
  return <Reader book={book} />;
}
