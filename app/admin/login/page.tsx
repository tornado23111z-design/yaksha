"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(true);
      const res = await fetch("/api/admin/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json()) as { error?: string };
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/admin");
      router.refresh();
      return;
    }

    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <section className="w-full rounded-2xl border border-[#4a2736] bg-[#140f1e]/95 p-5">
        <h1 className="yaksha-logo mb-1 text-2xl">YAKSHA</h1>
        <p className="mb-5 text-sm text-zinc-300">Admin</p>

        <form onSubmit={onLogin} className="space-y-3">
          {searchParams.get("error") === "not_admin" && (
            <p className="text-xs text-red-400">บัญชีนี้ไม่มีสิทธิ์ Admin</p>
          )}
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@email.com"
            className="rounded-xl"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-xl"
            required
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full bg-[#ff001e] text-white hover:bg-[#ff1f39]" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
          <section className="w-full rounded-2xl border border-[#4a2736] bg-[#140f1e]/95 p-8 text-center text-sm text-zinc-400">
            กำลังโหลด…
          </section>
        </main>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
