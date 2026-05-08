import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_SITE_COPY, parseSiteCopyRows, type SiteCopy } from "@/lib/site-copy";

export type { SiteCopy } from "@/lib/site-copy";

export async function getSiteCopy(): Promise<SiteCopy> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return DEFAULT_SITE_COPY;

  const { data } = await supabase.from("site_settings").select("key,value");
  return parseSiteCopyRows(data as { key: string; value: string }[] | null);
}
