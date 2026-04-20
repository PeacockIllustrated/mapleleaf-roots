/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Konva needs to be externalized on the server side — it touches `window`
  // and will crash SSR if imported directly into a server component.
  // All Konva usage must be wrapped in `dynamic(() => import(...), { ssr: false })`.
  serverExternalPackages: ['konva'],

  // Image optimisation domains. Add the Supabase Storage domain (once known)
  // and the Open Food Facts image CDN for product thumbnails.
  images: {
    remotePatterns: [
      // Supabase Storage (fill in the project ref on first deploy)
      // {
      //   protocol: 'https',
      //   hostname: '<project-ref>.supabase.co',
      //   pathname: '/storage/v1/object/public/**',
      // },
      {
        protocol: 'https',
        hostname: 'images.openfoodfacts.org',
        pathname: '/**',
      },
    ],
  },

  // Security headers — basic hardening. Content Security Policy is
  // intentionally deferred until we know which external origins we rely on.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // Logged-out users at root get redirected to /login by middleware.
  // This redirect is only a fallback when middleware is disabled.
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
