/**
 * Next.js Middleware
 * 
 * Handles database initialization on first request.
 * Database initialization is non-blocking and won't fail requests.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ensureDatabaseInitialized } from "@/lib/db/init-server";

// Track if initialization has been started
let initStarted = false;
let initPromise: Promise<boolean> | null = null;

export async function middleware(request: NextRequest) {
  // Only initialize once, and only on server-side
  if (!initStarted && typeof window === "undefined") {
    initStarted = true;
    // Fire and forget - don't block requests
    initPromise = ensureDatabaseInitialized().catch((error) => {
      console.error("[Middleware] Database initialization error:", error);
      return false;
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/db).*)",
  ],
};

