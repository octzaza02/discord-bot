/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@discord-bot/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
};

module.exports = nextConfig;
