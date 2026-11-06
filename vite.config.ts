import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 650,
    rollupOptions: { output: { manualChunks: { three: ['three', 'cannon-es'] } } },
  },
});
