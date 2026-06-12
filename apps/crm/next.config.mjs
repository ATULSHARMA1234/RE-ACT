/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xyflow/react'],
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/landing.html',
      },
    ];
  },
};
export default nextConfig;
