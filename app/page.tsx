import HomePageClient from "@/components/home-page-client";
import { getHomeMangaList } from "@/lib/content";
import { getSiteCopy } from "@/lib/site-settings";

export default async function HomePage() {
  const [manga, siteCopy] = await Promise.all([getHomeMangaList(), getSiteCopy()]);
  return <HomePageClient initialManga={manga} siteCopy={siteCopy} />;
}
