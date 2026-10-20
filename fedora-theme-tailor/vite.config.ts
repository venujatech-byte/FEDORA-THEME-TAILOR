import { defineConfig } from 'vite';
import tauri from '@tauri-apps/cli/vite';

export default defineConfig({
  plugins: [tauri()],
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