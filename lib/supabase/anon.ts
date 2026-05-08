import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** อ่านข้อมูลสาธารณะด้วย anon key — ใช้ใน generateStaticParams (ห้ามใช้ cookies) */
export function createSupabaseAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
