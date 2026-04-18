import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Allows importing @repo/types directly from source
  transpilePackages: ['@repo/types'],
  // Required for Docker standalone output
  output: 'standalone',
};

export default withNextIntl(nextConfig);
