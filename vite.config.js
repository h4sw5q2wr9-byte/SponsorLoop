import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

// base './' zodat de site werkt onder https://<user>.github.io/SponsorLoop/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Oudere browsers (bijv. de ingebouwde browser van Samsung-tv's) krijgen
    // een omgezette versie met polyfills, zodat de site daar ook werkt.
    legacy({
      targets: ['defaults', 'chrome >= 49', 'safari >= 10', 'samsung >= 5'],
      modernTargets: ['chrome >= 64', 'edge >= 79', 'safari >= 12', 'firefox >= 67'],
      modernPolyfills: true,
    }),
    // Offline: de site wordt na het eerste bezoek bewaard en werkt daarna ook zonder internet.
    // Een nieuwe versie wordt op de achtergrond opgehaald en is actief bij de volgende keer openen
    // (geen onverwacht herladen tijdens het tellen of de onthulling).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['icons/*.png', 'icons/icon.svg', 'startup-check.js', 'compat.js'],
      manifest: {
        name: 'Sponsorloop Tracker',
        short_name: 'Sponsorloop',
        description: 'Rondjes tellen tijdens de sponsorloop, met live stand en onthulling.',
        lang: 'nl',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#2563eb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        globIgnores: ['**/docs/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // stream.html?code=ABCDE moet ook offline de stream-pagina openen
        ignoreURLParametersMatching: [/.*/],
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Lettertype (Inter) van Google Fonts bewaren
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          // Firebase (Live Sync) wordt bewust NIET bewaard: altijd live.
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 900, // recharts is groot; prima voor deze app
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stream: resolve(__dirname, 'stream.html'),
      },
    },
  },
});
