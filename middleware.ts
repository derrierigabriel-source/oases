import { NextResponse, type NextRequest } from 'next/server'

// Auth is handled client-side in AppLayout via useAuth hook.
// This middleware only handles the login redirect for already-authenticated users.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
