"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Grid3x3,
  LayoutList,
  Library,
  MoonStar,
  Search,
  UserRound,
  X
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_SITE_COPY, type SiteCopy } from "@/lib/site-copy";

const filters = ["ทั้งหมด", "มังฮวา", "มังงะ", "นิยาย", "Rate-R", "จบแล้ว", "รายการของฉัน"];
const sortOptions = ["เรียงตามปกติ", "ชื่อ ก-ฮ", "ใหม่ล่าสุด", "ตอนมากสุด"];
function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#4a2736] bg-[#120d18] p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-md border border-[#4a2736] p-1 text-zinc-300 hover:bg-[#2b1624]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type HomeManga = {
  slug: string;
  title: string;
  altTitle: string;
  desc: string;
  cover: string;
  ep: string;
  isNew: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  chapters: { number: number }[];
};

const COMPLETED_STATUSES = new Set(["completed", "ended", "finished", "complete", "จบแล้ว"]);

function isCompletedManga(item: HomeManga): boolean {
  if (item.tags.some((tag) => tag.includes("จบแล้ว"))) return true;
  const st = (item.status ?? "ongoing").toLowerCase().trim();
  return COMPLETED_STATUSES.has(st);
}

type SessionBanner = { email: string; isAdmin: boolean } | null;

export default function HomePageClient({
  initialManga,
  siteCopy = DEFAULT_SITE_COPY
}: {
  initialManga: HomeManga[];
  siteCopy?: SiteCopy;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sessionUser, setSessionUser] = useState<SessionBanner>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
  const [activeSort, setActiveSort] = useState("เรียงตามปกติ");
  const [listView, setListView] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const headerStats = useMemo(() => {
    const total = initialManga.length;
    const newCount = initialManga.filter((x) => x.isNew).length;
    const finished = initialManga.filter((x) => isCompletedManga(x)).length;
    const airing = Math.max(0, total - finished);
    return { total, newCount, finished, airing };
  }, [initialManga]);

  const filteredManga = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = initialManga.filter((item) => (q ? `${item.title} ${item.altTitle} ${item.desc}`.toLowerCase().includes(q) : true));
    if (activeFilter !== "ทั้งหมด") {
      if (activeFilter === "จบแล้ว") {
        base = base.filter((item) => isCompletedManga(item));
      } else {
        base = base.filter((item) => item.tags.some((tag) => tag.includes(activeFilter)));
      }
    }
    if (activeSort === "ชื่อ ก-ฮ") base = [...base].sort((a, b) => a.title.localeCompare(b.title, "th"));
    if (activeSort === "ใหม่ล่าสุด") {
      base = [...base].sort((a, b) => {
        const ub = new Date(b.updatedAt).getTime();
        const ua = new Date(a.updatedAt).getTime();
        if (Number.isFinite(ub) && Number.isFinite(ua) && ub !== ua) return ub - ua;
        const tb = new Date(b.createdAt).getTime();
        const ta = new Date(a.createdAt).getTime();
        if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
        return Number(b.isNew) - Number(a.isNew);
      });
    }
    if (activeSort === "ตอนมากสุด") base = [...base].sort((a, b) => b.chapters.length - a.chapters.length);
    return base;
  }, [activeFilter, activeSort, initialManga, search]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    async function syncSession() {
      const {
        data: { session }
      } = await client.auth.getSession();
      if (!session?.user) {
        setSessionUser(null);
        return;
      }
      const { data: adminRow } = await client
        .from("admin_users")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle<{ role: string }>();
      setSessionUser({
        email: session.user.email ?? "บัญชีผู้ใช้",
        isAdmin: adminRow?.role === "admin"
      });
    }

    void syncSession();
    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(() => {
      void syncSession();
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSessionUser(null);
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-4">
      <header className="mb-8">
        <div className="mb-6 flex items-center justify-between gap-2 border-b border-[#2f1c2b] pb-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 rounded-full border border-[#4a2736] bg-[#191425]/90 p-0 text-zinc-300 font-medium">
            <MoonStar className="h-4 w-4" />
          </Button>
          {sessionUser ? (
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className="hidden min-w-0 items-center gap-1.5 text-xs text-zinc-400 sm:inline-flex" title={sessionUser.email}>
                <UserRound className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <span className="truncate">{sessionUser.email}</span>
              </span>
              {sessionUser.isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin")}
                  className="h-8 shrink-0 rounded-full border-[#4a2736] bg-[#171221] px-3 text-xs text-zinc-200"
                >
                  แอดมิน
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleLogout()}
                className="h-8 shrink-0 rounded-full border-[#4a2736] bg-[#171221] px-3 text-xs text-zinc-200"
              >
                ออกจากระบบ
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/login")}
              className="h-8 rounded-full border-[#4a2736] bg-[#171221] px-4 text-zinc-200 font-medium"
            >
              เข้าสู่ระบบ
            </Button>
          )}
        </div>

        <div className="text-center">
          <h1 className="yaksha-logo text-5xl">{siteCopy.homeBrandTitle}</h1>
          <p className="mt-1 text-sm font-semibold text-zinc-300">{siteCopy.homeTaglinePrimary}</p>
          <p className="mt-1 text-xs font-light text-zinc-500">{siteCopy.homeTaglineSecondary}</p>

          <div className="mt-5 flex items-center justify-center gap-4 text-[11px] font-light text-zinc-400">
            <span>• ทั้งหมด {headerStats.total} เรื่อง</span>
            <span>• {headerStats.newCount} ใหม่</span>
            <span>• {headerStats.finished} จบแล้ว</span>
            <span>• {headerStats.airing} กำลังฉาย</span>
          </div>
        </div>
      </header>

      <section className="mb-5">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาเรื่อง (ไทย/อังกฤษ/เกาหลี)..." className="h-10 pl-11 font-light" />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setActiveFilter(item)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs transition",
                activeFilter === item
                  ? "border-[#ff001e] bg-[#ff001e] text-white shadow-[0_0_14px_rgba(255,0,30,0.35)]"
                  : "border-[#3a2638] bg-[#191425]/90 text-zinc-300 hover:bg-[#2a1628]"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <Button onClick={() => setListView(false)} variant="ghost" size="sm" className={cn("rounded-md border text-white", !listView ? "border-[#ff001e] bg-[#ff001e] shadow-[0_0_16px_rgba(255,0,30,0.35)]" : "border-[#3a2638] bg-[#191425]/90")}>
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button onClick={() => setListView(true)} variant="ghost" size="sm" className={cn("rounded-md border", listView ? "border-[#ff001e] bg-[#ff001e] text-white shadow-[0_0_16px_rgba(255,0,30,0.35)]" : "border-[#3a2638] bg-[#191425]/90 text-zinc-300")}>
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#3a2638] bg-[#120f20]/90 px-2 py-1.5">
          <div className="flex items-center gap-2">
            {sortOptions.map((sort) => (
              <button
                key={sort}
                onClick={() => setActiveSort(sort)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[10px] leading-none",
                  activeSort === sort ? "border-[#7b3047] bg-[#381828] text-zinc-100" : "border-[#3a2638] bg-[#191425] text-zinc-400"
                )}
              >
                {sort}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center rounded-md border border-[#3a2638] bg-[#191425]/90 px-2.5 py-1 text-[10px] text-zinc-300">
            เรียงตาม <ChevronDown className="ml-1 h-3 w-3" />
          </button>
        </div>
      </section>

      <section className="mb-7 mt-5 border-t border-[#2f1c2b] pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center text-sm font-semibold text-white">
            <Library className="mr-2 h-3.5 w-3.5 text-red-400" />
            ทุกเรื่อง
          </h2>
        </div>

        <div className={cn("gap-3", listView ? "grid grid-cols-1" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
          {filteredManga.map((item) => (
            <Link key={item.slug} href={`/manga/${item.slug}`} className={cn("group block", listView && "rounded-xl border border-[#4a2736] bg-[#161223] p-2")}>
              <div className={cn("relative overflow-hidden rounded-xl border border-[#4a2736] bg-[#161223] shadow-glow", listView ? "w-24" : "")}>
                <Image src={item.cover} alt={item.title} width={500} height={760} className="aspect-[3/4] h-auto w-full object-cover transition duration-300 group-hover:scale-105" />
                <Badge className="absolute right-2 top-2">{item.ep}</Badge>
                {item.isNew && <Badge variant="secondary" className="absolute left-2 top-2">ใหม่</Badge>}
              </div>
              <h3 className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-zinc-100">{item.title}</h3>
              <p className="mt-1 line-clamp-2 text-[10px] font-light leading-4 text-zinc-400">{item.desc}</p>
            </Link>
          ))}
        </div>
        {!filteredManga.length && (
          <div className="rounded-xl border border-[#4a2736] bg-[#161223] px-4 py-8 text-center text-sm text-zinc-400">
            ไม่พบเรื่องที่ค้นหา
          </div>
        )}
      </section>

      <footer className="border-t border-[#2f1c2b] pt-8 text-center">
        <p className="mx-auto mb-1 max-w-2xl text-[11px] font-light text-zinc-500">{siteCopy.footerDisclaimer}</p>
        <p className="text-xs font-light text-zinc-500">{siteCopy.footerCopyright}</p>
      </footer>

      <Modal open={showLoginModal} title="เข้าสู่ระบบ" onClose={() => setShowLoginModal(false)}>
        <p className="mb-4 text-sm text-zinc-300">เข้าสู่ระบบเพื่อติดตามเรื่อง แสดงความคิดเห็น และรับแจ้งเตือน</p>
        <div className="space-y-2">
          <Button className="w-full bg-[#ff001e] text-white hover:bg-[#ff1f39]">เข้าด้วย Google</Button>
          <Button className="w-full bg-[#2a406f] text-white hover:bg-[#38579b]">เข้าด้วย Facebook</Button>
          <p className="pt-2 text-center text-xs text-zinc-500">หรือ</p>
          <Button variant="outline" className="w-full border-[#4a2736] text-zinc-200" onClick={() => router.push("/login")}>
            เข้าด้วยอีเมล
          </Button>
        </div>
      </Modal>
    </main>
  );
}
