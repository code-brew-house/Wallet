import type { NextConfig } from 'next';

const workspaceRoot = process.cwd().endsWith('/apps/web')
  ? process.cwd().slice(0, -'/apps/web'.length)
  : process.cwd();

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
