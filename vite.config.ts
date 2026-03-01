import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/train-game/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
