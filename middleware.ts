import { NextResponse, type NextRequest } from 'next/server'

// Auth is enforced in each page/layout via supabase.auth.getUser() + redirect('/login').
// Middleware is kept minimal to avoid Edge runtime incompatibilities with @supabase/ssr.
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
