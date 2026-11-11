import Link from "next/link";
import { Logo } from "@/components/Logo";

/* A page that isn't in the book: Melt-style, with the way back to the shelf. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-cream px-6 text-center">
      <Logo className="h-14 w-auto" />
      <h1 className="font-display text-5xl text-melt">ไม่เจอหน้านี้</h1>
      <p className="max-w-sm text-lg text-ink/70">หน้านี้อาจถูกย้ายไปเล่มอื่นแล้ว · This page isn&apos;t in the book.</p>
      <Link href="/" className="rounded-full bg-melt px-6 py-3 font-bold text-cream hover:bg-ink">
        กลับไปชั้นหนังสือ · Bookshelf
      </Link>
    </main>
  );
}
