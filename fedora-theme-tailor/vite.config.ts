import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: true,
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
});