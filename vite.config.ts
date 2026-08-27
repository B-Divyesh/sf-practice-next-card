import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: { output: { entryFileNames: 'assets/app.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' } }
  },
  server: { port: 4173 },
  preview: { port: 4173 },
});
