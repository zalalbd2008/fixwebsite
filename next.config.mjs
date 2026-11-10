/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress URLs end with a slash: keep every URL exactly the same.
  trailingSlash: true,
  // Images are already optimised (WebP) and keep their original /wp-content/uploads URLs.
  images: { unoptimized: true },
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingIncludes: { '/**': ['./content/**/*'] },
  async headers() {
    return [
      { source: '/wp-content/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/_styles/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};
export default nextConfig;
