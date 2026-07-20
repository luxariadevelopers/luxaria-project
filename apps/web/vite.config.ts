import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget =
  process.env.VITE_PROXY_TARGET ?? 'http://localhost:9000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Vite serves workspace packages from source (dist is CommonJS for Nest).
      '@luxaria/shared-types': path.resolve(
        __dirname,
        '../../packages/shared-types/src/index.ts',
      ),
      '@luxaria/shared-format': path.resolve(
        __dirname,
        '../../packages/shared-format/src/index.ts',
      ),
      '@luxaria/shared-validation': path.resolve(
        __dirname,
        '../../packages/shared-validation/src/index.ts',
      ),
    },
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
});
