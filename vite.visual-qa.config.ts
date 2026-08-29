import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  appType: 'mpa',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      sonner: path.resolve(rootDir, 'src/shims/sonner.tsx'),
      'react-helmet-async': path.resolve(rootDir, 'src/shims/react-helmet-async.tsx'),
      'design_system/Button': path.resolve(rootDir, 'src/components/moduleFederation/fallback/Button.tsx'),
      'design_system/Modal': path.resolve(rootDir, 'src/components/moduleFederation/fallback/Modal.tsx'),
      'design_system/ThemeProvider': path.resolve(rootDir, 'src/components/moduleFederation/fallback/ThemeProvider.tsx'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('test'),
    'global.process.env.NODE_ENV': JSON.stringify('test'),
    'globalThis.process.env.NODE_ENV': JSON.stringify('test'),
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'react-markdown',
      'remark-gfm',
      'style-to-js',
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5182,
    strictPort: true,
  },
});
