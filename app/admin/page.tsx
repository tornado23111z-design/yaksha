import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import AdminDashboardClient from "@/components/admin/admin-dashboard-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const cookieStore = await cookies();
    const localAdmin = cookieStore.get("yaksha_local_admin")?.value === "1";
    if (!localAdmin) redirect("/admin/login");
    return <AdminDashboardClient />;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) redirect("/admin/login");
  const { data: adminRole } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle<{ role: string }>();
  if (adminRole?.role !== "admin") redirect("/admin/login?error=not_admin");

  return <AdminDashboardClient />;
}
