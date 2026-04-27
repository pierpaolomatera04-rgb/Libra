import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Resolve auth state in modo robusto:
  // - getUser() valida il JWT con una chiamata di rete e refresha i cookie scaduti
  // - su Safari iOS / mobile con ITP, network instabile o cold start, può fallire
  //   silenziosamente e restituire null anche per utenti loggati
  // - in quel caso facciamo fallback su getSession() che legge solo dal cookie locale
  //   (no rete) per evitare redirect spuri al login
  let user: { id: string } | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      user = data.user
    }
  } catch {
    // ignore: gestito sotto
  }
  if (!user) {
    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user) {
        user = data.session.user
      }
    } catch {
      // se fallisce anche getSession l'utente è davvero non autenticato
    }
  }

  // Proteggi le rotte autenticate
  const protectedRoutes = ['/dashboard', '/pubblica', '/libreria', '/wallet', '/profilo', '/impostazioni', '/onboarding']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    // Conserva la destinazione originale così dopo il login l'utente torna dove voleva andare
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect utenti autenticati lontano da login/signup
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/browse', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
