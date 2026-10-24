import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app deploys don't invalidate cached libraries
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'scheduler'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
        },
      },
    },
    // Enable build optimizations
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  }
});
