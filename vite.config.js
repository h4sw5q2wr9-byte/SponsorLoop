import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
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
