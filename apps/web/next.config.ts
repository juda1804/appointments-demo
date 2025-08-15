import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let Next.js handle environment variables automatically
  // NEXT_PUBLIC_ variables are automatically available on the client
  // Server-only variables remain secure
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: true,
    },
  }),
};

export default nextConfig;
