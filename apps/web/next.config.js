const path = require("path")

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@imposterio/fetchers", "@imposterio/db", "@imposterio/types"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    outputFileTracingIncludes: {
      "/api/**": ["./node_modules/.prisma/client/**"],
    },
  },
}

module.exports = nextConfig
