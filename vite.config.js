import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// Sicherheits-Header aus der nginx-Config übernehmen (eine Quelle), damit Tests mit `vite preview`
// dieselbe Content-Security-Policy sehen wie die Live-Seite.
const nginx = readFileSync(new URL('./deploy/nginx-container.conf', import.meta.url), 'utf8');
const header = (name) => (nginx.match(new RegExp(`add_header\\s+${name}\\s+"([^"]+)"`)) || [])[1];
const securityHeaders = Object.fromEntries(['Content-Security-Policy', 'Permissions-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy']
  .map((h) => [h, header(h)]).filter(([, v]) => v));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'impressum.html', 'datenschutz.html'],
      manifest: {
        name: 'BIOGLOW Forest', short_name: 'Forest',
        description: 'Prüfbare Feldnachweise für zertifizierte Wälder',
        lang: 'de', start_url: '/', scope: '/', display: 'standalone',
        background_color: '#f6f8f4', theme_color: '#2f7d4a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/impressum/, /^\/datenschutz/],
        runtimeCaching: [{
          urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
          handler: 'CacheFirst',
          options: { cacheName: 'osm-tiles', expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 } },
        }],
      },
    }),
  ],
  preview: { headers: securityHeaders },
  build: { chunkSizeWarningLimit: 800 },
  test: { environment: 'node', include: ['src/test/**/*.test.js'] },
});
