import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING_URL',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'MISSING_KEY',
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data, error } = await supabase.auth.getSession()

    return NextResponse.json({
      ok: true,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      sessionError: error?.message ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
