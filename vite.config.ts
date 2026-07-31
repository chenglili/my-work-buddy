import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: '甜心学习工作台',
        short_name: '学习工作台',
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
            src: 'app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
});
