/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure proper module resolution
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
