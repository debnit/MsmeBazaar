import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
)

interface JWTPayload {
  sub: string
  role: string
  exp: number
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/admin', '/profile', '/valuation']
  const adminRoutes = ['/admin']

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Get token from cookie or Authorization header
  const token = request.cookies.get('access_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET) as unknown as { payload: JWTPayload }
    
    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check admin access for admin routes
    const isAdminRoute = adminRoutes.some(route => 
      pathname.startsWith(route)
    )

    if (isAdminRoute && !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // Add user info to headers for the request
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-user-role', payload.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

  } catch (error) {
    console.error('Token verification failed:', error)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}


/*refactored middleware.ts that supports access/refresh tokens and includes role-based route control for USER, ADMIN, SUPER_ADMIN:

✅ Key Features:
Looks for both access_token and refresh_token.

Automatically refreshes token if access token is expired and refresh token is valid.

Performs role-based access control.

Adds x-user-id and x-user-role headers to proxied requests.

🔧 Middleware Code:
ts
Copy
Edit
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
const REFRESH_SECRET = new TextEncoder().encode(process.env.REFRESH_SECRET || 'your-refresh-secret')

interface JWTPayload {
  sub: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  exp: number
}

// Routes
const protectedRoutes = ['/dashboard', '/admin', '/profile', '/valuation']
const adminRoutes = ['/admin']
const superAdminRoutes = ['/admin/super']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  if (!isProtectedRoute) return NextResponse.next()

  // Extract tokens
  const accessToken = request.cookies.get('access_token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  const refreshToken = request.cookies.get('refresh_token')?.value

  let payload: JWTPayload | null = null

  if (accessToken) {
    try {
      const verified = await jwtVerify(accessToken, JWT_SECRET)
      payload = verified.payload as JWTPayload
    } catch {
      // Expired or invalid, try refresh
    }
  }

  // If no valid access token, try refresh
  if (!payload && refreshToken) {
    try {
      const verified = await jwtVerify(refreshToken, REFRESH_SECRET)
      const refreshPayload = verified.payload as JWTPayload

      // Issue new access token (short-lived)
      const newAccessToken = await new SignJWT({
        sub: refreshPayload.sub,
        role: refreshPayload.role,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('15m')
        .sign(JWT_SECRET)

      payload = refreshPayload

      // Attach new access token as a Set-Cookie
      const response = NextResponse.next()
      response.cookies.set('access_token', newAccessToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15, // 15 minutes
      })

      return withUserHeaders(request, response, payload)
    } catch (err) {
      console.error('Refresh token invalid or expired:', err)
    }
  }

  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if access is allowed by role
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  const isSuperAdminRoute = superAdminRoutes.some(route => pathname.startsWith(route))

  if (isSuperAdminRoute && payload.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  if (isAdminRoute && !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return withUserHeaders(request, NextResponse.next(), payload)
}

// Helper to attach headers
function withUserHeaders(request: NextRequest, response: NextResponse, payload: JWTPayload) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.sub)
  requestHeaders.set('x-user-role', payload.role)
  return new NextResponse(response.body, {
    ...response,
    headers: requestHeaders,
  })
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
📝 Notes:
You must issue both access_token and refresh_token from your auth API.

Add REFRESH_SECRET to your .env or .env.production.

Consider separating middleware logic into lib/middleware/auth.ts if growing large.

Make sure token cookies are httpOnly and secure in production.
*/
