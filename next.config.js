/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
}
module.exports = nextConfig
