import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL: This ensures assets use relative paths (e.g. "./asset.js") 
  // instead of absolute paths ("/asset.js").
  // This allows the app to run in a WebView, Electron, Python, or just by opening index.html.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true
  }
});