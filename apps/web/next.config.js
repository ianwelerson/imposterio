const path = require("path")

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@imposterio/fetchers", "@imposterio/db", "@imposterio/types"],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    outputFileTracingIncludes: {
      "/api/**": ["./node_modules/.prisma/client/**"],
    },
  },
}

module.exports = nextConfig
