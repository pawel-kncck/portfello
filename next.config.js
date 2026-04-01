/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/adapter-pg', 'pg', 'bcryptjs'],
}

export default nextConfig
