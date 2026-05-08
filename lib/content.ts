import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupaManga = {
  id: string;
  title: string;
  slug: string;
  alt_title: string | null;
  description: string;
  cover_url: string | null;
  categories: string[];
};

type SupaHomeMangaRow = SupaManga & {
  status: string | null;
  created_at: string;
  updated_at?: string | null;
};
type SupaDetailImage = {
  sort_order: number;
  image_url: string;
};

type SupaChapter = {
  id: string;
  chapter_number: number;
  title: string;
  created_at: string;
};

type SupaPage = {
  page_number: number;
  image_url: string;
};

export async function getMangaDetail(slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: manga } = await supabase
    .from("manga")
    .select("id,title,slug,alt_title,description,cover_url,categories")
    .eq("slug", slug)
    .maybeSingle<SupaManga>();
  if (!manga) return null;

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id,chapter_number,title,created_at")
    .eq("manga_id", manga.id)
    .order("chapter_number", { ascending: false });
  const { data: detailImages } = await supabase
    .from("manga_detail_images")
    .select("sort_order,image_url")
    .eq("manga_id", manga.id)
    .order("sort_order", { ascending: true });

  return {
    slug: manga.slug,
    title: manga.title,
    altTitle: manga.alt_title ?? "",
    desc: manga.description,
    cover: manga.cover_url ?? "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80",
    ep: chapters?.length ? `EP.${Math.floor(Number(chapters[0].chapter_number))}` : "EP.0",
    isNew: true,
    tags: manga.categories ?? [],
    detailImages: (detailImages ?? []).map((img: SupaDetailImage) => img.image_url),
    chapters: (chapters ?? []).map((chapter) => ({
      number: Number(chapter.chapter_number),
      title: chapter.title,
      uploadedAt: "อัปโหลดล่าสุด",
      pages: []
    }))
  };
}

export async function getChapterReader(slug: string, chapterNo: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: manga } = await supabase.from("manga").select("id,title,slug").eq("slug", slug).maybeSingle<{ id: string; title: string; slug: string }>();
  if (!manga) return null;

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id,chapter_number,title")
    .eq("manga_id", manga.id)
    .eq("chapter_number", chapterNo)
    .maybeSingle<{ id: string; chapter_number: number; title: string }>();
  if (!chapter) return null;

  const { data: pages } = await supabase
    .from("chapter_pages")
    .select("page_number,image_url")
    .eq("chapter_id", chapter.id)
    .order("page_number", { ascending: true });

  const { data: prev } = await supabase
    .from("chapters")
    .select("chapter_number,title")
    .eq("manga_id", manga.id)
    .lt("chapter_number", chapterNo)
    .order("chapter_number", { ascending: false })
    .limit(1)
    .maybeSingle<SupaChapter>();
  const { data: next } = await supabase
    .from("chapters")
    .select("chapter_number,title")
    .eq("manga_id", manga.id)
    .gt("chapter_number", chapterNo)
    .order("chapter_number", { ascending: true })
    .limit(1)
    .maybeSingle<SupaChapter>();

  return {
    manga: {
      slug: manga.slug,
      title: manga.title
    },
    chapter: {
      number: Number(chapter.chapter_number),
      title: chapter.title,
      pages: (pages ?? []).map((page: SupaPage) => page.image_url)
    },
    prev: prev ? { number: Number(prev.chapter_number), title: prev.title } : null,
    next: next ? { number: Number(next.chapter_number), title: next.title } : null
  };
}

/** ใช้ใน generateStaticParams เท่านั้น — ห้ามใช้ createSupabaseServerClient (cookies ไม่มีใน build) */
export async function getMangaStaticParams() {
  const supabase = createSupabaseAnonClient();
  if (!supabase) return [];
  const { data } = await supabase.from("manga").select("slug");
  if (!data?.length) return [];
  return data.map((item) => ({ slug: item.slug }));
}

export async function getHomeMangaList() {
  let supabase = await createSupabaseServerClient();
  if (!supabase) supabase = createSupabaseAnonClient();
  if (!supabase) return [];

  const fullSelect =
    "id,title,slug,alt_title,description,cover_url,categories,status,created_at,updated_at";
  const legacySelect = "id,title,slug,alt_title,description,cover_url,categories,status,created_at";

  const primary = await supabase
    .from("manga")
    .select(fullSelect)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  let rows: SupaHomeMangaRow[];
  if (primary.error) {
    const fallback = await supabase
      .from("manga")
      .select(legacySelect)
      .order("created_at", { ascending: false })
      .limit(60);
    if (fallback.error || !fallback.data?.length) return [];
    rows = fallback.data as SupaHomeMangaRow[];
  } else if (!primary.data?.length) {
    return [];
  } else {
    rows = primary.data as SupaHomeMangaRow[];
  }
  const mangaIds = rows.map((item) => item.id);
  const { data: chapters } = await supabase
    .from("chapters")
    .select("manga_id,chapter_number")
    .in("manga_id", mangaIds)
    .order("chapter_number", { ascending: false });

  const latestMap = new Map<string, number>();
  (chapters ?? []).forEach((row) => {
    if (!latestMap.has(row.manga_id)) latestMap.set(row.manga_id, Number(row.chapter_number));
  });

  const NEW_DAYS = 14;
  const newThreshold = Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000;

  return rows.map((item) => {
    const created = new Date(item.created_at).getTime();
    const isNew = Number.isFinite(created) && created >= newThreshold;
    return {
      slug: item.slug,
      title: item.title,
      altTitle: item.alt_title ?? "",
      desc: item.description,
      cover: item.cover_url ?? "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80",
      ep: latestMap.has(item.id) ? `EP.${Math.floor(latestMap.get(item.id) ?? 0)}` : "EP.0",
      isNew,
      status: (item.status ?? "ongoing").toLowerCase(),
      createdAt: item.created_at,
      updatedAt: item.updated_at ?? item.created_at,
      tags: item.categories ?? [],
      chapters: []
    };
  });
}
