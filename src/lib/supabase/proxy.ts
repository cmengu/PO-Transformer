import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from './config'
import { securityHeaders } from '@/lib/security/headers'

const publicPaths = new Set(['/login'])

export async function updateSession(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDevelopment = process.env.NODE_ENV === 'development'
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  const applySecurityHeaders = (response: NextResponse): NextResponse => {
    for (const [key, value] of Object.entries(securityHeaders(nonce, isDevelopment))) {
      response.headers.set(key, value)
    }
    return response
  }
  let response = applySecurityHeaders(NextResponse.next({
    request: { headers: requestHeaders },
  }))
  const { url, publishableKey } = getSupabaseConfig()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = applySecurityHeaders(NextResponse.next({
          request: { headers: requestHeaders },
        }))
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Keep this directly after createServerClient so refreshed cookies stay in
  // sync with the server-rendered access check.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!user && !publicPaths.has(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    return applySecurityHeaders(NextResponse.redirect(loginUrl))
  }

  if (user && pathname === '/login') {
    const appUrl = request.nextUrl.clone()
    appUrl.pathname = '/'
    appUrl.search = ''
    return applySecurityHeaders(NextResponse.redirect(appUrl))
  }

  return response
}
