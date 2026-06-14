/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xyflow/react'],
  experimental: {
    instrumentationHook: true,
  },
};
export default nextConfig;
