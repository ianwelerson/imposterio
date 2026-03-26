import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@imposterio/fetchers", "@imposterio/db", "@imposterio/types"],
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/.prisma/client/**"],
  },
}

export default nextConfig
