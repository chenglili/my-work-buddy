import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase') || id.includes('/node_modules/idb/')) return 'cloud';
          if (id.includes('/node_modules/react') || id.includes('/node_modules/scheduler/')) return 'react';
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'app-icon-180.png', 'app-icon-192.png', 'app-icon-512.png'],
      manifest: {
        name: '甜心工作台',
        short_name: '甜心工作台',
        description: '适合一升二年级女孩的每日学习、运动与积分工作台',
        lang: 'zh-CN',
        theme_color: '#f88fb5',
        background_color: '#fff2f7',
        display: 'standalone',
        orientation: 'any',
        id: './',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        globIgnores: ['pets/sun-conure-cutout-v*.png']
      }
    })
  ]
});
