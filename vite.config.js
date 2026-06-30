import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Production-grade build config:
// - Manual chunk splitting so vendor code (firebase, chart.js, react) is cached
//   separately from app code that changes often.
// - esbuild minification for both JS and CSS (fast, no extra deps).
// - PWA plugin gives the app an offline-capable service worker + installable
//   shell, which combined with Firestore's own IndexedDB persistence means
//   the ERP keeps working (read-only) even with a flaky shop Wi-Fi connection.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Sakthi Electricals ERP',
        short_name: 'Sakthi ERP',
        description: 'Premium ERP for electrical retail businesses',
        theme_color: '#0A2540',
        background_color: '#F8FAFC',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Cache the JS/CSS app shell; never cache Firestore/Auth network calls
        // (Firestore has its own offline persistence layer — see firebase/db.js).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/__/]
      }
    })
  ],
  build: {
    target: 'es2019',
    cssMinify: true,
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/analytics'
          ],
          'vendor-charts': ['chart.js', 'react-chartjs-2']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: false
  }
});
