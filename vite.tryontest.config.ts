// Temporary: dev server that reads catalogue data from the live API (used only for testing the try-on page).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5999', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:5999', changeOrigin: true },
    },
  },
});
