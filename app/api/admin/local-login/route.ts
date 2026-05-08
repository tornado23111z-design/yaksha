import { NextResponse } from "next/server";

const COOKIE_NAME = "yaksha_local_admin";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const expectedEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@yaksha.local";
  const expectedPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || "HlSgkqaVO4OOI2YG";

  if (email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
