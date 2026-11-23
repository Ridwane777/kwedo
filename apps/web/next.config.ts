import type { NextConfig } from "next";

const API = process.env.KWEDO_API ?? "http://127.0.0.1:3460";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/:path*` }];
  },
};

export default config;
