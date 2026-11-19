import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// base './' zodat de site werkt onder https://<user>.github.io/SponsorLoop/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800, // recharts is groot; prima voor deze app
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stream: resolve(__dirname, 'stream.html'),
      },
    },
  },
});
