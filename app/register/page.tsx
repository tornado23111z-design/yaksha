import Link from "next/link";

import { Button } from "@/components/ui/button";

/** ปิดรับสมัครสมาชิกผู้อ่านทางเว็บ — บัญชีใหม่สร้างได้เฉพาะทางแอดมิน/ฐานข้อมูลตามนโยบายเว็บ */
export default function RegisterClosedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <section className="w-full rounded-2xl border border-[#4a2736] bg-[#140f1e]/95 p-5 text-center">
        <h1 className="yaksha-logo mb-1 text-2xl">YAKSHA</h1>
        <p className="mb-2 text-sm font-medium text-zinc-200">ปิดรับสมัครสมาชิก</p>
        <p className="mb-6 text-xs font-light leading-relaxed text-zinc-400">
          ขณะนี้เว็บไม่เปิดให้สมัครสมาชิกใหม่ทางหน้าเว็บ หากมีบัญชีอยู่แล้วสามารถเข้าสู่ระบบได้ตามปกติ
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full bg-[#ff001e] text-white hover:bg-[#ff1f39]">
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-[#4a2736] text-zinc-200">
            <Link href="/">กลับหน้าแรก</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
