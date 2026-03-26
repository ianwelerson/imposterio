const path = require("path")

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@imposterio/fetchers", "@imposterio/db", "@imposterio/types"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
}

module.exports = nextConfig
