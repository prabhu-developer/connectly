/* eslint-disable no-undef, turbo/no-undeclared-env-vars */
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const rawTarget =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000/api";
    const apiTarget = rawTarget.endsWith("/api")
      ? rawTarget
      : `${rawTarget.replace(/\/+$/, "")}/api`;

    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
