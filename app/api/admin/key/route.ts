import { NextResponse } from "next/server";
import { verifyAccessKey, setAdminCookie } from "@/lib/auth";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Exchange the shared access key for an admin session.
 *
 * A Server Component cannot set cookies, so /admin?k=… forwards here; this
 * handler mints the same signed session the password login issues and then
 * redirects to a clean /admin URL, keeping the key out of the address bar,
 * browser history and any screenshot taken afterwards.
 */
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("k");
  const target = new URL("/admin", request.url);

  if (!verifyAccessKey(key)) {
    return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
  }

  await setAdminCookie(config.adminUsername);
  return NextResponse.redirect(target, { status: 303 });
}
