/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xyflow/react'],
  experimental: {
    instrumentationHook: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
