export { auth as proxy } from '@/auth'

export const config = {
  matcher: ['/dashboard', '/analytics', '/api/expenses/:path*'],
}
