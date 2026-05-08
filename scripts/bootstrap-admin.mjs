import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@yaksha.local";
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "HlSgkqaVO4OOI2YG";

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error("Failed listing users:", listError.message);
  process.exit(1);
}

const existing = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
let adminUserId = existing?.id ?? null;

if (!existing) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin" }
  });
  if (error) {
    console.error("Failed creating admin user:", error.message);
    process.exit(1);
  }
  adminUserId = data.user?.id ?? null;
  console.log("Admin user created:", data.user?.email);
} else {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    user_metadata: { ...(existing.user_metadata || {}), role: "admin" }
  });
  if (error) {
    console.error("Failed updating admin user:", error.message);
    process.exit(1);
  }
  adminUserId = existing.id;
  console.log("Admin user updated:", existing.email);
}

if (!adminUserId) {
  console.error("Admin user ID missing");
  process.exit(1);
}

const { error: roleError } = await supabase.from("admin_users").upsert(
  {
    user_id: adminUserId,
    email,
    role: "admin"
  },
  { onConflict: "user_id" }
);
if (roleError) {
  console.error("Failed assigning admin role in admin_users:", roleError.message);
  process.exit(1);
}
console.log("Admin role mapped in public.admin_users");

console.log("Login credentials:");
console.log(`email: ${email}`);
console.log(`password: ${password}`);
