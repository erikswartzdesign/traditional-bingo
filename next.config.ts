import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/play",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
