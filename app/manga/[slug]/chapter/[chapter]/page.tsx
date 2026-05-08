import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getChapterReader, getMangaStaticParams } from "@/lib/content";

type Props = {
  params: Promise<{ slug: string; chapter: string }>;
};

export async function generateStaticParams() {
  const slugs = await getMangaStaticParams();
  return slugs.map((item) => ({ slug: item.slug, chapter: "1" }));
}

export default async function ChapterReaderPage({ params }: Props) {
  const { slug, chapter } = await params;
  const chapterNo = Number(chapter);
  const reader = await getChapterReader(slug, chapterNo);
  if (!reader) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-3 pb-16 pt-5">
      <div className="mb-4 flex items-center justify-between border-b border-[#2f1c2b] pb-3">
        <h1 className="yaksha-logo text-xl">YAKSHA</h1>
        <Link href="/login">
          <Button variant="outline" size="sm" className="h-8 rounded-full border-[#4a2736] bg-[#171221] px-4 text-zinc-200 font-medium">
            เข้าสู่ระบบ
          </Button>
        </Link>
      </div>
      <div className="mb-4 rounded-xl border border-[#4a2736] bg-[#140f1e]/95 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{reader.manga.title}</p>
            <p className="text-xs text-zinc-400">{reader.chapter.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/manga/${reader.manga.slug}`}>
              <Button variant="ghost" size="sm" className="border border-[#4a2736] bg-[#1a1220] text-zinc-300">
                <ArrowLeft className="mr-1 h-4 w-4" />
                รายละเอียด
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="border border-[#4a2736] bg-[#1a1220] text-zinc-300">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {reader.prev ? (
            <Link href={`/manga/${reader.manga.slug}/chapter/${reader.prev.number}`}>
              <Button variant="outline" size="sm" className="text-zinc-200">
                <ChevronLeft className="mr-1 h-4 w-4" />
                ตอนก่อนหน้า
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="text-zinc-500" disabled>
              <ChevronLeft className="mr-1 h-4 w-4" />
              ตอนก่อนหน้า
            </Button>
          )}

          {reader.next ? (
            <Link href={`/manga/${reader.manga.slug}/chapter/${reader.next.number}`}>
              <Button variant="outline" size="sm" className="text-zinc-200">
                ตอนถัดไป
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="text-zinc-500" disabled>
              ตอนถัดไป
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <section className="space-y-3">
        {reader.chapter.pages.map((src, index) => (
          <div key={src + index} className="overflow-hidden rounded-lg border border-[#4a2736] bg-black/40">
            <Image src={src} alt={`${reader.manga.title} ${reader.chapter.title} หน้า ${index + 1}`} width={900} height={1400} className="h-auto w-full object-cover" />
          </div>
        ))}
      </section>
      <footer className="mt-7 border-t border-[#2f1c2b] pt-4 text-center text-xs font-light text-zinc-500">© Yaksha ยักษาแปร</footer>
    </main>
  );
}
