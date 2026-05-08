"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UserLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("ยังไม่ได้ตั้งค่าเชื่อมต่อ Supabase (NEXT_PUBLIC_SUPABASE_URL และคีย์)");
      return;
    }

    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setLoading(false);
      const msg = loginError.message.toLowerCase();
      if (msg.includes("email not confirmed")) {
        setError("ยังไม่ยืนยันอีเมล — เปิดลิงก์ในกล่องจดหมาย หรือปิดการบังคับยืนยันใน Supabase (Authentication → Providers → Email)");
        return;
      }
      setError(loginError.message);
      return;
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      setError("เข้าสู่ระบบไม่สำเร็จ (ไม่พบเซสชัน) ลองรีเฟรชหน้าแล้วลองใหม่");
      return;
    }

    setLoading(false);
    window.location.href = "/";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <section className="w-full rounded-2xl border border-[#4a2736] bg-[#140f1e]/95 p-5">
        <h1 className="yaksha-logo mb-1 text-2xl">YAKSHA</h1>
        <p className="mb-5 text-sm text-zinc-300">เข้าสู่ระบบ (ผู้อ่าน)</p>

        <form onSubmit={onLogin} className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="อีเมล"
            className="bg-[#1a1220] text-zinc-100 placeholder:text-zinc-500"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน"
            className="bg-[#1a1220] text-zinc-100 placeholder:text-zinc-500"
            required
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full bg-[#ff001e] text-white hover:bg-[#ff1f39]" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-500">ขณะนี้ปิดรับสมัครสมาชิกใหม่ทางเว็บ</p>
        <p className="mt-3 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-400">
            กลับหน้าแรก
          </Link>
        </p>
      </section>
    </main>
  );
}
