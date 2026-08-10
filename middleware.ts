import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const COOKIE_NAME = "webgis_session"

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-insecure-secret-change-me-in-production-please"
  return new TextEncoder().encode(secret)
}

async function getSession(req: NextRequest): Promise<{ role?: string; username?: string } | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as any
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await getSession(req)

  // Admin-only areas (UI + API)
  const adminOnly =
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/admin")

  // Any authenticated user required for the rest of /admin
  const needsAuth = pathname.startsWith("/admin")

  if (adminOnly && session?.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!session) {
      const url = new URL("/login", req.url)
      url.searchParams.set("from", pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.redirect(new URL("/admin", req.url))
  }

  if (needsAuth && !session) {
    const url = new URL("/login", req.url)
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/users/:path*", "/api/admin/:path*"],
}
