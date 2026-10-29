import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // 1. Get the current user session
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 2. Public routes that don't require login
  if (path === '/login' || path === '/pending-verification' || path === '/') {
    return response
  }

  // 3. If not logged in, immediately redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. Fetch the user's role and verification status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, verification_status')
    .eq('id', user.id)
    .single()

  // 5. Block unverified users from accessing anything except pending page
  if (profile?.verification_status !== 'verified' && profile?.role !== 'admin') {
    if (path !== '/pending-verification') {
      return NextResponse.redirect(new URL('/pending-verification', request.url))
    }
    return response
  }

  // 6. ROLE-BASED ACCESS CONTROL (The Fix)
  // Prevent Teachers/Owners from accessing /admin
  if (path.startsWith('/admin') && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Prevent Admins from accessing Teacher/Owner dashboards
  if (profile?.role === 'admin' && (path.startsWith('/dashboard') || path.startsWith('/owner'))) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Prevent Teachers from accessing Owner pages
  if (profile?.role === 'teacher' && path.startsWith('/owner')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Prevent Owners from accessing Teacher pages
  if (profile?.role === 'owner' && path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/owner', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}