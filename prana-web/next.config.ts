import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
  ],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }, { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, { protocol: 'https', hostname: 'avatar.vercel.sh' }],
  },
  allowedDevOrigins: ['prana.test', 'marketplace.prana.test'],
};

export default nextConfig;
