import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiProxyTarget =
  process.env.VITE_PROXY_TARGET ?? 'http://localhost:9000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Trailing slash so `@` does not swallow `@luxaria/*` package imports.
      {
        find: '@/',
        replacement: `${path.resolve(__dirname, './src')}/`,
      },
      // Vite serves workspace packages from source (dist is CommonJS for Nest).
      {
        find: '@luxaria/shared-types',
        replacement: path.resolve(
          __dirname,
          '../../packages/shared-types/src/index.ts',
        ),
      },
      {
        find: '@luxaria/shared-format',
        replacement: path.resolve(
          __dirname,
          '../../packages/shared-format/src/index.ts',
        ),
      },
      {
        find: '@luxaria/shared-validation',
        replacement: path.resolve(
          __dirname,
          '../../packages/shared-validation/src/index.ts',
        ),
      },
    ],
  },
  optimizeDeps: {
    exclude: [
      '@luxaria/shared-types',
      '@luxaria/shared-format',
      '@luxaria/shared-validation',
    ],
  },

  server: {
    host: true,
    port: 9001,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 9001,
    strictPort: true,
  },
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
