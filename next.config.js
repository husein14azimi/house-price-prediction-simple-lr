/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GH_PAGES === 'true';

const nextConfig = {
  output: 'export',
  basePath: isGithubActions ? '/house-price-prediction-simple-lr' : '',
  assetPrefix: isGithubActions ? '/house-price-prediction-simple-lr/' : '',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
