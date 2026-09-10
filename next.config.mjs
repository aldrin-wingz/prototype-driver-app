/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // The dev overlay button sits bottom-left, over the message composer and the
  // Home tab. This study's deliverable is screenshots, so it has to go.
  devIndicators: false,
};

export default nextConfig;
