import type { NextConfig } from "next"

const isDesktopBuild = process.env.BUILD_TARGET === "electron"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isDesktopBuild ? "standalone" : undefined
}

export default nextConfig
