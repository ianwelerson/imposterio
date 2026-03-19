/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@imposterio/fetchers", "@imposterio/db", "@imposterio/types"],
}

module.exports = nextConfig
