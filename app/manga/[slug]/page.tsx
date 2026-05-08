import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText, Clock3, Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMangaDetail, getMangaStaticParams } from "@/lib/content";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getMangaStaticParams();
}

export default async function MangaDetailPage({ params }: Props) {
  const { slug } = await params;
  const manga = await getMangaDetail(slug);

  if (!manga) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-14 pt-6">
      <div className="mb-6 flex items-center justify-between border-b border-[#2f1c2b] pb-3">
        <h1 className="yaksha-logo text-2xl">YAKSHA</h1>
        <Link href="/login">
          <Button variant="outline" size="sm" className="h-8 rounded-full border-[#4a2736] bg-[#171221] px-4 text-zinc-200 font-medium">
            เข้าสู่ระบบ
          </Button>
        </Link>
      </div>
      <Link href="/" className="mb-4 inline-flex items-center text-sm text-zinc-300 hover:text-red-300">
        <ArrowLeft className="mr-2 h-4 w-4" />
        กลับหน้าแรก
      </Link>

      <section className="yaksha-panel overflow-hidden rounded-2xl border border-[#4a2736] p-4 md:p-5">
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="relative overflow-hidden rounded-xl border border-[#4a2736]">
            <Image src={manga.cover} alt={manga.title} width={500} height={760} className="aspect-[3/4] w-full object-cover" />
            <Badge className="absolute right-2 top-2">{manga.ep}</Badge>
            {manga.isNew && <Badge variant="secondary" className="absolute left-2 top-2">ใหม่</Badge>}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">{manga.title}</h1>
            <p className="mt-1 text-sm text-zinc-400">{manga.altTitle}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {manga.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[#4a2736] bg-[#1a1220] px-3 py-1 text-xs text-zinc-300">
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-300">{manga.desc}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="inline-flex items-center">
                <BookOpenText className="mr-1.5 h-3.5 w-3.5 text-red-400" />
                {manga.chapters.length} ตอน
              </span>
              <span className="inline-flex items-center">
                <Clock3 className="mr-1.5 h-3.5 w-3.5 text-red-400" />
                อัปเดตล่าสุด 2 ชั่วโมงก่อน
              </span>
              <span className="inline-flex items-center">
                <Flame className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                กำลังมาแรง
              </span>
            </div>

            <div className="mt-5">
              {manga.chapters.length > 0 ? (
                <Link href={`/manga/${manga.slug}/chapter/${manga.chapters[0].number}`}>
                  <Button className="bg-[#ff001e] text-white shadow-[0_0_16px_rgba(255,0,30,0.3)] hover:bg-[#ff1f39]">อ่านตอนล่าสุด</Button>
                </Link>
              ) : (
                <Button disabled className="cursor-not-allowed bg-zinc-700 text-zinc-400">
                  ยังไม่มีตอนให้อ่าน
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#4a2736] bg-[#130f1d]/92 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">รายชื่อตอน</h2>
        <div className="space-y-2">
          {manga.chapters.map((chapter) => (
            <Link
              key={chapter.number}
              href={`/manga/${manga.slug}/chapter/${chapter.number}`}
              className="flex items-center justify-between rounded-lg border border-[#4a2736] bg-[#1a1220]/90 px-3 py-2 text-sm text-zinc-200 transition hover:bg-[#2a1628]"
            >
              <span>{chapter.title}</span>
              <span className="text-xs text-zinc-400">{chapter.uploadedAt}</span>
            </Link>
          ))}
        </div>
      </section>

      {!!manga.detailImages?.length && (
        <section className="mt-5 rounded-2xl border border-[#4a2736] bg-[#130f1d]/92 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">ภาพรายละเอียดเรื่อง</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {manga.detailImages.map((imageUrl: string, idx: number) => (
              <div key={`${imageUrl}-${idx}`} className="overflow-hidden rounded-xl border border-[#4a2736]">
                <Image
                  src={imageUrl}
                  alt={`${manga.title} detail ${idx + 1}`}
                  width={1200}
                  height={700}
                  className="h-auto w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}
      <footer className="mt-8 border-t border-[#2f1c2b] pt-5 text-center text-xs font-light text-zinc-500">© Yaksha ยักษาแปร</footer>
    </main>
  );
}
