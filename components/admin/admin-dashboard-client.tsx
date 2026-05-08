"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CloudUpload,
  FileImage,
  GripVertical,
  ImagePlus,
  LogOut,
  Plus,
  Trash2,
  Type,
  Upload,
  X
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_SITE_COPY, parseSiteCopyRows, SITE_SETTING_ROW_KEYS, type SiteCopy } from "@/lib/site-copy";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=200&q=80";

const TAG_STYLES = [
  "border-emerald-700/50 bg-emerald-950/50 text-emerald-100",
  "border-sky-700/50 bg-sky-950/50 text-sky-100",
  "border-amber-700/50 bg-amber-950/50 text-amber-100",
  "border-violet-700/50 bg-violet-950/50 text-violet-100",
  "border-rose-700/50 bg-rose-950/50 text-rose-100",
  "border-cyan-700/50 bg-cyan-950/50 text-cyan-100"
];

function tagStyle(i: number) {
  return TAG_STYLES[i % TAG_STYLES.length];
}

type MangaRow = {
  id: string;
  title: string;
  slug: string;
  alt_title: string | null;
  cover_url: string | null;
  categories: string[];
  chapter_count: number;
};

type ChapterRow = {
  id: string;
  chapter_number: number;
  title: string;
  created_at: string;
};

const mangaSchema = z.object({
  title: z.string().min(2, "ชื่อเรื่องอย่างน้อย 2 ตัวอักษร"),
  slug: z.string().min(2, "Slug อย่างน้อย 2 ตัวอักษร"),
  altTitle: z.string().optional(),
  description: z.string().min(5, "เรื่องย่อ / แนะนำ อย่างน้อย 5 ตัวอักษร"),
  categoriesRaw: z.string().min(1, "กรอกหมวดหมู่ (คั่นด้วยจุลภาค)")
});

const chapterSchema = z.object({
  mangaId: z.string().uuid("เลือกการ์ตูนก่อน"),
  chapterNumber: z.coerce.number().positive("เลขตอนต้องมากกว่า 0"),
  title: z.string().min(1, "กรอกชื่อตอน")
});

const siteCopySchema = z.object({
  homeBrandTitle: z.string().min(1, "กรอกชื่อแบรนด์บนเว็บ").max(120),
  homeTaglinePrimary: z.string().max(200),
  homeTaglineSecondary: z.string().max(400),
  footerDisclaimer: z.string().max(2000),
  footerCopyright: z.string().max(400)
});

const IMG_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const MAX_CHAPTER_FILES = 100;
const MAX_COVER_MB = 8;
const MAX_PAGE_MB = 20;

function sortImageFiles(files: File[]) {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

function filterImageFiles(list: File[], maxBytes: number) {
  const ok: File[] = [];
  const bad: string[] = [];
  for (const f of list) {
    const t = f.type.toLowerCase();
    const isImg =
      t === "image/jpeg" || t === "image/png" || t === "image/webp" || /\.(jpe?g|png|webp)$/i.test(f.name);
    if (!isImg) {
      bad.push(`${f.name} (ชนิดไฟล์ไม่รองรับ)`);
      continue;
    }
    if (f.size > maxBytes) {
      bad.push(`${f.name} (ใหญ่เกิน ${Math.round(maxBytes / 1048576)} MB)`);
      continue;
    }
    ok.push(f);
  }
  return { ok, bad };
}

function suggestSlug(title: string) {
  const s = title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length >= 2 ? s : "";
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"manga" | "episodes" | "site">("manga");
  const [mangaList, setMangaList] = useState<MangaRow[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverDrag, setCoverDrag] = useState(false);
  const [detailImageFiles, setDetailImageFiles] = useState<File[]>([]);
  const [detailDrag, setDetailDrag] = useState(false);

  const [chapterFiles, setChapterFiles] = useState<File[]>([]);
  const [chapterDrag, setChapterDrag] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);

  const [mangaForm, setMangaForm] = useState({
    title: "",
    slug: "",
    altTitle: "",
    description: "",
    categoriesRaw: "มังฮวา, แฟนตาซี"
  });
  const [chapterForm, setChapterForm] = useState({
    mangaId: "",
    chapterNumber: 1,
    title: "ตอนที่ 1"
  });
  const [siteCopyForm, setSiteCopyForm] = useState<SiteCopy>({ ...DEFAULT_SITE_COPY });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const selectedManga = mangaList.find((m) => m.id === chapterForm.mangaId);
  const selectedMangaTitle = selectedManga?.title ?? "";

  const loadManga = useCallback(async () => {
    if (!supabase) return;
    const { data: rows, error } = await supabase
      .from("manga")
      .select("id,title,slug,alt_title,cover_url,categories")
      .order("created_at", { ascending: false });
    if (error || !rows) return;

    const { data: chRows } = await supabase.from("chapters").select("manga_id");
    const counts = new Map<string, number>();
    for (const r of chRows ?? []) {
      const id = (r as { manga_id: string }).manga_id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    setMangaList(
      rows.map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        alt_title: m.alt_title,
        cover_url: m.cover_url,
        categories: Array.isArray(m.categories) ? m.categories : [],
        chapter_count: counts.get(m.id) ?? 0
      }))
    );
  }, [supabase]);

  const loadChapters = useCallback(
    async (mangaId: string) => {
      if (!supabase || !mangaId) {
        setChapters([]);
        return;
      }
      setChaptersLoading(true);
      const { data, error } = await supabase
        .from("chapters")
        .select("id,chapter_number,title,created_at")
        .eq("manga_id", mangaId)
        .order("chapter_number", { ascending: false });
      setChaptersLoading(false);
      if (error) {
        setStatus(error.message);
        setChapters([]);
        return;
      }
      setChapters((data ?? []) as ChapterRow[]);
    },
    [supabase]
  );

  const loadSiteSettings = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("site_settings").select("key,value");
    if (error) {
      setStatusLine(error.message);
      return;
    }
    setSiteCopyForm(parseSiteCopyRows(data as { key: string; value: string }[]));
  }, [supabase]);

  useEffect(() => {
    void loadManga();
  }, [loadManga]);

  useEffect(() => {
    if (activeTab === "episodes" && chapterForm.mangaId) void loadChapters(chapterForm.mangaId);
  }, [activeTab, chapterForm.mangaId, loadChapters]);

  useEffect(() => {
    if (activeTab === "site") void loadSiteSettings();
  }, [activeTab, loadSiteSettings]);

  function setStatusLine(msg: string) {
    setStatus(msg);
    if (msg && !msg.startsWith("กำลัง")) window.setTimeout(() => setStatus(""), 8000);
  }

  function onCoverFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const { ok, bad } = filterImageFiles(arr, MAX_COVER_MB * 1048576);
    if (bad.length) setStatusLine(`ข้ามไฟล์: ${bad.join("; ")}`);
    if (ok[0]) setCoverFile(ok[0]);
  }

  function onDetailFiles(files: FileList | File[], replace = false) {
    const arr = sortImageFiles(Array.from(files));
    const { ok, bad } = filterImageFiles(arr, MAX_PAGE_MB * 1048576);
    if (bad.length) setStatusLine(`ข้ามไฟล์: ${bad.join("; ")}`);
    setDetailImageFiles((prev) => {
      const merged = replace ? ok : [...prev, ...ok];
      return merged.slice(0, 50);
    });
  }

  function onChapterFiles(files: FileList | File[], replace = false) {
    const arr = sortImageFiles(Array.from(files));
    const { ok, bad } = filterImageFiles(arr, MAX_PAGE_MB * 1048576);
    if (bad.length) setStatusLine(`ข้ามไฟล์: ${bad.join("; ")}`);
    setChapterFiles((prev) => {
      const merged = replace ? ok : [...prev, ...ok];
      return merged.slice(0, MAX_CHAPTER_FILES);
    });
  }

  async function onCreateManga(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatusLine("ยังไม่ได้ตั้งค่า Supabase ใน .env.local");
      return;
    }
    setStatusLine("กำลังบันทึกเรื่องและอัปโหลดรูป…");

    const parsed = mangaSchema.safeParse(mangaForm);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" · ");
      setStatusLine(msg || "กรอกข้อมูลไม่ครบ");
      return;
    }

    let coverUrl: string | null = null;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop() ?? "jpg";
      const filePath = `${parsed.data.slug}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("covers").upload(filePath, coverFile, { upsert: true });
      if (uploadErr) {
        setStatusLine(uploadErr.message);
        return;
      }
      const { data: publicData } = supabase.storage.from("covers").getPublicUrl(filePath);
      coverUrl = publicData.publicUrl;
    }

    const categories = parsed.data.categoriesRaw.split(",").map((x) => x.trim()).filter(Boolean);
    const { data: mangaRow, error } = await supabase
      .from("manga")
      .insert({
        title: parsed.data.title,
        slug: parsed.data.slug,
        alt_title: parsed.data.altTitle || null,
        description: parsed.data.description,
        categories,
        cover_url: coverUrl
      })
      .select("id")
      .single();

    if (error || !mangaRow) {
      setStatusLine(error?.message ?? "บันทึกไม่สำเร็จ");
      return;
    }

    if (detailImageFiles.length) {
      const detailPayload: { manga_id: string; sort_order: number; image_url: string }[] = [];
      for (let i = 0; i < detailImageFiles.length; i += 1) {
        const file = detailImageFiles[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const filePath = `${parsed.data.slug}/${String(i + 1).padStart(3, "0")}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("manga-details").upload(filePath, file, { upsert: true });
        if (uploadErr) {
          setStatusLine(uploadErr.message);
          return;
        }
        const { data: publicData } = supabase.storage.from("manga-details").getPublicUrl(filePath);
        detailPayload.push({
          manga_id: mangaRow.id,
          sort_order: i + 1,
          image_url: publicData.publicUrl
        });
      }
      const { error: detailErr } = await supabase.from("manga_detail_images").insert(detailPayload);
      if (detailErr) {
        setStatusLine(detailErr.message);
        return;
      }
    }

    setStatusLine("บันทึกเรื่องและรูปบน Supabase สำเร็จ");
    setMangaForm({ title: "", slug: "", altTitle: "", description: "", categoriesRaw: "มังฮวา, แฟนตาซี" });
    setCoverFile(null);
    setDetailImageFiles([]);
    void loadManga();
  }

  async function onCreateChapter(e?: React.FormEvent) {
    e?.preventDefault();
    if (!supabase) {
      setStatusLine("ยังไม่ได้ตั้งค่า Supabase ใน .env.local");
      return;
    }
    setStatusLine("กำลังสร้างตอนและอัปโหลดภาพไป Supabase…");

    const parsed = chapterSchema.safeParse(chapterForm);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" · ");
      setStatusLine(msg || "กรอกข้อมูลตอนไม่ครบ");
      return;
    }
    if (!chapterFiles.length) {
      setStatusLine("เลือกภาพหน้าตอนอย่างน้อย 1 ไฟล์");
      return;
    }

    const { data: chapterRow, error: chapterErr } = await supabase
      .from("chapters")
      .insert({
        manga_id: parsed.data.mangaId,
        chapter_number: parsed.data.chapterNumber,
        title: parsed.data.title
      })
      .select("id")
      .single();

    if (chapterErr || !chapterRow) {
      setStatusLine(chapterErr?.message ?? "สร้างตอนไม่สำเร็จ");
      return;
    }

    const pagesPayload: { chapter_id: string; page_number: number; image_url: string }[] = [];
    for (let i = 0; i < chapterFiles.length; i += 1) {
      const file = chapterFiles[i];
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${parsed.data.mangaId}/${chapterRow.id}/${String(i + 1).padStart(3, "0")}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chapters").upload(path, file, { upsert: true });
      if (uploadErr) {
        setStatusLine(uploadErr.message);
        return;
      }
      const { data: publicData } = supabase.storage.from("chapters").getPublicUrl(path);
      pagesPayload.push({
        chapter_id: chapterRow.id,
        page_number: i + 1,
        image_url: publicData.publicUrl
      });
    }

    const { error: pagesError } = await supabase.from("chapter_pages").insert(pagesPayload);
    if (pagesError) {
      setStatusLine(pagesError.message);
      return;
    }

    setStatusLine(`อัปโหลด ${chapterFiles.length} หน้าไป bucket chapters สำเร็จ`);
    setChapterFiles([]);
    setShowChapterModal(false);
    const prevMax = chapters.length ? Math.max(...chapters.map((c) => Number(c.chapter_number))) : 0;
    const nextNum = Math.max(prevMax, parsed.data.chapterNumber) + 1;
    setChapterForm((p) => ({
      ...p,
      chapterNumber: nextNum,
      title: `ตอนที่ ${nextNum}`
    }));
    void loadChapters(parsed.data.mangaId);
    void loadManga();
  }

  async function onLogout() {
    if (!supabase) {
      await fetch("/api/admin/local-logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
      return;
    }
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  async function onSaveSiteCopy(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatusLine("ยังไม่ได้ตั้งค่า Supabase ใน .env.local");
      return;
    }
    const parsed = siteCopySchema.safeParse(siteCopyForm);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" · ");
      setStatusLine(msg || "กรอกข้อมูลไม่ถูกต้อง");
      return;
    }
    setStatusLine("กำลังบันทึกข้อความ…");
    const d = parsed.data;
    const rows = [
      { key: SITE_SETTING_ROW_KEYS.homeBrandTitle, value: d.homeBrandTitle.trim() },
      { key: SITE_SETTING_ROW_KEYS.homeTaglinePrimary, value: d.homeTaglinePrimary.trim() },
      { key: SITE_SETTING_ROW_KEYS.homeTaglineSecondary, value: d.homeTaglineSecondary.trim() },
      { key: SITE_SETTING_ROW_KEYS.footerDisclaimer, value: d.footerDisclaimer.trim() },
      { key: SITE_SETTING_ROW_KEYS.footerCopyright, value: d.footerCopyright.trim() }
    ];
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    if (error) {
      setStatusLine(error.message);
      return;
    }
    setStatusLine("บันทึกข้อความหน้าเว็บสำเร็จ — รีเฟรชหน้าแรกเพื่อดูผล");
  }

  const nextChapterNumber = useMemo(() => {
    if (!chapters.length) return chapterForm.chapterNumber || 1;
    return Math.max(...chapters.map((c) => Number(c.chapter_number))) + 1;
  }, [chapters, chapterForm.chapterNumber]);

  return (
    <div className="min-h-screen bg-[#070611] text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 16% 18%, rgba(36, 46, 132, 0.14), transparent 34%), radial-gradient(circle at 86% 14%, rgba(196, 10, 44, 0.22), transparent 31%), linear-gradient(180deg, #05060f 0%, #070714 46%, #070611 100%)"
        }}
      />
      <main className="relative mx-auto w-full max-w-5xl px-4 pb-20 pt-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#2f1c2b] pb-4">
          <div>
            <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
              <span>แดชบอร์ด</span>
              <ChevronRight className="h-3 w-3 text-zinc-600" />
              <span className="font-medium text-red-400">จัดการการ์ตูน</span>
            </nav>
            <h1 className="yaksha-logo text-2xl tracking-wide">YAKSHA</h1>
            <p className="mt-0.5 text-sm font-medium text-zinc-200">อัปโหลดเนื้อหา</p>
            <p className="mt-1 text-xs text-zinc-500">
              รูปทั้งหมดเก็บใน Supabase Storage (covers / manga-details / chapters)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onLogout()}
            className="rounded-full border-[#4a2736] bg-[#171221] text-zinc-200 hover:bg-[#2a1628]"
          >
            <LogOut className="mr-2 h-4 w-4" />
            ออกจากระบบ
          </Button>
        </header>

        <div className="mb-6 flex gap-1 rounded-xl border border-[#4a2736] bg-[#130f1d]/95 p-1">
          {(
            [
              { id: "manga" as const, label: "เพิ่มการ์ตูนใหม่" },
              { id: "episodes" as const, label: "รายชื่อตอน & อัปโหลดตอน" },
              { id: "site" as const, label: "ข้อความหน้าเว็བ", icon: Type }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:px-4",
                activeTab === t.id
                  ? "bg-[#ff001e] text-white shadow-[0_0_16px_rgba(255,0,30,0.25)]"
                  : "text-zinc-400 hover:bg-[#1f1524] hover:text-zinc-200"
              )}
            >
              {"icon" in t ? <t.icon className="h-4 w-4 shrink-0 opacity-90" /> : null}
              <span className="text-center leading-tight">{t.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "manga" && (
          <form onSubmit={onCreateManga} className="space-y-6">
            <section className="yaksha-panel rounded-2xl border border-[#4a2736] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">ข้อมูลเรื่อง</h2>
              <div className="grid gap-6 lg:grid-cols-[minmax(200px,260px)_1fr]">
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-300">รูปปก</p>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("cover-input")?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setCoverDrag(true);
                    }}
                    onDragLeave={() => setCoverDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setCoverDrag(false);
                      if (e.dataTransfer.files?.length) onCoverFiles(e.dataTransfer.files);
                    }}
                    onClick={() => document.getElementById("cover-input")?.click()}
                    className={cn(
                      "flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-8 text-center transition",
                      coverDrag
                        ? "border-red-500 bg-[#2a1628]"
                        : "border-[#4a2736] bg-[#1a1220]/80 hover:border-red-500/60 hover:bg-[#1f1524]"
                    )}
                  >
                    <CloudUpload className="mb-3 h-10 w-10 text-red-400" />
                    <span className="text-sm font-medium text-zinc-200">อัปโหลดรูปปก</span>
                    <span className="mt-1 text-[11px] text-zinc-500">
                      .jpg .jpeg .png .webp · สูงสุด ~{MAX_COVER_MB} MB
                    </span>
                    {coverFile && (
                      <span className="mt-3 max-w-full truncate rounded-md border border-[#4a2736] bg-[#130f1d] px-2 py-1 text-xs text-red-200">
                        {coverFile.name}
                      </span>
                    )}
                  </div>
                  <input
                    id="cover-input"
                    type="file"
                    accept={IMG_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onCoverFiles([f]);
                      e.target.value = "";
                    }}
                  />
                  {coverFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverFile(null);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-[#4a2736] bg-[#1a1220] py-1.5 text-xs text-red-300 hover:bg-[#2a1628]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      ลบรูปปก
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-300">ชื่อเรื่อง *</label>
                    <Input
                      value={mangaForm.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setMangaForm((p) => {
                          const slugHint = suggestSlug(title);
                          return {
                            ...p,
                            title,
                            slug: p.slug && suggestSlug(p.title) !== p.slug ? p.slug : slugHint || p.slug
                          };
                        });
                      }}
                      className="rounded-xl"
                      placeholder="ชื่อที่แสดงบนเว็บ"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-300">Slug (URL) *</label>
                    <Input
                      value={mangaForm.slug}
                      onChange={(e) => setMangaForm((p) => ({ ...p, slug: e.target.value }))}
                      className="rounded-xl"
                      placeholder="solo-leveling"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-300">ชื่อรอง / ต้นฉบับ</label>
                    <Input
                      value={mangaForm.altTitle}
                      onChange={(e) => setMangaForm((p) => ({ ...p, altTitle: e.target.value }))}
                      className="rounded-xl"
                      placeholder="ไม่บังคับ"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-300">หมวด (คั่นด้วยจุลภาค)</label>
                    <Input
                      value={mangaForm.categoriesRaw}
                      onChange={(e) => setMangaForm((p) => ({ ...p, categoriesRaw: e.target.value }))}
                      className="rounded-xl"
                      placeholder="มังฮวา, แฟนตาซี"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-300">เรื่องย่อ / แนะนำ *</label>
                    <p className="mb-1 text-[11px] text-zinc-500">อย่างน้อย 5 ตัวอักษร</p>
                    <textarea
                      value={mangaForm.description}
                      onChange={(e) => setMangaForm((p) => ({ ...p, description: e.target.value }))}
                      rows={6}
                      className="w-full resize-y rounded-xl border border-[#5c3a4a] bg-[#120e18] p-3 text-sm font-medium text-white caret-white shadow-inner placeholder:text-zinc-300 placeholder:opacity-100 outline-none focus:ring-2 focus:ring-[#ff001e]/90 [color-scheme:dark]"
                      placeholder="พิมพ์เรื่องย่อ..."
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="yaksha-panel rounded-2xl border border-[#4a2736] p-5">
              <h2 className="mb-2 text-sm font-semibold text-white">ภาพรายละเอียดเรื่อง (ถ้ามี)</h2>
              <p className="mb-3 text-xs text-zinc-500">อัปโหลดหลายไฟล์ได้ — เก็บใน bucket manga-details</p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDetailDrag(true);
                }}
                onDragLeave={() => setDetailDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDetailDrag(false);
                  if (e.dataTransfer.files?.length) onDetailFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
                  detailDrag ? "border-red-500 bg-[#2a1628]" : "border-[#4a2736] bg-[#1a1220]/60 hover:border-red-500/50 hover:bg-[#1f1524]"
                )}
              >
                <label className="inline-flex cursor-pointer flex-col items-center gap-2">
                  <ImagePlus className="h-8 w-8 text-red-400" />
                  <span className="text-sm text-zinc-200">คลิกหรือลากไฟล์มาวางที่นี่</span>
                  <input
                    type="file"
                    accept={IMG_ACCEPT}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) onDetailFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="mt-2 text-[11px] text-zinc-500">เลือกแล้ว {detailImageFiles.length} ไฟล์</p>
                {detailImageFiles.length > 0 && (
                  <ul className="mx-auto mt-3 max-h-28 max-w-md space-y-1 overflow-y-auto text-left text-xs text-zinc-300">
                    {detailImageFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 truncate">
                        <FileImage className="h-3.5 w-3.5 shrink-0 text-red-400" />
                        <span className="truncate">{f.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {detailImageFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDetailImageFiles([])}
                    className="mt-3 text-xs text-red-300 hover:text-red-200 hover:underline"
                  >
                    ล้างรายการภาพ
                  </button>
                )}
              </div>
            </section>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="rounded-full bg-[#ff001e] px-8 text-white shadow-[0_0_16px_rgba(255,0,30,0.25)] hover:bg-[#ff1f39]"
              >
                <Upload className="mr-2 h-4 w-4" />
                บันทึกเรื่อง & อัปโหลดรูป
              </Button>
            </div>
          </form>
        )}

        {activeTab === "episodes" && (
          <div className="space-y-6">
            <section className="yaksha-panel rounded-2xl border border-[#4a2736] p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">เลือกเรื่อง</h2>
                  <p className="text-xs text-zinc-500">คลิกแถวเพื่อเลือก แล้วอัปโหลดตอนด้านล่าง — ไม่ใช้เมนูแบบเลื่อน</p>
                </div>
                {selectedManga && (
                  <span className="rounded-full border border-red-500/40 bg-red-950/40 px-3 py-1 text-xs text-red-200">
                    เลือกอยู่: {selectedManga.title}
                  </span>
                )}
              </div>

              <div className="max-h-[min(520px,55vh)] overflow-auto rounded-xl border border-[#2f1c2b]">
                {mangaList.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-zinc-500">
                    ยังไม่มีเรื่อง — ไปแท็บ &quot;เพิ่มการ์ตูนใหม่&quot; เพื่อสร้างก่อน
                  </p>
                ) : (
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-[#2f1c2b] bg-[#120d18] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2.5 sm:px-4">ชื่อเรื่อง</th>
                        <th className="hidden w-[100px] px-2 py-2.5 sm:table-cell">จำนวนตอน</th>
                        <th className="hidden w-[88px] px-2 py-2.5 md:table-cell">สถานะ</th>
                        <th className="w-[72px] px-2 py-2.5 text-center">เลือก</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mangaList.map((m) => {
                        const selected = chapterForm.mangaId === m.id;
                        return (
                          <tr
                            key={m.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setChapterForm((p) => ({ ...p, mangaId: m.id }));
                              void loadChapters(m.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setChapterForm((p) => ({ ...p, mangaId: m.id }));
                                void loadChapters(m.id);
                              }
                            }}
                            className={cn(
                              "cursor-pointer border-b border-[#2f1c2b] transition-colors last:border-b-0",
                              selected ? "bg-[#2a1628]/90 ring-1 ring-inset ring-red-500/50" : "hover:bg-[#1a1220]/60"
                            )}
                          >
                            <td className="px-2 py-3 sm:px-4">
                              <div className="flex gap-3">
                                <div className="relative h-[76px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-[#4a2736] bg-black/40">
                                  <Image
                                    src={m.cover_url || FALLBACK_COVER}
                                    alt={m.title}
                                    fill
                                    className="object-cover"
                                    sizes="54px"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-semibold text-zinc-100">{m.title}</p>
                                  {m.alt_title ? (
                                    <p className="truncate text-xs text-zinc-500">{m.alt_title}</p>
                                  ) : (
                                    <p className="truncate text-xs text-zinc-600">/{m.slug}</p>
                                  )}
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {(m.categories ?? []).slice(0, 8).map((tag, i) => (
                                      <span
                                        key={`${m.id}-${tag}-${i}`}
                                        className={cn(
                                          "rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
                                          tagStyle(i)
                                        )}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="mt-1 text-xs text-zinc-500 sm:hidden">{m.chapter_count} ตอน</p>
                                </div>
                              </div>
                            </td>
                            <td className="hidden align-middle text-zinc-300 sm:table-cell">
                              <span className="font-medium text-zinc-200">{m.chapter_count}</span>
                              <span className="text-zinc-500"> ตอน</span>
                            </td>
                            <td className="hidden align-middle md:table-cell">
                              <span className="inline-flex rounded-full border border-emerald-800/60 bg-emerald-950/50 px-2 py-1 text-[10px] font-medium text-emerald-200">
                                เผยแพร่
                              </span>
                            </td>
                            <td className="align-middle text-center">
                              {selected ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff001e] text-sm font-bold text-white shadow-[0_0_12px_rgba(255,0,30,0.35)]">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#4a2736] bg-[#1a1220] text-xs text-zinc-500">
                                  +
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {chapterForm.mangaId && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-zinc-400">
                    <span className="font-medium text-zinc-100">{selectedMangaTitle}</span>
                    <span className="mx-2 text-[#4a2736]">|</span>
                    ทั้งหมด {chapters.length} ตอน
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setChapterForm((p) => ({
                        ...p,
                        chapterNumber: nextChapterNumber,
                        title: `ตอนที่ ${nextChapterNumber}`
                      }));
                      setChapterFiles([]);
                      setShowChapterModal(true);
                    }}
                    className="rounded-full bg-[#ff001e] text-white shadow-[0_0_16px_rgba(255,0,30,0.25)] hover:bg-[#ff1f39]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มตอนใหม่
                  </Button>
                </div>

                <section className="overflow-hidden rounded-2xl border border-[#4a2736] bg-[#130f1d]/95">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="border-b border-[#2f1c2b] bg-[#1a1220]/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-4 py-3 text-zinc-400">ลำดับตอน</th>
                          <th className="px-4 py-3 text-zinc-400">ชื่อตอน</th>
                          <th className="px-4 py-3 text-zinc-400">อัปเดต</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chaptersLoading ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                              กำลังโหลด…
                            </td>
                          </tr>
                        ) : chapters.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                              ยังไม่มีตอน — กด &quot;เพิ่มตอนใหม่&quot; เพื่ออัปโหลดภาพไป Supabase
                            </td>
                          </tr>
                        ) : (
                          chapters.map((c) => (
                            <tr key={c.id} className="border-b border-[#2f1c2b] hover:bg-[#1a1220]/50">
                              <td className="px-4 py-3 font-medium text-red-400">{c.chapter_number}</td>
                              <td className="px-4 py-3 text-zinc-200">{c.title}</td>
                              <td className="px-4 py-3 text-xs text-zinc-500">
                                {new Date(c.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === "site" && (
          <form onSubmit={(e) => void onSaveSiteCopy(e)} className="space-y-6">
            <section className="yaksha-panel rounded-2xl border border-[#4a2736] p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                <Type className="h-4 w-4 text-red-400" />
                หัวเรื่องหน้าแรก
              </h2>
              <p className="mb-4 text-xs text-zinc-500">ข้อความใต้โลโก้ (ด้านบนหน้าแรก)</p>
              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">ชื่อแบรนด์ (ตัวใหญ่)</label>
                  <Input
                    value={siteCopyForm.homeBrandTitle}
                    onChange={(e) => setSiteCopyForm((p) => ({ ...p, homeBrandTitle: e.target.value }))}
                    className="rounded-xl"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">คำบรรทัดรอง (ตัวขาว)</label>
                  <Input
                    value={siteCopyForm.homeTaglinePrimary}
                    onChange={(e) => setSiteCopyForm((p) => ({ ...p, homeTaglinePrimary: e.target.value }))}
                    className="rounded-xl"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">คำอธิบายสั้น (ตัวเทา)</label>
                  <Input
                    value={siteCopyForm.homeTaglineSecondary}
                    onChange={(e) => setSiteCopyForm((p) => ({ ...p, homeTaglineSecondary: e.target.value }))}
                    className="rounded-xl"
                    maxLength={400}
                  />
                </div>
              </div>
            </section>

            <section className="yaksha-panel rounded-2xl border border-[#4a2736] p-5">
              <h2 className="mb-1 text-sm font-semibold text-white">ท้ายหน้าเว็บ</h2>
              <p className="mb-4 text-xs text-zinc-500">ข้อความในฟุตเตอร์</p>
              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">ข้อความเตือน / disclaimer</label>
                  <textarea
                    value={siteCopyForm.footerDisclaimer}
                    onChange={(e) => setSiteCopyForm((p) => ({ ...p, footerDisclaimer: e.target.value }))}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-[#5c3a4a] bg-[#120e18] p-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#ff001e]/90 [color-scheme:dark]"
                    maxLength={2000}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">ลิขสิทธิ์ / บรรทัดท้าย</label>
                  <Input
                    value={siteCopyForm.footerCopyright}
                    onChange={(e) => setSiteCopyForm((p) => ({ ...p, footerCopyright: e.target.value }))}
                    className="rounded-xl"
                    maxLength={400}
                  />
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="rounded-full bg-[#ff001e] px-8 text-white shadow-[0_0_16px_rgba(255,0,30,0.25)] hover:bg-[#ff1f39]"
              >
                บันทึกข้อความลงฐานข้อมูล
              </Button>
            </div>
          </form>
        )}

        {status && (
          <div
            className={cn(
              "fixed bottom-6 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg",
              status.startsWith("กำลัง")
                ? "border-[#4a2736] bg-[#161223] text-zinc-200"
                : "border-[#4a2736] bg-[#130f1d] text-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
            )}
          >
            {status}
          </div>
        )}

        {showChapterModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
            <div className="yaksha-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#4a2736] p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">เพิ่มตอนการ์ตูนใหม่</h3>
                  <p className="mt-1 text-xs text-zinc-500">{selectedMangaTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowChapterModal(false);
                    setChapterFiles([]);
                  }}
                  className="rounded-lg border border-[#4a2736] p-1 text-zinc-400 hover:bg-[#2a1628] hover:text-zinc-200"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 rounded-lg border border-[#4a2736] bg-[#1a1220]/80 px-3 py-2 text-xs text-zinc-300">
                <p>ตอนก่อนหน้า (ล่าสุด): {chapters[0] ? `ตอนที่ ${chapters[0].chapter_number}` : "—"}</p>
                <p>จำนวนตอนทั้งหมด: {chapters.length} ตอน</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">ชื่อตอน *</label>
                  <Input
                    value={chapterForm.title}
                    onChange={(e) => setChapterForm((p) => ({ ...p, title: e.target.value }))}
                    className="rounded-xl"
                    maxLength={200}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-300">เลขตอน *</label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={chapterForm.chapterNumber}
                      onChange={(e) => setChapterForm((p) => ({ ...p, chapterNumber: Number(e.target.value) }))}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">เนื้อหา (ภาพหน้า) *</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setChapterDrag(true);
                    }}
                    onDragLeave={() => setChapterDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setChapterDrag(false);
                      if (e.dataTransfer.files?.length) onChapterFiles(e.dataTransfer.files);
                    }}
                    className={cn(
                      "min-h-[200px] rounded-xl border-2 border-dashed px-3 py-10 text-center transition",
                      chapterDrag ? "border-red-500 bg-[#2a1628]" : "border-[#4a2736] bg-[#1a1220]/80 hover:border-red-500/50"
                    )}
                  >
                    <GripVertical className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
                    <p className="text-sm text-zinc-200">คลิกหรือลากและวางภาพหน้าที่นี่</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      สูงสุด {MAX_CHAPTER_FILES} ไฟล์ · .jpg .jpeg .png .webp · ไฟล์ละไม่เกิน {MAX_PAGE_MB} MB
                    </p>
                    <label className="mt-3 inline-block cursor-pointer rounded-full bg-[#ff001e] px-4 py-2 text-xs font-medium text-white hover:bg-[#ff1f39]">
                      เลือกไฟล์
                      <input
                        type="file"
                        accept={IMG_ACCEPT}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) onChapterFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs font-medium text-red-300">
                      เลือกแล้ว {chapterFiles.length} ไฟล์ (เรียงตามชื่อไฟล์)
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-red-400/90">* การปิดหน้าต่างจะล้างรายการไฟล์ที่ยังไม่บันทึก</p>

                <div className="flex justify-end gap-2 border-t border-[#2f1c2b] pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#4a2736] bg-[#171221] text-zinc-200 hover:bg-[#2a1628]"
                    onClick={() => {
                      setShowChapterModal(false);
                      setChapterFiles([]);
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void onCreateChapter()}
                    className="rounded-full bg-[#ff001e] text-white hover:bg-[#ff1f39]"
                  >
                    บันทึก & อัปโหลดไป Supabase
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
