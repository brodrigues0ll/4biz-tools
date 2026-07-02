/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["mongoose", "node-cron"],
};

export default nextConfig;
