import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  const isLoginPage = pathname.startsWith("/admin/login");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    const localCookie = request.cookies.get("yaksha_local_admin")?.value === "1";
    if (isLoginPage) return NextResponse.next();
    if (localCookie) return NextResponse.next();

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const response = NextResponse.next({
      request: {
        headers: request.headers
      }
    });

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    });

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session && !isLoginPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      return NextResponse.redirect(redirectUrl);
    }

    let isAdmin = false;
    if (session) {
      const { data: adminRole } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle<{ role: string }>();
      isAdmin = adminRole?.role === "admin";
    }

    if (isLoginPage) {
      if (session && isAdmin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin";
        return NextResponse.redirect(redirectUrl);
      }
      return response;
    }

    if (session && !isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      redirectUrl.searchParams.set("error", "not_admin");
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch {
    // If Supabase session check fails, allow login page access.
    if (isLoginPage) return NextResponse.next();

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*"]
};
